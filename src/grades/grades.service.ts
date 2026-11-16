import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { CourseOffering } from '../offerings/entities/course-offering.entity';
import { OfferingsService } from '../offerings/offerings.service';
import { Role } from '../users/enums/role.enum';
import { SetGradeDto } from './dto/set-grade.dto';
import { TranscriptDto, TranscriptRowDto } from './dto/transcript.dto';
import { Grade } from './entities/grade.entity';
import { toLetterGrade } from './grade-scale';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    private readonly dataSource: DataSource,
    private readonly offeringsService: OfferingsService,
    private readonly auditService: AuditService,
  ) {}

  async setGrade(
    enrollmentId: number,
    dto: SetGradeDto,
    user: AuthUser,
  ): Promise<Grade> {
    const { saved, oldMarks } = await this.dataSource.transaction(
      async (manager) => {
        // Serialize both simultaneous grade upserts and grade-vs-drop. The check
        // and write happen under the same lock used in EnrollmentsService.drop.
        const enrollment = await manager.findOne(Enrollment, {
          where: { id: enrollmentId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!enrollment)
          throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
        const offering = await manager.findOneByOrFail(CourseOffering, {
          id: enrollment.offeringId,
        });
        if (
          user.role !== Role.ADMIN &&
          !(user.role === Role.TEACHER && offering.teacherId === user.id)
        ) {
          throw new ForbiddenException(
            'Only the teacher of this offering can grade it',
          );
        }
        if (enrollment.status !== EnrollmentStatus.ENROLLED)
          throw new BadRequestException(
            'A dropped enrollment cannot be graded',
          );
        const { letter, point } = toLetterGrade(dto.marks);
        const previous = await manager.findOneBy(Grade, { enrollmentId });
        const oldMarks = previous?.marks ?? null;
        const grade = previous ?? manager.create(Grade, { enrollmentId });
        grade.marks = dto.marks;
        grade.letter = letter;
        grade.gradePoint = point;
        grade.gradedById = user.id;
        return { saved: await manager.save(grade), oldMarks };
      },
    );

    // Only committed grades are audited. Audit is intentionally best-effort and
    // outside the business transaction, as required by the guide.
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: oldMarks === null ? 'GRADE_GIVEN' : 'GRADE_CHANGED',
      entity: 'Grade',
      entityId: saved.id,
      details: {
        enrollmentId,
        oldMarks,
        newMarks: dto.marks,
        letter: saved.letter,
      },
    });
    return this.findOne(saved.id);
  }

  async findOne(id: number): Promise<Grade> {
    const grade = await this.gradeRepo.findOne({
      where: { id },
      relations: {
        enrollment: { student: true, offering: { course: true } },
        gradedBy: true,
      },
    });
    if (!grade) throw new NotFoundException(`Grade ${id} not found`);
    return grade;
  }

  async transcript(studentId: number): Promise<TranscriptDto> {
    const grades = await this.gradeRepo.find({
      where: { enrollment: { studentId, status: EnrollmentStatus.ENROLLED } },
      relations: { enrollment: { offering: { course: true } } },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const courses: TranscriptRowDto[] = grades.map((g) => ({
      courseCode: g.enrollment.offering.course.code,
      courseTitle: g.enrollment.offering.course.title,
      credits: g.enrollment.offering.course.credits,
      semester: g.enrollment.offering.semester,
      year: g.enrollment.offering.year,
      marks: g.marks,
      letter: g.letter,
      gradePoint: g.gradePoint,
    }));
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const points = courses.reduce(
      (sum, c) => sum + c.gradePoint * c.credits,
      0,
    );
    const cgpa =
      totalCredits > 0 ? Math.round((points / totalCredits) * 100) / 100 : null;
    return { studentId, courses, totalCredits, cgpa };
  }

  async findForOffering(offeringId: number, user: AuthUser): Promise<Grade[]> {
    const offering = await this.offeringsService.findOne(offeringId);
    if (
      user.role !== Role.ADMIN &&
      !(user.role === Role.TEACHER && offering.teacherId === user.id)
    ) {
      throw new ForbiddenException('You do not teach this offering');
    }
    return this.gradeRepo.find({
      where: { enrollment: { offeringId } },
      relations: { enrollment: { student: true } },
      order: { id: 'ASC' },
    });
  }
}
