import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateEnrollmentDto {
  // studentId is always taken from authentication, never from this body.
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  offeringId!: number;
}
