import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as open to everyone: the global JwtAuthGuard skips it.
 * Used only for register, login and the health check.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
