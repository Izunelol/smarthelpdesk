import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { Attendance } from '../attendances/attendance.entity';
import { Rating } from '../ratings/rating.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Attendance, Rating]), AiModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
