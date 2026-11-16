import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { CourseOffering } from './entities/course-offering.entity';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseOffering]),
    CoursesModule,
    UsersModule,
  ],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  // Required by Member 4's EnrollmentsModule and GradesModule.
  exports: [OfferingsService],
})
export class OfferingsModule {}
