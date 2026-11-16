import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const started = Date.now();
    const incomingId = req.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0
        ? incomingId
        : randomUUID();

    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - started;
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip ?? '-'} [${requestId}]`;

      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}
