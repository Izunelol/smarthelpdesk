import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { KnowledgeArticle } from '../knowledge-base/knowledge-article.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int' })
  level: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.attendances)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.attendances)
  @JoinColumn({ name: 'responsible_id' })
  responsible: User;

  @ManyToMany(() => KnowledgeArticle, (article) => article.attendances)
  @JoinTable({
    name: 'attendance_knowledge_articles',
    joinColumn: { name: 'attendance_id' },
    inverseJoinColumn: { name: 'knowledge_article_id' },
  })
  knowledgeArticles: KnowledgeArticle[];
}
