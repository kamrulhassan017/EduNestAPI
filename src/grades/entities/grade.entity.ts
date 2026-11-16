import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { User } from '../../users/entities/user.entity';

// postgres returns NUMERIC as a string
const decimalToNumber: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('grades')
export class Grade {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 1 })
  @Column()
  enrollmentId!: number;

  @ApiProperty({ type: () => Enrollment })
  @OneToOne(() => Enrollment, (enrollment) => enrollment.grade, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment!: Enrollment;

  @ApiProperty({ example: 82.5, minimum: 0, maximum: 100 })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalToNumber,
  })
  marks!: number;

  @ApiProperty({ example: 'A+' })
  @Column({ length: 2 })
  letter!: string;

  @ApiProperty({ example: 4 })
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    transformer: decimalToNumber,
  })
  gradePoint!: number;

  @ApiProperty({ example: 2 })
  @Column()
  gradedById!: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gradedById' })
  gradedBy!: User;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
