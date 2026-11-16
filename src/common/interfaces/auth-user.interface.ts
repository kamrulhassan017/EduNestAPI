import { Role } from '../../users/enums/role.enum';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
