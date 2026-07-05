import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Attendance } from '../attendances/attendance.entity';

@Entity('knowledge_articles')
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  keywords: string[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Attendance, (attendance) => attendance.knowledgeArticles)
  attendances: Attendance[];
}
