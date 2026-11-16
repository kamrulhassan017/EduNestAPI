import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { SetGradeDto } from './dto/set-grade.dto';
import { TranscriptDto } from './dto/transcript.dto';
import { Grade } from './entities/grade.entity';
import { GradesService } from './grades.service';

@ApiTags('Grades')
@ApiBearerAuth('access-token')
@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Put('enrollments/:id/grade')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ResponseMessage('Grade saved')
  @ApiOperation({
    summary: "Give or update a grade (offering's teacher or admin)",
  })
  @ApiEnvelope(Grade)
  @ApiErrors(400, 401, 403, 404)
  setGrade(
    @Param('id', ParseIntPipe) enrollmentId: number,
    @Body() dto: SetGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradesService.setGrade(enrollmentId, dto, user);
  }

  @Get('grades/mine')
  @Roles(Role.STUDENT)
  @ResponseMessage('Your transcript')
  @ApiOperation({ summary: 'My transcript and CGPA (student)' })
  @ApiEnvelope(TranscriptDto)
  @ApiErrors(401, 403)
  transcript(@CurrentUser('id') studentId: number) {
    return this.gradesService.transcript(studentId);
  }

  @Get('offerings/:id/grades')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ResponseMessage('Offering grades')
  @ApiOperation({ summary: 'All grades of an offering (its teacher or admin)' })
  @ApiEnvelope(Grade, { isArray: true })
  @ApiErrors(400, 401, 403, 404)
  findForOffering(
    @Param('id', ParseIntPipe) offeringId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradesService.findForOffering(offeringId, user);
  }
}
