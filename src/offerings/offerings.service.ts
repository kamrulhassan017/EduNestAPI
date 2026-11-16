import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { paginate } from '../common/utils/paginate';
import { CoursesService } from '../courses/courses.service';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { OfferingQueryDto } from './dto/offering-query.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CourseOffering } from './entities/course-offering.entity';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateOfferingDto): Promise<CourseOffering> {
    await this.coursesService.ensureExists(dto.courseId);
    await this.usersService.findOneWithRole(dto.teacherId, Role.TEACHER);
    const saved = await this.offeringRepo.save(this.offeringRepo.create(dto));
    return this.findOne(saved.id);
  }

  async findAll(query: OfferingQueryDto) {
    const where: FindOptionsWhere<CourseOffering> = {};
    if (query.courseId) where.courseId = query.courseId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.semester) where.semester = query.semester;
    if (query.year) where.year = query.year;
    const [items, total] = await this.offeringRepo.findAndCount({
      where,
      relations: { course: true, teacher: true },
      order: { year: 'DESC', id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  /** Override untrusted teacherId without losing the DTO's inherited skip getter. */
  findMine(teacherId: number, query: OfferingQueryDto) {
    return this.findAll(
      Object.assign(new OfferingQueryDto(), query, { teacherId }),
    );
  }

  /** Public contract for Member 4: do not rename this method or its relations. */
  async findOne(id: number): Promise<CourseOffering> {
    const offering = await this.offeringRepo.findOne({
      where: { id },
      relations: { course: { department: true }, teacher: true },
    });
    if (!offering) throw new NotFoundException(`Offering ${id} not found`);
    return offering;
  }

  async update(id: number, dto: UpdateOfferingDto): Promise<CourseOffering> {
    const offering = await this.offeringRepo.findOneBy({ id });
    if (!offering) throw new NotFoundException(`Offering ${id} not found`);
    if (dto.courseId !== undefined)
      await this.coursesService.ensureExists(dto.courseId);
    if (dto.teacherId !== undefined) {
      await this.usersService.findOneWithRole(dto.teacherId, Role.TEACHER);
    }
    Object.assign(offering, dto);
    await this.offeringRepo.save(offering);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    // Member 4's enrollment FK uses RESTRICT; the shared filter maps it to 409.
    await this.offeringRepo.delete(id);
  }
}
