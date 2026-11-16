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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { OfferingQueryDto } from './dto/offering-query.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CourseOffering } from './entities/course-offering.entity';
import { OfferingsService } from './offerings.service';

@ApiTags('Offerings')
@ApiBearerAuth('access-token')
@ApiErrors(401)
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Offering created')
  @ApiOperation({
    summary: 'Create an offering: course + teacher + term (admin)',
  })
  @ApiEnvelope(CourseOffering, { status: HttpStatus.CREATED })
  @ApiErrors(400, 403, 404, 409)
  create(@Body() dto: CreateOfferingDto) {
    return this.offeringsService.create(dto);
  }

  @Get()
  @ResponseMessage('Offerings fetched')
  @ApiOperation({ summary: 'List offerings (filter by course, teacher, term)' })
  @ApiEnvelope(CourseOffering, { paginated: true })
  @ApiErrors(400)
  findAll(@Query() query: OfferingQueryDto) {
    return this.offeringsService.findAll(query);
  }

  // Literal route MUST precede :id.
  @Get('mine')
  @Roles(Role.TEACHER)
  @ResponseMessage('Your offerings')
  @ApiOperation({ summary: 'Offerings I teach (teacher)' })
  @ApiEnvelope(CourseOffering, { paginated: true })
  @ApiErrors(400, 403)
  findMine(
    @CurrentUser('id') teacherId: number,
    @Query() query: OfferingQueryDto,
  ) {
    return this.offeringsService.findMine(teacherId, query);
  }

  @Get(':id')
  @ResponseMessage('Offering fetched')
  @ApiOperation({ summary: 'Get one offering' })
  @ApiEnvelope(CourseOffering)
  @ApiErrors(400, 404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Offering updated')
  @ApiOperation({ summary: 'Update an offering (admin)' })
  @ApiEnvelope(CourseOffering)
  @ApiErrors(400, 403, 404, 409)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOfferingDto,
  ) {
    return this.offeringsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Offering deleted')
  @ApiOperation({ summary: 'Delete an offering with no enrollments (admin)' })
  @ApiEnvelope(null)
  @ApiErrors(400, 403, 404, 409)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.offeringsService.remove(id);
  }
}
