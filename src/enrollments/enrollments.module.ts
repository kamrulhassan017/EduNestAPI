import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferingsModule } from '../offerings/offerings.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './entities/enrollment.entity';
import { OfferingStudentsController } from './offering-students.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), OfferingsModule],
  controllers: [EnrollmentsController, OfferingStudentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
