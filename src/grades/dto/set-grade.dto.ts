import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class SetGradeDto {
  @ApiProperty({ example: 82.5, minimum: 0, maximum: 100, multipleOf: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  marks!: number;
}
