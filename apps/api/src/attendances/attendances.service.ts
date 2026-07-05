import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';

export interface RecordAttendanceInput {
  ticket: Ticket;
  responsible: User;
  level: number;
  description: string;
  endedAt?: Date;
}

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
  ) {}

  record(input: RecordAttendanceInput): Promise<Attendance> {
    const attendance = this.attendancesRepository.create({
      ticket: input.ticket,
      responsible: input.responsible,
      level: input.level,
      description: input.description,
      startedAt: new Date(),
      endedAt: input.endedAt,
    });
    return this.attendancesRepository.save(attendance);
  }

  findByTicket(ticketId: string): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: { ticket: { id: ticketId } },
      relations: { responsible: true },
      order: { startedAt: 'ASC' },
    });
  }
}
