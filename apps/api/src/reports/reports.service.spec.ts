import { ReportsService } from './reports.service';
import { TicketStatus } from '../tickets/ticket.entity';

function buildQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    addSelect: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    addGroupBy: jest.fn(),
    orderBy: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };
  for (const key of ['select', 'addSelect', 'leftJoin', 'where', 'groupBy', 'addGroupBy', 'orderBy']) {
    builder[key].mockReturnValue(builder);
  }
  return builder;
}

describe('ReportsService', () => {
  let service: ReportsService;
  let ticketsRepository: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let attendancesRepository: { createQueryBuilder: jest.Mock };
  let ratingsRepository: { createQueryBuilder: jest.Mock };
  let aiService: { summarizeInsights: jest.Mock };
  let ticketsQueryBuilder: ReturnType<typeof buildQueryBuilder>;
  let attendancesQueryBuilder: ReturnType<typeof buildQueryBuilder>;
  let ratingsQueryBuilder: ReturnType<typeof buildQueryBuilder>;

  beforeEach(() => {
    ticketsQueryBuilder = buildQueryBuilder();
    attendancesQueryBuilder = buildQueryBuilder();
    ratingsQueryBuilder = buildQueryBuilder();

    ticketsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(ticketsQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };
    attendancesRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(attendancesQueryBuilder),
    };
    ratingsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(ratingsQueryBuilder),
    };
    aiService = { summarizeInsights: jest.fn().mockResolvedValue('resumo gerado pela IA') };

    service = new ReportsService(
      ticketsRepository as any,
      attendancesRepository as any,
      ratingsRepository as any,
      aiService as any,
    );
  });

  describe('dashboard', () => {
    it('aggregates counts and averages into a single payload', async () => {
      ticketsQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ status: TicketStatus.OPEN, count: '3' }])
        .mockResolvedValueOnce([{ level: '1', count: '3' }])
        .mockResolvedValueOnce([{ priority: 'HIGH', count: '2' }]);
      ticketsQueryBuilder.getRawOne.mockResolvedValueOnce({ avgHours: '4.5' });
      ratingsQueryBuilder.getRawOne.mockResolvedValueOnce({ avgScore: '4.2' });
      ticketsRepository.count.mockResolvedValue(3);

      const result = await service.dashboard();

      expect(result).toEqual({
        totalTickets: 3,
        byStatus: [{ status: TicketStatus.OPEN, count: 3 }],
        byLevel: [{ level: 1, count: 3 }],
        byPriority: [{ priority: 'HIGH', count: 2 }],
        averageResolutionHours: 4.5,
        averageSatisfaction: 4.2,
      });
    });

    it('reports null averages when there is no closed/rated data yet', async () => {
      ticketsQueryBuilder.getRawMany.mockResolvedValue([]);
      ticketsQueryBuilder.getRawOne.mockResolvedValueOnce({ avgHours: null });
      ratingsQueryBuilder.getRawOne.mockResolvedValueOnce({ avgScore: null });

      const result = await service.dashboard();

      expect(result.averageResolutionHours).toBeNull();
      expect(result.averageSatisfaction).toBeNull();
    });
  });

  describe('forecast', () => {
    it('groups history by category and projects the next week from the AI summary', async () => {
      ticketsQueryBuilder.getRawMany.mockResolvedValue([
        { category: 'hardware', period: '2026-06-01', count: '2' },
        { category: 'hardware', period: '2026-06-08', count: '4' },
        { category: 'rede', period: '2026-06-01', count: '1' },
      ]);

      const result = await service.forecast();

      expect(result.projection).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category: 'hardware', nextWeekProjection: 3 }),
          expect.objectContaining({ category: 'rede', nextWeekProjection: 1 }),
        ]),
      );
      expect(aiService.summarizeInsights).toHaveBeenCalledWith({ projection: result.projection });
      expect(result.summary).toBe('resumo gerado pela IA');
    });
  });

  describe('bottlenecks', () => {
    it('combines average attendance duration per level with tickets stuck in escalation', async () => {
      attendancesQueryBuilder.getRawMany.mockResolvedValue([
        { level: '1', avgHours: '1.5', count: '10' },
        { level: '2', avgHours: '3.0', count: '5' },
      ]);
      ticketsQueryBuilder.getRawMany.mockResolvedValue([{ level: '2', count: '2' }]);

      const result = await service.bottlenecks();

      expect(ticketsQueryBuilder.where).toHaveBeenCalledWith('ticket.status = :status', {
        status: TicketStatus.ESCALATED,
      });
      expect(result.perLevel).toEqual([
        { level: 1, averageHours: 1.5, attendances: 10, ticketsWaiting: 0 },
        { level: 2, averageHours: 3, attendances: 5, ticketsWaiting: 2 },
      ]);
      expect(aiService.summarizeInsights).toHaveBeenCalledWith({ perLevel: result.perLevel });
    });
  });
});
