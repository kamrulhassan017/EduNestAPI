import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { Semester } from '../enums/semester.enum';

@Entity('course_offerings')
@Unique('UQ_offering_course_term_section', [
  'courseId',
  'semester',
  'year',
  'section',
])
export class CourseOffering {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  courseId: number;

  @ApiPropertyOptional({ type: () => Course })
  @ManyToOne(() => Course, (course) => course.offerings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ApiProperty({ example: 2 })
  @Column()
  teacherId: number;

  @ApiPropertyOptional({ type: () => User })
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ApiProperty({ enum: Semester, example: Semester.FALL })
  @Column({ type: 'enum', enum: Semester })
  semester: Semester;

  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @Column({ type: 'int' })
  year: number;

  @ApiProperty({ example: 'A', maxLength: 5 })
  @Column({ length: 5 })
  section: string;

  @ApiProperty({ example: 40, minimum: 1, maximum: 500 })
  @Column({ type: 'int' })
  capacity: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
