import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { validateEnv } from './config/env.validation';
import { CoursesModule } from './courses/courses.module';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { DepartmentsModule } from './departments/departments.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { GradesModule } from './grades/grades.module';
import { OfferingsModule } from './offerings/offerings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildTypeOrmOptions(process.env),
        autoLoadEntities: true,
      }),
    }),

    UsersModule,
    AuthModule,
    DepartmentsModule,
    CoursesModule,
    OfferingsModule,
    AuditModule,
    EnrollmentsModule,
    GradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
