import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { AttendancesService } from './attendances.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance])],
  providers: [AttendancesService],
  exports: [TypeOrmModule, AttendancesService],
})
export class AttendancesModule {}
