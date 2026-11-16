import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'CSC4161', pattern: '^[A-Z]{2,5}\\d{3,4}$' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2,5}\d{3,4}$/, {
    message: 'code must look like CSC4161 (2-5 letters + 3-4 digits)',
  })
  code: string;

  @ApiProperty({
    example: 'Advanced Programming in Web Technology',
    minLength: 3,
    maxLength: 150,
  })
  @IsString()
  @Length(3, 150)
  title: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  credits: number;

  @ApiPropertyOptional({
    example: 'Backend development with NestJS.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  departmentId: number;
}
