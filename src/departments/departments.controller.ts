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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@ApiErrors(401)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Department created')
  @ApiOperation({ summary: 'Create a department (admin)' })
  @ApiEnvelope(Department, { status: HttpStatus.CREATED })
  @ApiErrors(400, 403, 409)
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  @ResponseMessage('Departments fetched')
  @ApiOperation({ summary: 'List departments' })
  @ApiEnvelope(Department, { paginated: true })
  @ApiErrors(400)
  findAll(@Query() query: DepartmentQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Department fetched')
  @ApiOperation({ summary: 'Get one department with its courses' })
  @ApiEnvelope(Department)
  @ApiErrors(400, 404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Department updated')
  @ApiOperation({ summary: 'Update a department (admin)' })
  @ApiEnvelope(Department)
  @ApiErrors(400, 403, 404, 409)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Department deleted')
  @ApiOperation({ summary: 'Delete a department with no courses (admin)' })
  @ApiEnvelope(null)
  @ApiErrors(400, 403, 404, 409)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.remove(id);
  }
}
