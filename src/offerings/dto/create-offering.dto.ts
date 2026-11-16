import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min } from 'class-validator';
import { Semester } from '../enums/semester.enum';

export class CreateOfferingDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({
    example: 2,
    description: 'id of a user with role teacher',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  teacherId: number;

  @ApiProperty({ enum: Semester, example: Semester.FALL })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'A', pattern: '^[A-Z0-9]{1,5}$' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9]{1,5}$/, {
    message: 'section must be 1-5 letters/digits, e.g. A',
  })
  section: string;

  @ApiProperty({ example: 40, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;
}
