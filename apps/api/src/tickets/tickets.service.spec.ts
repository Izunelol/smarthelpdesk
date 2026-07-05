import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { ChatMessageSender } from './chat-message.entity';
import { UserRole } from '../users/user.entity';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    title: 'Título',
    description: 'Descrição',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    level: 1,
    createdAt: new Date(),
    closedAt: undefined,
    requester: { id: 'requester-1', email: 'requester@example.com' } as any,
    category: { id: 'cat-1', name: 'outros' } as any,
    attendances: [],
    rating: null as any,
    chatMessages: [],
    ...overrides,
  };
}

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepository: { update: jest.Mock; find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let chatMessagesRepository: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let attendancesService: { record: jest.Mock };
  let notificationsService: Record<string, jest.Mock>;
  let usersService: { findById: jest.Mock; findByRole: jest.Mock };
  let ratingsService: { create: jest.Mock };
  let categoriesService: { findById: jest.Mock; findOrCreateByName: jest.Mock };
  let knowledgeBaseService: { search: jest.Mock };
  let aiService: { classify: jest.Mock; chat: jest.Mock };

  const staffUser: JwtPayload = { userId: 'tech-1', email: 'tech@example.com', role: UserRole.TECHNICIAN };
  const requesterUser: JwtPayload = { userId: 'requester-1', email: 'requester@example.com', role: UserRole.USER };

  beforeEach(() => {
    ticketsRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };
    chatMessagesRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'message-1', createdAt: new Date(), ...v })),
    };
    attendancesService = { record: jest.fn().mockResolvedValue(undefined) };
    notificationsService = {
      notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
      notifyTicketEscalated: jest.fn().mockResolvedValue(undefined),
      notifyQueueWaiting: jest.fn().mockResolvedValue(undefined),
      notifyStatusChanged: jest.fn().mockResolvedValue(undefined),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'tech-1', email: 'tech@example.com' }),
      findByRole: jest.fn().mockResolvedValue([]),
    };
    ratingsService = { create: jest.fn().mockResolvedValue({ id: 'rating-1' }) };
    categoriesService = {
      findById: jest.fn(),
      findOrCreateByName: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'outros' }),
    };
    knowledgeBaseService = { search: jest.fn().mockResolvedValue([]) };
    aiService = {
      classify: jest.fn().mockResolvedValue({ category: 'outros', priority: 'MEDIUM', confidence: 0 }),
      chat: jest.fn().mockResolvedValue({ reply: 'Vamos tentar resolver.', resolved: false }),
    };

    service = new TicketsService(
      ticketsRepository as any,
      chatMessagesRepository as any,
      categoriesService as any,
      usersService as any,
      attendancesService as any,
      ratingsService as any,
      notificationsService as any,
      knowledgeBaseService as any,
      aiService as any,
    );

    jest.spyOn(service, 'findById').mockImplementation(async () => buildTicket());
  });

  describe('escalate', () => {
    it('bumps the level and sets status to ESCALATED via update() (not save on a stale entity)', async () => {
      const ticket = buildTicket({ level: 1, status: TicketStatus.OPEN });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await service.escalate('ticket-1', { reason: 'chatbot não resolveu' }, requesterUser);

      expect(ticketsRepository.update).toHaveBeenCalledWith('ticket-1', {
        level: 2,
        status: TicketStatus.ESCALATED,
      });
      expect(ticketsRepository.save).not.toHaveBeenCalled();
      expect(attendancesService.record).toHaveBeenCalledWith(
        expect.objectContaining({ level: 1, description: expect.stringContaining('nível 2') }),
      );
    });

    it('rejects escalation past level 3', async () => {
      const ticket = buildTicket({ level: 3 });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.escalate('ticket-1', { reason: 'motivo válido' }, staffUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects escalation of a finished ticket', async () => {
      const ticket = buildTicket({ level: 1, status: TicketStatus.RESOLVED });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.escalate('ticket-1', { reason: 'motivo válido' }, requesterUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects escalation by a user without permission for the current level', async () => {
      const ticket = buildTicket({ level: 2, status: TicketStatus.IN_PROGRESS });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      const otherRequester: JwtPayload = {
        userId: 'someone-else',
        email: 'x@example.com',
        role: UserRole.USER,
      };

      await expect(
        service.escalate('ticket-1', { reason: 'motivo válido' }, otherRequester),
      ).rejects.toThrow(ForbiddenException);
    });

    it('notifies management when no professional is available at the next level', async () => {
      const ticket = buildTicket({ level: 1, status: TicketStatus.OPEN });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);
      usersService.findByRole.mockImplementation((role: UserRole) =>
        Promise.resolve(role === UserRole.MANAGER ? [{ id: 'mgr-1', email: 'mgr@example.com' }] : []),
      );

      await service.escalate('ticket-1', { reason: 'motivo válido' }, requesterUser);

      expect(notificationsService.notifyQueueWaiting).toHaveBeenCalledWith(
        'mgr@example.com',
        'ticket-1',
        2,
      );
    });
  });

  describe('updateStatus', () => {
    it('allows OPEN -> IN_PROGRESS', async () => {
      const ticket = buildTicket({ status: TicketStatus.OPEN });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await service.updateStatus('ticket-1', { status: TicketStatus.IN_PROGRESS }, staffUser);

      expect(ticketsRepository.update).toHaveBeenCalledWith('ticket-1', {
        status: TicketStatus.IN_PROGRESS,
      });
    });

    it('rejects an invalid transition (CLOSED has no outgoing transitions)', async () => {
      const ticket = buildTicket({ status: TicketStatus.CLOSED });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.updateStatus('ticket-1', { status: TicketStatus.OPEN }, staffUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets closedAt when transitioning to CLOSED', async () => {
      const ticket = buildTicket({ status: TicketStatus.RESOLVED });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await service.updateStatus('ticket-1', { status: TicketStatus.CLOSED }, staffUser);

      expect(ticketsRepository.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({ status: TicketStatus.CLOSED, closedAt: expect.any(Date) }),
      );
    });

    it('rejects a status update by a user without permission for the current level', async () => {
      const ticket = buildTicket({ level: 2, status: TicketStatus.ESCALATED });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.updateStatus('ticket-1', { status: TicketStatus.IN_PROGRESS }, requesterUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rate', () => {
    it('creates the rating and closes the ticket via update(), never re-saving the stale loaded entity', async () => {
      const ticket = buildTicket({ status: TicketStatus.RESOLVED, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await service.rate('ticket-1', { score: 5, comment: 'Ótimo' }, requesterUser);

      expect(ratingsService.create).toHaveBeenCalledWith(ticket, { score: 5, comment: 'Ótimo' });
      expect(ticketsRepository.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({ status: TicketStatus.CLOSED, closedAt: expect.any(Date) }),
      );
      // Regression guard: saving the stale entity (with relations loaded before the
      // rating existed) would null out the just-created rating's FK. See tickets.service.ts.
      expect(ticketsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects rating from someone other than the requester', async () => {
      const ticket = buildTicket({ status: TicketStatus.RESOLVED, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.rate('ticket-1', { score: 5 }, staffUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects rating a ticket that is not RESOLVED', async () => {
      const ticket = buildTicket({
        status: TicketStatus.OPEN,
        requester: { id: 'requester-1' } as any,
      });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(
        service.rate('ticket-1', { score: 5 }, requesterUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByIdForUser', () => {
    it('allows the requester to view their own ticket', async () => {
      const ticket = buildTicket({ requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(service.findByIdForUser('ticket-1', requesterUser)).resolves.toBe(ticket);
    });

    it('rejects a USER trying to view someone else\'s ticket', async () => {
      const ticket = buildTicket({ requester: { id: 'someone-else' } as any });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(service.findByIdForUser('ticket-1', requesterUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows staff roles to view any ticket', async () => {
      const ticket = buildTicket({ requester: { id: 'someone-else' } as any });
      jest.spyOn(service, 'findById').mockResolvedValue(ticket);

      await expect(service.findByIdForUser('ticket-1', staffUser)).resolves.toBe(ticket);
    });
  });

  describe('create', () => {
    it('uses the AI-suggested category and priority when none is provided', async () => {
      aiService.classify.mockResolvedValue({ category: 'hardware', priority: 'HIGH', confidence: 0.8 });
      const requester = { id: 'requester-1', email: 'requester@example.com' } as any;

      await service.create({ title: 'Título válido', description: 'Descrição válida' }, requester);

      expect(categoriesService.findOrCreateByName).toHaveBeenCalledWith(
        'hardware',
        expect.stringContaining('0.8'),
      );
      expect(ticketsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'HIGH', level: 1, status: TicketStatus.OPEN }),
      );
    });

    it('lets the caller override category, but priority always comes from the AI classification', async () => {
      categoriesService.findById.mockResolvedValue({ id: 'cat-explicit', name: 'rede' });
      aiService.classify.mockResolvedValue({ category: 'rede', priority: 'CRITICAL', confidence: 0.8 });
      const requester = { id: 'requester-1', email: 'requester@example.com' } as any;

      await service.create(
        {
          title: 'Título válido',
          description: 'Descrição válida',
          categoryId: 'cat-explicit',
        },
        requester,
      );

      expect(categoriesService.findOrCreateByName).not.toHaveBeenCalled();
      expect(ticketsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: TicketPriority.CRITICAL }),
      );
    });

    it('seeds the chat with the user description and an initial AI reply', async () => {
      const requester = { id: 'requester-1', email: 'requester@example.com' } as any;

      await service.create({ title: 'Título válido', description: 'Descrição válida' }, requester);

      expect(chatMessagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sender: ChatMessageSender.USER, content: 'Descrição válida' }),
      );
      expect(aiService.chat).toHaveBeenCalledWith(
        'Descrição válida',
        [{ role: 'user', content: 'Descrição válida' }],
        [],
      );
      expect(chatMessagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sender: ChatMessageSender.AI, content: 'Vamos tentar resolver.' }),
      );
    });
  });

  describe('sendChatMessage', () => {
    it('rejects messages from anyone other than the requester', async () => {
      const ticket = buildTicket({ level: 1, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      await expect(
        service.sendChatMessage('ticket-1', { content: 'oi' }, staffUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the requester to message the assigned technician once escalated to level 2, without asking the AI', async () => {
      const ticket = buildTicket({ level: 2, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      const result = await service.sendChatMessage(
        'ticket-1',
        { content: 'Segue mais detalhes' },
        requesterUser,
      );

      expect(chatMessagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sender: ChatMessageSender.USER, content: 'Segue mais detalhes' }),
      );
      expect(aiService.chat).not.toHaveBeenCalled();
      expect(result.messages).toHaveLength(1);
    });

    it('allows the assigned technician to reply on a level 2 ticket', async () => {
      const ticket = buildTicket({ level: 2, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      const result = await service.sendChatMessage(
        'ticket-1',
        { content: 'Pode reiniciar o notebook?' },
        staffUser,
      );

      expect(chatMessagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: ChatMessageSender.STAFF,
          content: 'Pode reiniciar o notebook?',
        }),
      );
      expect(result.messages).toHaveLength(1);
    });

    it('rejects messages from staff whose role does not match the ticket level', async () => {
      const ticket = buildTicket({ level: 3, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      await expect(
        service.sendChatMessage('ticket-1', { content: 'oi' }, staffUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects messages on a finished ticket', async () => {
      const ticket = buildTicket({
        level: 1,
        status: TicketStatus.RESOLVED,
        requester: { id: 'requester-1' } as any,
      });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      await expect(
        service.sendChatMessage('ticket-1', { content: 'oi' }, requesterUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores the user message, asks the AI, and stores the AI reply', async () => {
      const ticket = buildTicket({ level: 1, requester: { id: 'requester-1' } as any });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);

      const result = await service.sendChatMessage(
        'ticket-1',
        { content: 'Ainda não funcionou' },
        requesterUser,
      );

      expect(chatMessagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sender: ChatMessageSender.USER, content: 'Ainda não funcionou' }),
      );
      expect(aiService.chat).toHaveBeenCalled();
      expect(result.messages).toHaveLength(2);
      expect(ticketsRepository.update).not.toHaveBeenCalled();
    });

    it('marks the ticket as RESOLVED when the chatbot resolves the issue', async () => {
      const ticket = buildTicket({
        level: 1,
        requester: { id: 'requester-1', email: 'requester@example.com' } as any,
      });
      jest.spyOn(service, 'findByIdForUser').mockResolvedValue(ticket);
      aiService.chat.mockResolvedValue({ reply: 'Resolvido!', resolved: true });

      await service.sendChatMessage('ticket-1', { content: 'Funcionou, obrigado' }, requesterUser);

      expect(ticketsRepository.update).toHaveBeenCalledWith('ticket-1', {
        status: TicketStatus.RESOLVED,
      });
      expect(attendancesService.record).toHaveBeenCalledWith(
        expect.objectContaining({ description: expect.stringContaining('chatbot') }),
      );
      expect(notificationsService.notifyStatusChanged).toHaveBeenCalledWith(
        'requester@example.com',
        'ticket-1',
        'Título',
        TicketStatus.RESOLVED,
      );
    });
  });
});
