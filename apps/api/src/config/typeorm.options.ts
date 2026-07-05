import { DataSourceOptions } from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Ticket } from '../tickets/ticket.entity';
import { ChatMessage } from '../tickets/chat-message.entity';
import { Attendance } from '../attendances/attendance.entity';
import { Rating } from '../ratings/rating.entity';
import { KnowledgeArticle } from '../knowledge-base/knowledge-article.entity';

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Category, Ticket, ChatMessage, Attendance, Rating, KnowledgeArticle],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
};
