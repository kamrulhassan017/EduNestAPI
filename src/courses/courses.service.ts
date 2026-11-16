import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { paginate } from '../common/utils/paginate';
import { DepartmentsService } from '../departments/departments.service';
import { CourseOffering } from '../offerings/entities/course-offering.entity';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async create(dto: CreateCourseDto): Promise<Course> {
    await this.departmentsService.ensureExists(dto.departmentId);
    const saved = await this.courseRepo.save(this.courseRepo.create(dto));
    return this.findOne(saved.id);
  }

  async findAll(query: CourseQueryDto) {
    const base: FindOptionsWhere<Course> = {};
    if (query.departmentId) base.departmentId = query.departmentId;
    const search = query.search?.trim();
    const [items, total] = await this.courseRepo.findAndCount({
      where: search
        ? [
            { ...base, code: ILike(`%${search}%`) },
            { ...base, title: ILike(`%${search}%`) },
          ]
        : base,
      relations: { department: true },
      order: { code: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  async ensureExists(id: number): Promise<void> {
    if (!(await this.courseRepo.existsBy({ id }))) {
      throw new NotFoundException(`Course ${id} not found`);
    }
  }

  async update(id: number, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepo.findOneBy({ id });
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    if (dto.departmentId !== undefined) {
      await this.departmentsService.ensureExists(dto.departmentId);
    }
    Object.assign(course, dto);
    await this.courseRepo.save(course);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    const offeringCount = await this.offeringRepo.countBy({ courseId: id });
    if (offeringCount > 0) {
      throw new ConflictException(
        `Course ${id} still has ${offeringCount} offering(s); delete them first`,
      );
    }
    await this.courseRepo.delete(id);
  }
}
