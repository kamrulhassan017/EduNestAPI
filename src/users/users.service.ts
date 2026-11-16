import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { PaginatedResult } from '../common/interfaces/api-response.interface';
import { paginate } from '../common/utils/paginate';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';

/** NFR-01: at least 10 bcrypt salt rounds. */
const MIN_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    config: ConfigService,
  ) {
    const configured = Number(
      config.get('BCRYPT_SALT_ROUNDS') ?? MIN_SALT_ROUNDS,
    );
    this.saltRounds = Math.max(
      MIN_SALT_ROUNDS,
      Number.isInteger(configured) ? configured : MIN_SALT_ROUNDS,
    );
  }

  // ---------- passwords ----------

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  // ---------- create ----------

  /** Used by admin POST /users and by AuthService.register (role forced to student there). */
  async create(dto: CreateUserDto): Promise<User> {
    await this.ensureEmailFree(dto.email);
    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordHash: await this.hashPassword(dto.password),
      isActive: true,
    });
    const saved = await this.usersRepo.save(user);
    return this.findOne(saved.id);
  }

  // ---------- read ----------

  async findAll(query: UserQueryDto): Promise<PaginatedResult<User>> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .orderBy('user.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.role) qb.andWhere('user.role = :role', { role: query.role });
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('user.name ILIKE :term', { term }).orWhere(
            'user.email ILIKE :term',
            { term },
          );
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  /**
   * Contract used by Members 3 and 4 (e.g. "teacherId must be a teacher").
   * 404 if the user does not exist, 400 if they have a different role.
   */
  async findOneWithRole(id: number, role: Role): Promise<User> {
    const user = await this.findOne(id);
    if (user.role !== role) {
      throw new BadRequestException(`User ${id} is not a ${role}`);
    }
    return user;
  }

  /** For login only: includes the password hash, which is normally never selected. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  /** Used by JwtStrategy on every request: only active accounts may use their token. */
  findActiveById(id: number): Promise<User | null> {
    return this.usersRepo.findOneBy({ id, isActive: true });
  }

  // ---------- update ----------

  /** Owner can change name/email; only an admin can change role or isActive. */
  async update(id: number, dto: UpdateUserDto, actor: AuthUser): Promise<User> {
    const isAdmin = actor.role === Role.ADMIN;

    if (!isAdmin && actor.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    if (!isAdmin && (dto.role !== undefined || dto.isActive !== undefined)) {
      throw new ForbiddenException('Only an admin can change role or status');
    }
    if (actor.id === id && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    if (actor.id === id && dto.role !== undefined && dto.role !== actor.role) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.findOne(id);
    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailFree(dto.email);
    }

    Object.assign(user, dto);
    await this.usersRepo.save(user);
    return this.findOne(id);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const matches = await this.verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches)
      throw new UnauthorizedException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current one',
      );
    }

    await this.usersRepo.update(userId, {
      passwordHash: await this.hashPassword(dto.newPassword),
    });
  }

  // ---------- delete (soft) ----------

  /** DELETE /users/:id deactivates instead of deleting, so enrollments and grades keep their history. */
  async deactivate(id: number, actor: AuthUser): Promise<User> {
    if (actor.id === id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const user = await this.findOne(id);
    if (!user.isActive) {
      throw new ConflictException(`User ${id} is already deactivated`);
    }
    user.isActive = false;
    await this.usersRepo.save(user);
    return this.findOne(id);
  }

  // ---------- seed ----------

  /** Creates the first admin if no admin exists yet. Returns true if one was created. */
  async ensureAdmin(
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> {
    const adminCount = await this.usersRepo.count({
      where: { role: Role.ADMIN },
    });
    if (adminCount > 0) return false;

    const normalized = email.trim().toLowerCase();
    const existing = await this.usersRepo.findOneBy({ email: normalized });
    if (existing) {
      existing.role = Role.ADMIN;
      existing.isActive = true;
      await this.usersRepo.save(existing);
      return true;
    }

    await this.usersRepo.save(
      this.usersRepo.create({
        name,
        email: normalized,
        role: Role.ADMIN,
        isActive: true,
        passwordHash: await this.hashPassword(password),
      }),
    );
    return true;
  }

  // ---------- helpers ----------

  private async ensureEmailFree(email: string): Promise<void> {
    const taken = await this.usersRepo.existsBy({ email });
    if (taken) {
      throw new ConflictException(
        `A user with email '${email}' already exists`,
      );
    }
  }
}
