import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  limit: number;

  @ApiProperty({ example: 42, minimum: 0 })
  total: number;

  @ApiProperty({ example: 5, minimum: 0 })
  totalPages: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Course 7 not found',
  })
  message: string | string[];

  @ApiProperty({ example: '/api/v1/courses/7' })
  path: string;

  @ApiProperty({ example: '2026-11-15T10:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
