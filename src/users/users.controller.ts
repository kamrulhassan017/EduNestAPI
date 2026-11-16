import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Declared before ':id' so "me" is not parsed as an id.
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password changed')
  @ApiOperation({ summary: 'Change your own password (any logged-in user)' })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({
    description: 'New password too weak or same as current',
  })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ): Promise<null> {
    await this.usersService.changePassword(userId, dto);
    return null;
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('Users retrieved')
  @ApiOperation({
    summary:
      'List users with pagination; filter by role, status or search (Admin)',
  })
  @ApiOkResponse({ type: User, isArray: true })
  @ApiForbiddenResponse({ description: 'Admin only' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('User retrieved')
  @ApiOperation({ summary: 'Get one user (Admin)' })
  @ApiOkResponse({ type: User })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('User created')
  @ApiOperation({
    summary: 'Create a staff account: teacher, admin or student (Admin)',
  })
  @ApiCreatedResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiConflictResponse({ description: 'Email already in use' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ResponseMessage('User updated')
  @ApiOperation({
    summary:
      'Update a profile (owner or Admin); role and isActive only by Admin',
  })
  @ApiOkResponse({ type: User })
  @ApiForbiddenResponse({
    description: 'Not your profile, or role/status change by a non-admin',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email already in use' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('User deactivated')
  @ApiOperation({
    summary:
      'Deactivate a user (soft delete; they can no longer log in) (Admin)',
  })
  @ApiOkResponse({ type: User })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Already deactivated' })
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.deactivate(id, actor);
  }
}
