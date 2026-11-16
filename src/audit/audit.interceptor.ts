import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AuditService } from './audit.service';

const ACTIONS: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};
// Auth has no useful change trail; Grades writes its own old/new marks entries.
const SKIP = new Set(['Auth', 'Grades']);

function findId(result: unknown): string | null {
  const data =
    result !== null && typeof result === 'object' && 'data' in result
      ? result.data
      : result;
  if (data !== null && typeof data === 'object' && 'id' in data) {
    const id = data.id;
    if (typeof id === 'number' || typeof id === 'string') return String(id);
  }
  return null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const action = ACTIONS[request.method];
    const entity = context.getClass().name.replace(/Controller$/, '');
    if (!action || SKIP.has(entity)) return next.handle();
    const params = request.params as Record<string, string | undefined>;
    return next.handle().pipe(
      tap((result: unknown) => {
        // Error emissions are not audited. Never store request bodies or credentials.
        void this.auditService.log({
          actorId: request.user?.id ?? null,
          actorRole: request.user?.role ?? null,
          action: `${entity.toUpperCase()}_${action}`,
          entity,
          entityId: params.id ?? findId(result),
          details: { method: request.method, path: request.originalUrl },
        });
      }),
    );
  }
}
