import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../enums/role.enum';
import {
  IsNormalizedEmail,
  IsPersonName,
  IsAcceptablePassword,
} from './password.rules';

/** Admin creates an account with any role (usually a teacher or another admin). */
export class CreateUserDto {
  @IsPersonName('Dr. Ayesha Rahman')
  name!: string;

  @IsNormalizedEmail('ayesha.rahman@edunest.local')
  email!: string;

  @IsAcceptablePassword()
  password!: string;

  @ApiProperty({ enum: Role, example: Role.TEACHER })
  @IsEnum(Role, { message: 'role must be one of: admin, teacher, student' })
  role!: Role;
}
