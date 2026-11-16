import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Enrollments')
@ApiBearerAuth('access-token')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ResponseMessage('Enrolled successfully')
  @ApiOperation({ summary: 'Enroll in an offering (student)' })
  @ApiEnvelope(Enrollment, { status: HttpStatus.CREATED })
  @ApiErrors(400, 401, 403, 404, 409)
  enroll(
    @CurrentUser('id') studentId: number,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.enroll(studentId, dto);
  }

  // Static route must precede :id.
  @Get('mine')
  @Roles(Role.STUDENT)
  @ResponseMessage('Your enrollments')
  @ApiOperation({ summary: 'My enrollments (student)' })
  @ApiEnvelope(Enrollment, { paginated: true })
  @ApiErrors(400, 401, 403)
  findMine(
    @CurrentUser('id') studentId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.enrollmentsService.findMine(studentId, query);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('Enrollments fetched')
  @ApiOperation({ summary: 'List all enrollments (admin)' })
  @ApiEnvelope(Enrollment, { paginated: true })
  @ApiErrors(400, 401, 403)
  findAll(@Query() query: EnrollmentQueryDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Enrollment fetched')
  @ApiOperation({ summary: 'Get one enrollment' })
  @ApiEnvelope(Enrollment)
  @ApiErrors(400, 401, 403, 404)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.findOneFor(id, user);
  }

  @Patch(':id/drop')
  @Roles(Role.STUDENT, Role.ADMIN)
  @ResponseMessage('Enrollment dropped')
  @ApiOperation({ summary: 'Drop an enrollment (own, or admin)' })
  @ApiEnvelope(Enrollment)
  @ApiErrors(400, 401, 403, 404, 409)
  drop(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.enrollmentsService.drop(id, user);
  }
}
