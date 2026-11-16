import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../common/interfaces/auth-user.interface';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const user = await this.usersService.create({ ...dto, role: Role.STUDENT });

    // don't fail registration if the email can't be sent
    void this.mailService.sendWelcome({
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return user;
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const found = await this.usersService.findByEmailWithPassword(dto.email);
    const passwordOk =
      found !== null &&
      (await this.usersService.verifyPassword(
        dto.password,
        found.passwordHash,
      ));

    // same error for unknown email and wrong password
    if (!found || !passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!found.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }

    const payload: JwtPayload = {
      sub: found.id,
      email: found.email,
      role: found.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1h',
      user: await this.usersService.findOne(found.id),
    };
  }

  me(userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }
}
