import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';

@ApiTags('Courses')
@ApiBearerAuth('access-token')
@ApiErrors(401)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Course created')
  @ApiOperation({ summary: 'Create a course (admin)' })
  @ApiEnvelope(Course, { status: HttpStatus.CREATED })
  @ApiErrors(400, 403, 404, 409)
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  @ResponseMessage('Courses fetched')
  @ApiOperation({ summary: 'List courses (filter by department, search)' })
  @ApiEnvelope(Course, { paginated: true })
  @ApiErrors(400)
  findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Course fetched')
  @ApiOperation({ summary: 'Get one course' })
  @ApiEnvelope(Course)
  @ApiErrors(400, 404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Course updated')
  @ApiOperation({ summary: 'Update a course (admin)' })
  @ApiEnvelope(Course)
  @ApiErrors(400, 403, 404, 409)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Course deleted')
  @ApiOperation({ summary: 'Delete a course with no offerings (admin)' })
  @ApiEnvelope(null)
  @ApiErrors(400, 403, 404, 409)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
