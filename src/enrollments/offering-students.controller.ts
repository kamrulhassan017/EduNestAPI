import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Enrollments')
@ApiBearerAuth('access-token')
@Controller('offerings')
export class OfferingStudentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':id/students')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ResponseMessage('Enrolled students')
  @ApiOperation({
    summary: 'Students enrolled in an offering (its teacher or admin)',
  })
  @ApiEnvelope(Enrollment, { paginated: true })
  @ApiErrors(400, 401, 403, 404)
  findStudents(
    @Param('id', ParseIntPipe) offeringId: number,
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.enrollmentsService.findStudents(offeringId, user, query);
  }
}
