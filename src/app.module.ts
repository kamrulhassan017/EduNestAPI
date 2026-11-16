import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { validateEnv } from './config/env.validation';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { CoursesModule } from './courses/courses.module';
import { DepartmentsModule } from './departments/departments.module';
import { OfferingsModule } from './offerings/offerings.module';

@Module({
  imports: [
    // Reads .env once, validates it, and makes ConfigService available everywhere.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    // Database connection. Feature modules register their entities with
    // TypeOrmModule.forFeature([...]); autoLoadEntities picks them up.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildTypeOrmOptions(process.env),
        autoLoadEntities: true,
      }),
    }),

    // Feature modules are added here as they are merged:
    // AuthModule, UsersModule        (Member 2)
    DepartmentsModule,
    CoursesModule,
    OfferingsModule,
    // EnrollmentsModule, GradesModule  (Member 4)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
