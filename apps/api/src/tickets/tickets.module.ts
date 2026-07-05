import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { ChatMessage } from './chat-message.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { RatingsModule } from '../ratings/ratings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, ChatMessage]),
    CategoriesModule,
    UsersModule,
    AttendancesModule,
    RatingsModule,
    NotificationsModule,
    KnowledgeBaseModule,
    forwardRef(() => AiModule),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TypeOrmModule, TicketsService],
})
export class TicketsModule {}
