import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Md. Kamrul Hassan Rabby', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'rabby@edunest.local', maxLength: 255 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Admin only' })
  @IsOptional()
  @IsEnum(Role, { message: 'role must be one of: admin, teacher, student' })
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Admin only. true reactivates a deactivated account',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
