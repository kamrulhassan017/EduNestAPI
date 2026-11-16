import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'Computer Science and Engineering',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    example: 'CSE',
    description: '2-10 capital letters',
    pattern: '^[A-Z]{2,10}$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2,10}$/, { message: 'code must be 2-10 letters, e.g. CSE' })
  code: string;
}
