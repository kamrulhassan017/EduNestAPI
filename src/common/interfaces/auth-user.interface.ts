import { Role } from '../../users/enums/role.enum';

/** The logged-in user, attached to request.user by JwtStrategy. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** What is signed into the access token. */
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
