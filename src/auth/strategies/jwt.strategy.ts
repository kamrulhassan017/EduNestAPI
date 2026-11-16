import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthUser,
  JwtPayload,
} from '../../common/interfaces/auth-user.interface';
import { UsersService } from '../../users/users.service';

/**
 * Verifies the Bearer token's signature and expiry, then loads the user.
 * The returned object becomes request.user (read with @CurrentUser()).
 *
 * The user is re-read from the database on each request, so a deactivated
 * account or a changed role takes effect immediately, not when the token expires.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account not found or deactivated');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
