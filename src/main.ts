import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SWAGGER_PATH, setupSwagger } from './config/swagger.config';

export const API_PREFIX = 'api/v1';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // Every route starts with /api/v1
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors();

  // DTO validation for every request body, query and param.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in the DTO
      forbidNonWhitelisted: true, // ...and reject the request if any were sent
      transform: true, // turn payloads into DTO instances, "5" -> 5 for numbers
    }),
  );

  // One error shape for the whole API.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Order matters: the first interceptor wraps the second.
  // ClassSerializerInterceptor runs first on the way out (applies @Exclude, e.g. passwordHash),
  // then TransformInterceptor wraps the result in { success, message, data, meta }.
  app.useGlobalInterceptors(
    new TransformInterceptor(reflector),
    new ClassSerializerInterceptor(reflector),
  );

  setupSwagger(app);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API running at http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Swagger docs at http://localhost:${port}/${SWAGGER_PATH}`);
}

void bootstrap();
