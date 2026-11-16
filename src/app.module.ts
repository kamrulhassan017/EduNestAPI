import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { validateEnv } from './config/env.validation';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { UsersModule } from './users/users.module';

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
    UsersModule,
    AuthModule, // also registers the global JwtAuthGuard and RolesGuard
    // DepartmentsModule, CoursesModule (Member 3)
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
