import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';

@Entity('departments')
export class Department {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Computer Science and Engineering', maxLength: 100 })
  @Column({ unique: true, length: 100 })
  name: string;

  @ApiProperty({ example: 'CSE', maxLength: 10 })
  @Column({ unique: true, length: 10 })
  code: string;

  @ApiPropertyOptional({ type: () => [Course] })
  @OneToMany(() => Course, (course) => course.department)
  courses: Course[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
