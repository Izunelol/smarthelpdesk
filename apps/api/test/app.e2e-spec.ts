import { Test } from '@nestjs/testing';
import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/user.entity';

const aiServiceMock: Partial<AiService> = {
  classify: jest.fn().mockResolvedValue({
    category: 'software',
    priority: 'MEDIUM',
    confidence: 0.9,
  }),
  suggestSolutions: jest.fn().mockResolvedValue(['Reinicie o serviço', 'Atualize o driver']),
  summarizeInsights: jest.fn().mockResolvedValue('Resumo simulado dos indicadores.'),
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(
  app: INestApplication,
  role?: UserRole,
): Promise<{ token: string; userId: string; email: string }> {
  const email = uniqueEmail('user');
  const createRes = await request(app.getHttpServer())
    .post('/users')
    .send({ name: 'Test User', email, password: 'senha12345' })
    .expect(201);

  const userId = createRes.body.id as string;

  if (role) {
    const usersService = app.get(UsersService);
    await usersService.updateRole(userId, role);
  }

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'senha12345' })
    .expect(200);

  return { token: loginRes.body.accessToken as string, userId, email };
}

describe('SmartHelpDesk API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(aiServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('registers a user and returns it without the password hash', async () => {
      const email = uniqueEmail('signup');
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Fulano', email, password: 'senha12345' })
        .expect(201);

      expect(res.body).toMatchObject({ name: 'Fulano', email, role: UserRole.USER });
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('rejects duplicate e-mail registration', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Original', email, password: 'senha12345' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Outro', email, password: 'senha12345' })
        .expect(409);
    });

    it('logs in with valid credentials', async () => {
      const email = uniqueEmail('login-ok');
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Login OK', email, password: 'senha12345' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'senha12345' })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects login with invalid credentials', async () => {
      const email = uniqueEmail('login-bad');
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Login Bad', email, password: 'senha12345' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'senha-errada' })
        .expect(401);
    });

    it('returns the authenticated user profile on /users/me', async () => {
      const { token, email } = await registerAndLogin(app);

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(email);
    });

    it('rejects /users/me without a token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('Tickets', () => {
    it('rejects opening a ticket with an invalid payload', async () => {
      const { token } = await registerAndLogin(app);

      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'ab', description: 'curta' })
        .expect(400);
    });

    it('opens a ticket, classifying it via the (mocked) AI service', async () => {
      const { token } = await registerAndLogin(app);

      const res = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Impressora não funciona',
          description: 'A impressora do setor financeiro não liga desde ontem.',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        status: 'OPEN',
        level: 1,
        priority: 'MEDIUM',
      });
      expect(res.body.category?.name).toBe('software');
      expect(aiServiceMock.classify).toHaveBeenCalledWith(
        'Impressora não funciona',
        'A impressora do setor financeiro não liga desde ontem.',
      );
    });

    it('rejects viewing another user ticket', async () => {
      const owner = await registerAndLogin(app);
      const stranger = await registerAndLogin(app);

      const createRes = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          title: 'Sem acesso ao sistema',
          description: 'Não consigo acessar o sistema financeiro desde hoje cedo.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/tickets/${createRes.body.id}`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(403);
    });

    it('returns 404 for a non-existent ticket', async () => {
      const { token } = await registerAndLogin(app);

      await request(app.getHttpServer())
        .get('/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Escalation flow 1 -> 2 -> 3 -> resolve -> rate', () => {
    it('escalates a ticket through all levels and closes it after rating', async () => {
      const requester = await registerAndLogin(app);
      const technician = await registerAndLogin(app, UserRole.TECHNICIAN);
      const specialist = await registerAndLogin(app, UserRole.SPECIALIST);

      const createRes = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${requester.token}`)
        .send({
          title: 'Falha crítica no servidor de arquivos',
          description: 'O servidor de arquivos está inacessível para toda a equipe.',
        })
        .expect(201);

      const ticketId = createRes.body.id as string;
      expect(createRes.body.level).toBe(1);

      const escalateToLevel2 = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/escalate`)
        .set('Authorization', `Bearer ${requester.token}`)
        .send({ reason: 'Chatbot não conseguiu resolver o problema.' })
        .expect(200);
      expect(escalateToLevel2.body.level).toBe(2);
      expect(escalateToLevel2.body.status).toBe('ESCALATED');

      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/escalate`)
        .set('Authorization', `Bearer ${requester.token}`)
        .send({ reason: 'Tentativa indevida por quem não é responsável pelo nível 2.' })
        .expect(403);

      const escalateToLevel3 = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/escalate`)
        .set('Authorization', `Bearer ${technician.token}`)
        .send({ reason: 'Requer intervenção de um especialista de infraestrutura.' })
        .expect(200);
      expect(escalateToLevel3.body.level).toBe(3);

      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/escalate`)
        .set('Authorization', `Bearer ${specialist.token}`)
        .send({ reason: 'Não deveria ser possível escalar além do nível 3.' })
        .expect(400);

      const resolvedRes = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${specialist.token}`)
        .send({ status: 'RESOLVED' })
        .expect(200);
      expect(resolvedRes.body.status).toBe('RESOLVED');

      const ratedRes = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rating`)
        .set('Authorization', `Bearer ${requester.token}`)
        .send({ score: 5, comment: 'Atendimento excelente.' })
        .expect(201);
      expect(ratedRes.body.status).toBe('CLOSED');

      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rating`)
        .set('Authorization', `Bearer ${requester.token}`)
        .send({ score: 4 })
        .expect(400);

      const detailRes = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${requester.token}`)
        .expect(200);
      expect(detailRes.body.attendances.length).toBeGreaterThanOrEqual(4);
      expect(detailRes.body.rating?.score).toBe(5);
    });
  });

  describe('Reports', () => {
    it('rejects dashboard access for a regular user', async () => {
      const { token } = await registerAndLogin(app);

      await request(app.getHttpServer())
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows dashboard access for a manager', async () => {
      const manager = await registerAndLogin(app, UserRole.MANAGER);

      await request(app.getHttpServer())
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);
    });
  });
});
