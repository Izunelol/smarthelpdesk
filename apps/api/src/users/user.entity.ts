import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Ticket } from '../tickets/ticket.entity';
import { Attendance } from '../attendances/attendance.entity';

export enum UserRole {
  USER = 'USER',
  TECHNICIAN = 'TECHNICIAN',
  SPECIALIST = 'SPECIALIST',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.requester)
  tickets: Ticket[];

  @OneToMany(() => Attendance, (attendance) => attendance.responsible)
  attendances: Attendance[];
}
