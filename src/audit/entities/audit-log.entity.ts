import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
@Index(['entity', 'entityId'])
export class AuditLog {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  // no FK on purpose so logs outlive the user
  @ApiProperty({ type: Number, nullable: true, example: 1 })
  @Index()
  @Column({ type: 'int', nullable: true })
  actorId!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'admin' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  actorRole!: string | null;

  @ApiProperty({ example: 'COURSES_CREATE' })
  @Column({ length: 50 })
  action!: string;

  @ApiProperty({ example: 'Courses' })
  @Column({ length: 50 })
  entity!: string;

  @ApiProperty({ type: String, nullable: true, example: '1' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  entityId!: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: { method: 'POST', path: '/api/v1/courses' },
  })
  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
