import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from './swagger.dto';

const DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid input (validation failed)',
  [HttpStatus.UNAUTHORIZED]: 'Missing, invalid or expired token',
  [HttpStatus.FORBIDDEN]: 'Your role is not allowed to do this',
  [HttpStatus.NOT_FOUND]: 'Record not found',
  [HttpStatus.CONFLICT]: 'Duplicate value, or the record is still in use',
};

export function ApiErrors(...statuses: HttpStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status] ?? 'Error',
        type: ErrorResponseDto,
      }),
    ),
  );
}
