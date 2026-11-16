import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { paginate } from '../common/utils/paginate';
import { Course } from '../courses/entities/course.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const saved = await this.departmentRepo.save(
      this.departmentRepo.create(dto),
    );
    return this.findOne(saved.id);
  }

  async findAll(query: DepartmentQueryDto) {
    const search = query.search?.trim();
    const [items, total] = await this.departmentRepo.findAndCount({
      where: search
        ? [{ name: ILike(`%${search}%`) }, { code: ILike(`%${search}%`) }]
        : {},
      order: { code: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id },
      relations: { courses: true },
    });
    if (!department) throw new NotFoundException(`Department ${id} not found`);
    return department;
  }

  async ensureExists(id: number): Promise<void> {
    if (!(await this.departmentRepo.existsBy({ id }))) {
      throw new NotFoundException(`Department ${id} not found`);
    }
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.departmentRepo.findOneBy({ id });
    if (!department) throw new NotFoundException(`Department ${id} not found`);
    Object.assign(department, dto);
    await this.departmentRepo.save(department);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    const courseCount = await this.courseRepo.countBy({ departmentId: id });
    if (courseCount > 0) {
      throw new ConflictException(
        `Department ${id} still has ${courseCount} course(s); delete or move them first`,
      );
    }
    await this.departmentRepo.delete(id);
  }
}
