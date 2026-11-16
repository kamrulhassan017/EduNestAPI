import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { paginate } from '../common/utils/paginate';
import { Grade } from '../grades/entities/grade.entity';
import { CourseOffering } from '../offerings/entities/course-offering.entity';
import { OfferingsService } from '../offerings/offerings.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly dataSource: DataSource,
    private readonly offeringsService: OfferingsService,
  ) {}

  async enroll(
    studentId: number,
    dto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    const enrollmentId = await this.dataSource.transaction(async (manager) => {
      // lock the student row first so one student's requests can't race each other
      const student = await manager.findOne(User, {
        where: { id: studentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!student) throw new NotFoundException(`User ${studentId} not found`);
      const offering = await manager.findOne(CourseOffering, {
        where: { id: dto.offeringId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!offering)
        throw new NotFoundException(`Offering ${dto.offeringId} not found`);

      const sameCourse = await manager
        .createQueryBuilder(Enrollment, 'e')
        .innerJoin('e.offering', 'o')
        .where('e.studentId = :studentId', { studentId })
        .andWhere('e.status = :status', { status: EnrollmentStatus.ENROLLED })
        .andWhere('o.courseId = :courseId', { courseId: offering.courseId })
        .andWhere('o.semester = :semester', { semester: offering.semester })
        .andWhere('o.year = :year', { year: offering.year })
        .getCount();
      if (sameCourse > 0)
        throw new ConflictException(
          'You are already enrolled in this course for this term',
        );
      const taken = await manager.count(Enrollment, {
        where: { offeringId: offering.id, status: EnrollmentStatus.ENROLLED },
      });
      if (taken >= offering.capacity)
        throw new ConflictException(
          `Offering ${offering.id} is full (${offering.capacity} seats)`,
        );

      const previous = await manager.findOneBy(Enrollment, {
        studentId,
        offeringId: offering.id,
      });
      if (previous) {
        previous.status = EnrollmentStatus.ENROLLED;
        previous.droppedAt = null;
        await manager.save(previous);
        return previous.id;
      }
      const created = await manager.save(
        manager.create(Enrollment, {
          studentId,
          offeringId: offering.id,
          status: EnrollmentStatus.ENROLLED,
        }),
      );
      return created.id;
    });
    return this.findOne(enrollmentId);
  }

  async findMine(studentId: number, query: PaginationQueryDto) {
    const [items, total] = await this.enrollmentRepo.findAndCount({
      where: { studentId },
      relations: { offering: { course: true, teacher: true }, grade: true },
      order: { enrolledAt: 'DESC', id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  async findAll(query: EnrollmentQueryDto) {
    const where: FindOptionsWhere<Enrollment> = {};
    if (query.offeringId) where.offeringId = query.offeringId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    const [items, total] = await this.enrollmentRepo.findAndCount({
      where,
      relations: { student: true, offering: { course: true } },
      order: { id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id },
      relations: {
        student: true,
        offering: { course: true, teacher: true },
        grade: true,
      },
    });
    if (!enrollment) throw new NotFoundException(`Enrollment ${id} not found`);
    return enrollment;
  }

  async findOneFor(id: number, user: AuthUser): Promise<Enrollment> {
    const enrollment = await this.findOne(id);
    if (
      user.role === Role.ADMIN ||
      (user.role === Role.STUDENT && enrollment.studentId === user.id) ||
      (user.role === Role.TEACHER && enrollment.offering.teacherId === user.id)
    )
      return enrollment;
    throw new ForbiddenException('You cannot view this enrollment');
  }

  async findStudents(
    offeringId: number,
    user: AuthUser,
    query: PaginationQueryDto,
  ) {
    const offering = await this.offeringsService.findOne(offeringId);
    if (
      user.role !== Role.ADMIN &&
      !(user.role === Role.TEACHER && offering.teacherId === user.id)
    ) {
      throw new ForbiddenException('You do not teach this offering');
    }
    const [items, total] = await this.enrollmentRepo.findAndCount({
      where: { offeringId, status: EnrollmentStatus.ENROLLED },
      relations: { student: true, grade: true },
      order: { id: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }

  async drop(id: number, user: AuthUser): Promise<Enrollment> {
    await this.dataSource.transaction(async (manager) => {
      // same lock as GradesService.setGrade so grading and dropping can't overlap
      const enrollment = await manager.findOne(Enrollment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!enrollment)
        throw new NotFoundException(`Enrollment ${id} not found`);
      if (
        user.role !== Role.ADMIN &&
        !(user.role === Role.STUDENT && enrollment.studentId === user.id)
      ) {
        throw new ForbiddenException('You can only drop your own enrollments');
      }
      if (enrollment.status === EnrollmentStatus.DROPPED)
        throw new ConflictException('This enrollment is already dropped');
      if (await manager.existsBy(Grade, { enrollmentId: id }))
        throw new ConflictException('A graded enrollment cannot be dropped');
      await manager.update(Enrollment, id, {
        status: EnrollmentStatus.DROPPED,
        droppedAt: new Date(),
      });
    });
    return this.findOne(id);
  }
}
