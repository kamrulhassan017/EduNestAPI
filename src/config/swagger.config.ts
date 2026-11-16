import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

const DESCRIPTION = `
Course Management System REST API for **CSC4161**.

**How to try it**
1. \`POST /api/v1/auth/login\` with an account (admin: \`admin@edunest.local\`).
2. Copy \`data.accessToken\` from the response.
3. Click **Authorize** (top right), paste the token, click **Authorize**.
4. Every request now runs as that user.

**Roles:** \`admin\` manages everything, \`teacher\` views own offerings and manages grades,
\`student\` enrolls and views own grades. Catalogue changes require an admin.

**Response shape:** \`{ success, message, data, meta }\` (meta is null except on paginated lists).
Errors: \`{ success: false, statusCode, error, message, path, timestamp }\`.
`;

/** Swagger UI at /api/docs; OpenAPI JSON at /api/docs-json. */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('EduNest-API')
    .setDescription(DESCRIPTION)
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Paste the accessToken from POST /api/v1/auth/login',
      },
      'access-token',
    )
    .addTag('Health', 'Is the API and database up?')
    .addTag('Auth', 'Register, log in, current user')
    .addTag('Users', 'Admin user management, change password')
    .addTag('Departments', 'Academic departments')
    .addTag('Courses', 'Course catalogue')
    .addTag('Offerings', 'A course taught in a semester/section by a teacher')
    .addTag('Enrollments', 'Students joining offerings')
    .addTag('Grades', 'Marks, letter grades and transcripts')
    .addTag('Audit', 'Who changed what (admin only)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'EduNest-API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  });
}
