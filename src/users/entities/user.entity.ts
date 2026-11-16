import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../enums/role.enum';

@Entity('users')
@Unique('UQ_users_email', ['email'])
export class User {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_users_id' })
  id!: number;

  @ApiProperty({ example: 'Md. Kamrul Hassan Rabby', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiProperty({ example: 'rabby@edunest.local', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @ApiHideProperty()
  @Exclude()
  @Column({ type: 'varchar', select: false })
  passwordHash!: string;

  @ApiProperty({ enum: Role, example: Role.STUDENT })
  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role!: Role;

  @ApiProperty({
    example: true,
    description: 'false = deactivated (soft deleted); cannot log in',
  })
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
