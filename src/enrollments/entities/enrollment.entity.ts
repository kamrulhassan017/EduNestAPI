import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Grade } from '../../grades/entities/grade.entity';
import { CourseOffering } from '../../offerings/entities/course-offering.entity';
import { User } from '../../users/entities/user.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

@Entity('enrollments')
@Unique('UQ_enrollment_student_offering', ['studentId', 'offeringId'])
export class Enrollment {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 3 })
  @Column()
  studentId!: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @ApiProperty({ example: 1 })
  @Column()
  offeringId!: number;

  @ApiProperty({ type: () => CourseOffering })
  @ManyToOne(() => CourseOffering, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offeringId' })
  offering!: CourseOffering;

  @ApiProperty({ enum: EnrollmentStatus, default: EnrollmentStatus.ENROLLED })
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
  })
  status!: EnrollmentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  enrolledAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  droppedAt!: Date | null;

  @ApiProperty({ type: () => Grade, nullable: true })
  @OneToOne(() => Grade, (grade) => grade.enrollment)
  grade!: Grade | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
