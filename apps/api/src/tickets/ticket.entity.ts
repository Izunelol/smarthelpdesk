import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Attendance } from '../attendances/attendance.entity';
import { Rating } from '../ratings/rating.entity';
import { ChatMessage } from './chat-message.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'int', default: 1 })
  level: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @ManyToOne(() => User, (user) => user.tickets)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @ManyToOne(() => Category, (category) => category.tickets)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Attendance, (attendance) => attendance.ticket)
  attendances: Attendance[];

  @OneToOne(() => Rating, (rating) => rating.ticket)
  rating?: Rating;

  @OneToMany(() => ChatMessage, (message) => message.ticket)
  chatMessages: ChatMessage[];
}
