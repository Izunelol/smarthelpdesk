import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { Attendance } from '../attendances/attendance.entity';
import { Rating } from '../ratings/rating.entity';
import { AiService } from '../ai/ai.service';

interface StatusCount {
  status: TicketStatus;
  count: string;
}

interface LevelCount {
  level: number;
  count: string;
}

interface PriorityCount {
  priority: string;
  count: string;
}

interface CategoryPeriodCount {
  category: string;
  period: string;
  count: string;
}

interface LevelDuration {
  level: number;
  avgHours: string | null;
  count: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
    private readonly aiService: AiService,
  ) {}

  // RF — GET /reports/dashboard
  async dashboard() {
    const byStatus: StatusCount[] = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    const byLevel: LevelCount[] = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.level')
      .getRawMany();

    const byPriority: PriorityCount[] = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.priority')
      .getRawMany();

    const avgResolution = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select(
        'AVG(EXTRACT(EPOCH FROM (ticket.closedAt - ticket.createdAt)) / 3600)',
        'avgHours',
      )
      .where('ticket.closedAt IS NOT NULL')
      .getRawOne<{ avgHours: string | null }>();

    const avgRating = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'avgScore')
      .getRawOne<{ avgScore: string | null }>();

    const total = await this.ticketsRepository.count();

    return {
      totalTickets: total,
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byLevel: byLevel.map((r) => ({ level: Number(r.level), count: Number(r.count) })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: Number(r.count) })),
      averageResolutionHours: avgResolution?.avgHours ? Number(avgResolution.avgHours) : null,
      averageSatisfaction: avgRating?.avgScore ? Number(avgRating.avgScore) : null,
    };
  }

  // RF17 — GET /reports/forecast
  async forecast() {
    const history: CategoryPeriodCount[] = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.category', 'category')
      .select('category.name', 'category')
      .addSelect(`to_char(date_trunc('week', ticket.createdAt), 'YYYY-MM-DD')`, 'period')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.name')
      .addGroupBy(`date_trunc('week', ticket.createdAt)`)
      .orderBy(`date_trunc('week', ticket.createdAt)`, 'ASC')
      .getRawMany();

    const byCategory = new Map<string, { period: string; count: number }[]>();
    for (const row of history) {
      const key = row.category ?? 'sem categoria';
      const list = byCategory.get(key) ?? [];
      list.push({ period: row.period, count: Number(row.count) });
      byCategory.set(key, list);
    }

    const projection = Array.from(byCategory.entries()).map(([category, series]) => {
      const recentWeeks = series.slice(-4);
      const average =
        recentWeeks.reduce((sum, item) => sum + item.count, 0) / (recentWeeks.length || 1);
      return {
        category,
        history: series,
        nextWeekProjection: Math.round(average),
      };
    });

    const summary = await this.aiService.summarizeInsights({ projection });

    return { projection, summary };
  }

  // RF18 — GET /reports/bottlenecks
  async bottlenecks() {
    const durations: LevelDuration[] = await this.attendancesRepository
      .createQueryBuilder('attendance')
      .select('attendance.level', 'level')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (attendance.endedAt - attendance.startedAt)) / 3600)',
        'avgHours',
      )
      .addSelect('COUNT(*)', 'count')
      .where('attendance.endedAt IS NOT NULL')
      .groupBy('attendance.level')
      .orderBy('attendance.level', 'ASC')
      .getRawMany();

    const stuckByLevel: LevelCount[] = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('ticket.status = :status', { status: TicketStatus.ESCALATED })
      .groupBy('ticket.level')
      .getRawMany();

    const perLevel = durations.map((d) => ({
      level: Number(d.level),
      averageHours: d.avgHours ? Number(d.avgHours) : null,
      attendances: Number(d.count),
      ticketsWaiting:
        Number(stuckByLevel.find((s) => Number(s.level) === Number(d.level))?.count ?? 0),
    }));

    const summary = await this.aiService.summarizeInsights({ perLevel });

    return { perLevel, summary };
  }
}
