# SmartHelpDesk — Guia do Projeto (Claude Code)

> Contexto de projeto para o Claude Code. Leia este arquivo antes de gerar ou alterar código.
> O objetivo é implementar o **SmartHelpDesk**, uma plataforma web de atendimento (helpdesk)
> estruturada em **três níveis** de suporte, com recursos de **IA usando a API do Google Gemini**.

---

## 1. Visão geral

O SmartHelpDesk centraliza as solicitações de suporte de TI de uma instituição em uma única
plataforma, substituindo controles manuais por e-mail, telefone e mensageria. O atendimento é
escalonado em três níveis:

- **Nível 1 — Chatbot (IA):** tenta resolver automaticamente com base na base de conhecimento.
- **Nível 2 — Técnico:** atende chamados de complexidade intermediária.
- **Nível 3 — Especialista:** resolve chamados críticos/complexos.

Um chamado sobe de nível apenas quando o nível atual não consegue resolvê-lo.

## 2. Stack tecnológica

| Camada        | Tecnologia                                   |
|---------------|----------------------------------------------|
| Linguagem     | **TypeScript** (back-end e front-end)        |
| Back-end      | **NestJS** (Node.js) + **TypeORM**           |
| Front-end     | **React** + **Vite**                         |
| Banco         | **PostgreSQL**                               |
| IA            | **Google Gemini API** (`@google/genai`)      |
| Autenticação  | JWT                                          |
| Infra         | **Docker** + `docker-compose`                |
| Testes        | Jest + Supertest (API), Cypress (E2E)        |

> **Restrição fixa:** a stack é **TypeScript + PostgreSQL**. Não introduzir outra linguagem
> de back-end nem outro banco relacional.

## 3. Estrutura de pastas (monorepo)

```
smarthelpdesk/
├── apps/
│   ├── api/                 # Back-end NestJS
│   │   └── src/
│   │       ├── auth/        # login, JWT, guards
│   │       ├── users/       # cadastro e perfis
│   │       ├── tickets/     # chamados + escalonamento
│   │       ├── attendances/ # atendimentos (histórico/auditoria)
│   │       ├── categories/
│   │       ├── ratings/     # avaliações
│   │       ├── knowledge-base/
│   │       ├── reports/     # dashboard e indicadores
│   │       ├── notifications/ # e-mail (SMTP)
│   │       ├── ai/          # integração com o Gemini
│   │       └── main.ts
│   └── web/                 # Front-end React (Vite)
│       └── src/{pages,components,services,hooks}
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

## 4. Setup e execução

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env      # preencha as variáveis (inclui GEMINI_API_KEY)
docker compose up --build # sobe api, web e postgres
```

### Variáveis de ambiente (`.env.example`)

