const API_URL = Cypress.env('API_URL') ?? 'http://localhost:3000';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function registerViaApi(email: string, name: string): void {
  cy.request('POST', `${API_URL}/users`, { name, email, password: 'senha12345' });
}

function loginViaUi(email: string, password = 'senha12345'): void {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', 'Entrar').click();
  cy.url().should('include', '/tickets');
}

function logout(): void {
  cy.contains('button', 'Sair').click();
  cy.url().should('include', '/login');
}

describe('Fluxo completo do chamado: abrir -> chatbot -> escalar -> resolver -> avaliar', () => {
  const requesterEmail = uniqueEmail('requester');
  const technicianEmail = uniqueEmail('technician');
  let ticketUrl: string;

  before(() => {
    registerViaApi(requesterEmail, 'Usuário Solicitante');
    registerViaApi(technicianEmail, 'Técnico Nível 2');
    cy.task('promoteUser', { email: technicianEmail, role: 'TECHNICIAN' });
  });

  it('abre um chamado como usuário e recebe classificação automática', () => {
    loginViaUi(requesterEmail);

    cy.contains('a', 'Abrir chamado').click();
    cy.url().should('include', '/tickets/new');

    cy.get('input').first().type('Não consigo acessar a VPN corporativa');
    cy.get('textarea').type(
      'Desde ontem à tarde não consigo mais conectar na VPN da empresa pelo notebook.',
    );
    cy.contains('button', 'Abrir chamado').click();

    // A criação do chamado aciona a classificação por IA (rede real/indisponível em teste),
    // que tem fallback no back-end — pode levar alguns segundos até resolver.
    cy.url({ timeout: 20000 }).should('match', /\/tickets\/[0-9a-f-]{36}$/);
    cy.location('pathname').then((pathname) => {
      ticketUrl = pathname;
    });
    cy.contains('h1', 'Não consigo acessar a VPN corporativa');
    cy.contains('Nível 1');
  });

  it('consulta o chatbot (nível 1) em busca de sugestões da base de conhecimento', () => {
    cy.contains('button', 'Consultar sugestões da IA').click();
    cy.contains('Nenhuma sugestão encontrada na base de conhecimento.', { timeout: 10000 });
  });

  it('escala o chamado para o nível 2', () => {
    cy.get('.ticket-actions input').type('Chatbot não resolveu o problema de VPN.');
    cy.contains('button', 'Escalar para o próximo nível').click();
    cy.contains('Nível 2');
    cy.contains('ESCALATED');
  });

  it('o técnico do nível 2 resolve o chamado', () => {
    logout();
    loginViaUi(technicianEmail);

    cy.visit(ticketUrl);
    cy.contains('button', 'Marcar como resolvido').click();
    cy.contains('RESOLVED');

    logout();
  });

  it('o solicitante avalia o atendimento e o chamado é encerrado', () => {
    loginViaUi(requesterEmail);
    cy.visit(ticketUrl);

    cy.contains('h2', 'Avaliar atendimento');
    cy.get('.rating-box input[type="number"]').clear().type('5');
    cy.get('.rating-box textarea').type('Atendimento rápido e eficiente.');
    cy.contains('button', 'Enviar avaliação').click();

    cy.contains('CLOSED');
    cy.contains('h2', 'Avaliação registrada');
    cy.contains('Nota: 5/5');
  });
});
