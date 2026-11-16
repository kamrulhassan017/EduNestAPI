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

  app.setGlobalPrefix(API_PREFIX);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // serializer runs first so passwordHash is gone before the response is wrapped
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
