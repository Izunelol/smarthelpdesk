import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmOptions } from './config/typeorm.options';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TicketsModule } from './tickets/tickets.module';
import { AttendancesModule } from './attendances/attendances.module';
import { RatingsModule } from './ratings/ratings.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmOptions),
    AuthModule,
    UsersModule,
    CategoriesModule,
    TicketsModule,
    AttendancesModule,
    RatingsModule,
    KnowledgeBaseModule,
    NotificationsModule,
    AiModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
