import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Global guard (registered in AuthModule). Every route needs a valid token
 * unless it is marked @Public(). Missing, bad or expired token = 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: { name?: string; message?: string } | undefined,
  ): TUser {
    if (err instanceof UnauthorizedException) throw err;
    if (err || !user) {
      let message = 'Invalid access token';
      if (info?.name === 'TokenExpiredError')
        message = 'Access token has expired';
      else if (info?.message === 'No auth token')
        message = 'Missing access token';
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
