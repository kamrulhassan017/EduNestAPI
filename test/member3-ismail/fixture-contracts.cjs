// TEST ONLY. These minimal contracts stand in for Member 2; they are not auth
// implementations and must never be imported by production src/ code.
require('reflect-metadata');
const {
  Module,
  Injectable,
  SetMetadata,
  createParamDecorator,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { TypeOrmModule, InjectRepository } = require('@nestjs/typeorm');
const { Entity, PrimaryGeneratedColumn, Column } = require('typeorm');
const { Exclude } = require('class-transformer');
const { ApiProperty, ApiHideProperty } = require('@nestjs/swagger');

const Role = { ADMIN: 'admin', TEACHER: 'teacher', STUDENT: 'student' };
class User {}
Entity('users')(User);
PrimaryGeneratedColumn()(User.prototype, 'id');
for (const name of ['name', 'email', 'role'])
  Column({ type: 'varchar' })(User.prototype, name);
Column({ type: 'varchar', select: false })(User.prototype, 'passwordHash');
Exclude()(User.prototype, 'passwordHash');
ApiHideProperty()(User.prototype, 'passwordHash');
ApiProperty({ type: Number })(User.prototype, 'id');
for (const name of ['name', 'email', 'role'])
  ApiProperty({ type: String })(User.prototype, name);

class UsersService {
  constructor(repo) {
    this.repo = repo;
  }
  async findOneWithRole(id, role) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.role !== role)
      throw new BadRequestException(`User ${id} is not a ${role}`);
    return user;
  }
}
Injectable()(UsersService);
InjectRepository(User)(UsersService, undefined, 0);
class UsersModule {}
Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})(UsersModule);

const Roles = (...roles) => SetMetadata('roles', roles);
const CurrentUser = createParamDecorator((field, context) => {
  const user = context.switchToHttp().getRequest().user;
  return field ? user?.[field] : user;
});

// Fixed fixture tokens deliberately do NOT test JWT verification or real guards.
const fixtureTokens = {
  'test-admin': { id: 1, role: Role.ADMIN },
  'test-teacher': { id: 2, role: Role.TEACHER },
  'test-student': { id: 3, role: Role.STUDENT },
  'test-other-teacher': { id: 4, role: Role.TEACHER },
};
class FixtureAuthGuard {
  canActivate(context) {
    if (context.getClass().name === 'AppController') return true;
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization ?? '';
    const user = fixtureTokens[authorization.replace(/^Bearer /, '')];
    if (!user || !authorization.startsWith('Bearer '))
      throw new UnauthorizedException();
    request.user = user;
    const roles = new Reflector().getAllAndOverride('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}

class FixtureUsers1700000000000 {
  name = 'FixtureUsers1700000000000';
  async up(runner) {
    await runner.query(`CREATE TABLE "users" (
      "id" SERIAL NOT NULL, "name" varchar NOT NULL, "email" varchar NOT NULL,
      "role" varchar NOT NULL, "passwordHash" varchar NOT NULL,
      CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
    )`);
  }
  async down(runner) {
    await runner.query('DROP TABLE "users"');
  }
}
module.exports = {
  Role,
  User,
  UsersService,
  UsersModule,
  Roles,
  CurrentUser,
  FixtureAuthGuard,
  FixtureUsers1700000000000,
};
