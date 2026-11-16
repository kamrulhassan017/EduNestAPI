import { ApiProperty } from '@nestjs/swagger';
import { Semester } from '../../offerings/enums/semester.enum';

export class TranscriptRowDto {
  @ApiProperty({ example: 'CSC4161' })
  courseCode!: string;

  @ApiProperty({ example: 'Advanced Programming in Web Technology' })
  courseTitle!: string;

  @ApiProperty({ example: 3 })
  credits!: number;

  @ApiProperty({ enum: Semester, example: Semester.FALL })
  semester!: Semester;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 82.5 })
  marks!: number;

  @ApiProperty({ example: 'A+' })
  letter!: string;

  @ApiProperty({ example: 4 })
  gradePoint!: number;
}

export class TranscriptDto {
  @ApiProperty({ example: 3 })
  studentId!: number;

  @ApiProperty({ type: [TranscriptRowDto] })
  courses!: TranscriptRowDto[];

  @ApiProperty({ example: 3 })
  totalCredits!: number;

  @ApiProperty({ type: Number, nullable: true, example: 4 })
  cgpa!: number | null;
}
