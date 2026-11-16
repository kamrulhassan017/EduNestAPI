import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Injects the logged-in user, or one field of it.
 *
 *   me(@CurrentUser() user: AuthUser) {}
 *   mine(@CurrentUser('id') userId: number) {}
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