```env
# Banco
DATABASE_URL=postgresql://helpdesk:helpdesk@db:5432/smarthelpdesk

# Auth
JWT_SECRET=troque-este-valor
JWT_EXPIRES_IN=1d

# IA — Google Gemini (obter a chave em https://aistudio.google.com)
GEMINI_API_KEY=coloque-sua-chave-aqui
GEMINI_MODEL=gemini-2.5-flash

# E-mail (notificações)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

> A `GEMINI_API_KEY` é **secreta**: use apenas no back-end, nunca no front-end, e **nunca**
> faça commit dela. Mantenha `.env` no `.gitignore`.

## 5. Modelo de dados

Entidades principais (mapear com TypeORM):

- **User** — `id`, `name`, `email`, `passwordHash`, `role`, `createdAt`.
  `role ∈ { USER, TECHNICIAN, SPECIALIST, MANAGER, ADMIN }`.
- **Ticket** — `id`, `title`, `description`, `status`, `priority`, `level`,
  `createdAt`, `closedAt`, `requester (FK User)`, `category (FK Category)`.
- **Category** — `id`, `name`, `description`.
- **Attendance** — `id`, `description`, `startedAt`, `endedAt`, `level`,
  `ticket (FK)`, `responsible (FK User)`. Registra cada interação (histórico/auditoria).
- **Rating** — `id`, `score`, `comment`, `createdAt`, `ticket (FK, 1:1)`.
- **KnowledgeArticle** — `id`, `title`, `content`, `keywords`, `updatedAt`.

Relacionamentos: User 1:N Ticket · Ticket N:1 Category · Ticket 1:N Attendance ·
User 1:N Attendance · Ticket 1:1 Rating · Attendance N:N KnowledgeArticle.

### Enums de negócio

- `status`: `OPEN` → `IN_PROGRESS` → `ESCALATED` → `RESOLVED` → `CLOSED`.
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `level`: `1` (chatbot), `2` (técnico), `3` (especialista).

## 6. Regras de negócio

1. **Abrir chamado** exige usuário autenticado; ao criar, chamar a IA para sugerir
   `category` e `priority` (o usuário pode ajustar). Status inicial `OPEN`, `level = 1`.
2. **Nível 1 (chatbot)** tenta resolver com a base de conhecimento; se resolver, `RESOLVED`.
3. **Escalonamento** só sobe um nível por vez (1→2→3), registra o motivo e um `Attendance`,
   muda status para `ESCALATED` e notifica o novo responsável e o usuário.
4. **Fila:** se não houver profissional disponível no nível, o chamado aguarda em fila e a
   gestão é notificada.
5. **Fechamento:** após `RESOLVED`, o usuário registra uma `Rating`; então `CLOSED`.
6. **Auditoria:** toda mudança de status/nível gera um registro imutável em `Attendance`.
7. **Notificações por e-mail** a cada mudança relevante de status.

## 7. API REST (endpoints principais)

| Método | Rota                          | Descrição                                   |
|--------|-------------------------------|---------------------------------------------|
| POST   | `/auth/login`                 | autentica e retorna JWT                     |
| POST   | `/users`                      | cadastra usuário                            |
| POST   | `/tickets`                    | abre chamado (classificação por IA)         |
| GET    | `/tickets/:id`                | consulta chamado + histórico                |
| GET    | `/tickets?status=&level=`     | lista/filtra chamados                       |
| PATCH  | `/tickets/:id/escalate`       | escala ao próximo nível                     |
| PATCH  | `/tickets/:id/status`         | atualiza status                             |
| POST   | `/tickets/:id/rating`         | registra avaliação                          |
| GET    | `/ai/suggestions/:id`         | sugestões de solução (IA)                   |
| GET    | `/reports/dashboard`          | indicadores gerenciais                      |
| GET    | `/reports/forecast`           | previsão de demanda (IA/estatística)        |
| GET    | `/reports/bottlenecks`        | gargalos por etapa/nível                    |
| GET/POST/PUT | `/knowledge`            | base de conhecimento                        |

Padrões do back-end: cada módulo tem `controller` (rotas), `service` (regras) e
`repository` (TypeORM). Usar DTOs validados (`class-validator`) e `guards` de perfil (JWT).

## 8. Integração com IA (Google Gemini)

**SDK oficial:** `@google/genai` (o pacote antigo `@google/generative-ai` está descontinuado).

```bash
npm i @google/genai --workspace apps/api
```

Toda chamada ao Gemini fica **isolada no módulo `ai/`** e é feita **apenas no back-end**,
lendo a chave de `process.env.GEMINI_API_KEY`. Os demais módulos dependem de `AiService`,
nunca do SDK diretamente.

### 8.1 Serviço base

```typescript
// apps/api/src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface Classification {
  category: 'acesso' | 'hardware' | 'software' | 'rede' | 'outros';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0..1
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  private readonly model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  // RF15 — classificação automática de categoria e prioridade
  async classify(title: string, description: string): Promise<Classification> {
    const prompt =
      `Você é um triador de chamados de TI. Classifique o chamado.\n` +
      `Título: ${title}\nDescrição: ${description}\n` +
      `Responda SOMENTE JSON: {"category":"acesso|hardware|software|rede|outros",` +
      `"priority":"LOW|MEDIUM|HIGH|CRITICAL","confidence":0..1}`;

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      return JSON.parse(res.text ?? '{}') as Classification;
    } catch (err) {
      this.logger.warn(`Classificação por IA falhou, usando fallback: ${err}`);
      return { category: 'outros', priority: 'MEDIUM', confidence: 0 }; // triagem manual
    }
  }

  // RF16 — sugestão de soluções (RAG simples sobre a base de conhecimento)
  async suggestSolutions(
    description: string,
    articles: { title: string; content: string }[],
  ): Promise<string[]> {
    const context = articles
      .map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`)
      .join('\n\n');
    const prompt =
      `Com base APENAS nos artigos abaixo, sugira até 3 soluções objetivas.\n` +
      `Problema: ${description}\n\nArtigos:\n${context}\n\n` +
      `Responda como lista JSON de strings.`;
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(res.text ?? '[]') as string[];
  }
}
```

### 8.2 Os quatro recursos de IA

- **RF15 — Classificação automática:** chamado em `POST /tickets` passa por `classify()`.
  Se `confidence` for baixa, cair para triagem manual (não bloquear a abertura).
- **RF16 — Sugestão de soluções:** recuperar artigos candidatos da base de conhecimento
  (full-text search do PostgreSQL — `tsvector`; opcionalmente `pgvector` + embeddings do
  Gemini) e passar para `suggestSolutions()` gerar as sugestões ao chatbot/técnico.
- **RF17 — Previsão de demanda:** agregar histórico (contagem por categoria/período) no
  PostgreSQL; a projeção pode ser estatística e o Gemini usado apenas para gerar um resumo
  em linguagem natural dos insights no dashboard.
- **RF18 — Identificação de gargalos:** calcular tempo médio por etapa/nível a partir de
  `Attendance`; o Gemini pode redigir a explicação dos gargalos encontrados.

### 8.3 Boas práticas com o Gemini

- Use **JSON estruturado** (`responseMimeType: 'application/json'`, e `responseSchema`
  quando disponível) para respostas fáceis de parsear.
- Sempre trate falha/timeout da API com **fallback** (ver risco na documentação do projeto).
- Torne o modelo configurável via `GEMINI_MODEL`. Padrão sugerido: `gemini-2.5-flash`
  (há modelos mais novos, ex.: `gemini-3.5-flash`; confirme o disponível na sua conta).
- **Confirme a sintaxe atual** do SDK e os nomes de modelo na documentação oficial antes de
  implementar — o SDK evolui rápido:
  - Docs: https://ai.google.dev/gemini-api/docs
  - SDK: https://www.npmjs.com/package/@google/genai
  - Chave de API: https://aistudio.google.com

## 9. Front-end (React)

- Telas: login/cadastro, abrir chamado, chat (nível 1), "Meus chamados" (status/histórico),
  fila do técnico/especialista, base de conhecimento, dashboard gerencial.
- Camada `services/` consome a API via `fetch`/`axios` com o token JWT no cabeçalho.
- **Nunca** chamar o Gemini a partir do front-end — sempre via API do back-end.

## 10. Testes

- **Unitários (Jest):** regras dos `services` (validação, escalonamento, parsing da IA).
- **Integração (Jest + Supertest):** rotas contra um PostgreSQL de teste.
- **E2E (Cypress):** fluxo completo — abrir → chatbot → escalar → resolver → avaliar.
- Nos testes, **mockar `AiService`** para não depender da API externa.

Casos mínimos: login válido/ inválido, abertura de chamado válido/ inválido, escalonamento
1→2→3, classificação por IA (com mock), fluxo completo E2E.

## 11. Ordem de implementação sugerida

1. Base do projeto: monorepo, Docker, PostgreSQL, `.env`, entidades TypeORM + migrations.
2. Auth (JWT) + Users + perfis/guards.
3. Categories + Tickets (CRUD, status, escalonamento) + Attendances (auditoria).
4. Notifications (e-mail) + Ratings + Knowledge Base.
5. Módulo `ai/` (Gemini): classificação e sugestões; integrar em `POST /tickets`.
6. Reports (dashboard, forecast, bottlenecks) + Front-end React.
7. Testes (unitários, integração, E2E) + documentação final.

## 12. Convenções

- TypeScript `strict`; ESLint + Prettier.
- Nomes em inglês no código; mensagens ao usuário e conteúdo em português.
- Commits: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`…).
- Segredos só em variáveis de ambiente; nada de chave no repositório.
