import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { CourseOffering } from '../../offerings/entities/course-offering.entity';

@Entity('courses')
export class Course {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'CSC4161', maxLength: 20 })
  @Column({ unique: true, length: 20 })
  code: string;

  @ApiProperty({
    example: 'Advanced Programming in Web Technology',
    maxLength: 150,
  })
  @Column({ length: 150 })
  title: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 6 })
  @Column({ type: 'int' })
  credits: number;

  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: 1 })
  @Column()
  departmentId: number;

  @ApiPropertyOptional({ type: () => Department })
  @ManyToOne(() => Department, (department) => department.courses, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @ApiPropertyOptional({ type: () => [CourseOffering] })
  @OneToMany(() => CourseOffering, (offering) => offering.course)
  offerings: CourseOffering[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
