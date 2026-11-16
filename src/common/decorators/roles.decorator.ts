import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Limits a route (or a whole controller) to the given roles.
 * Enforced by the global RolesGuard; a wrong role gets 403.
 *
 *   @Roles(Role.ADMIN)
 *   @Delete(':id')
 *   remove(...) {}
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
