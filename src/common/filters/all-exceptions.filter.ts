import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

/** PostgreSQL error codes we turn into clear HTTP responses. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_CHECK_VIOLATION = '23514';
const PG_INVALID_TEXT = '22P02';

interface PgDriverError {
  code?: string;
  detail?: string;
}

/**
 * Catches every error and returns one consistent shape:
 *   { success: false, statusCode, error, message, path, timestamp }
 * Stack traces go to the server log only, never to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      error: this.reasonPhrase(statusCode),
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    // Nest's built-in exceptions (NotFoundException, ConflictException, ...)
    // and ValidationPipe errors (BadRequestException with a list of messages).
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      let message: string | string[] = exception.message;

      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object' && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      }

      return { statusCode: exception.getStatus(), message };
    }

    // Database errors from TypeORM.
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as PgDriverError;

      switch (driverError?.code) {
        case PG_UNIQUE_VIOLATION:
          return {
            statusCode: HttpStatus.CONFLICT,
            message: this.describeUnique(driverError.detail),
          };
        case PG_FOREIGN_KEY_VIOLATION:
          return {
            statusCode: HttpStatus.CONFLICT,
            message:
              'This record is linked to other data and cannot be changed or deleted, or a referenced record does not exist',
          };
        case PG_NOT_NULL_VIOLATION:
        case PG_CHECK_VIOLATION:
        case PG_INVALID_TEXT:
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'The request contains a value the database cannot accept',
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong. Please try again later.',
    };
  }

  /** Turns 'Key (email)=(a@b.com) already exists.' into a readable message. */
  private describeUnique(detail?: string): string {
    const match = detail?.match(/Key \((.+?)\)=\((.*?)\) already exists/);
    if (match) {
      return `A record with ${match[1]} '${match[2]}' already exists`;
    }
    return 'A record with the same unique value already exists';
  }

  private reasonPhrase(statusCode: number): string {
    const name = HttpStatus[statusCode];
    if (typeof name !== 'string') return 'Error';
    return name
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
}
