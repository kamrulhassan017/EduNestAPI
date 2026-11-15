import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { isPaginatedResult } from '../utils/paginate';

const DEFAULT_MESSAGES: Record<string, string> = {
  POST: 'Created successfully',
  PATCH: 'Updated successfully',
  PUT: 'Updated successfully',
  DELETE: 'Deleted successfully',
};

/**
 * Wraps every successful response in one envelope:
 *   { success: true, message, data, meta }
 * A paginated result { items, meta } becomes data = items, meta = meta.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<unknown>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ??
      DEFAULT_MESSAGES[request.method] ??
      'Request successful';

    return next.handle().pipe(
      map((result) => {
        if (isPaginatedResult(result)) {
          return {
            success: true as const,
            message,
            data: result.items,
            meta: result.meta,
          };
        }

        return {
          success: true as const,
          message,
          data: result ?? null,
          meta: null,
        };
      }),
    );
  }
}
