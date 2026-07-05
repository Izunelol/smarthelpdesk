import { AttendancesService } from './attendances.service';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';

describe('AttendancesService', () => {
  let service: AttendancesService;
  let repository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  const ticket = { id: 'ticket-1' } as Ticket;
  const responsible = { id: 'user-1' } as User;

  beforeEach(() => {
    repository = {
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'attendance-1', ...v })),
      find: jest.fn(),
    };
    service = new AttendancesService(repository as any);
  });

  describe('record', () => {
    it('creates an immutable attendance entry with a startedAt timestamp', async () => {
      await service.record({
        ticket,
        responsible,
        level: 1,
        description: 'Chamado aberto',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket,
          responsible,
          level: 1,
          description: 'Chamado aberto',
          startedAt: expect.any(Date),
          endedAt: undefined,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('records an explicit endedAt when provided', async () => {
      const endedAt = new Date('2026-01-01T00:00:00Z');

      await service.record({
        ticket,
        responsible,
        level: 2,
        description: 'Escalado',
        endedAt,
      });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ endedAt }));
    });
  });

  describe('findByTicket', () => {
    it('queries attendances ordered by startedAt ascending', async () => {
      repository.find.mockResolvedValue([]);

      await service.findByTicket('ticket-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { ticket: { id: 'ticket-1' } },
        relations: { responsible: true },
        order: { startedAt: 'ASC' },
      });
    });
  });
});
