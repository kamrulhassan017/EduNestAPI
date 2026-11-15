# EduNest-API

A Course Management System REST API for CSC4161 (Advance Programming in Web Technology), built with NestJS, TypeORM and PostgreSQL.

Admins manage departments, courses and course offerings. Instructors see their offerings and enter grades. Students browse courses, enroll and see their grades. Enrolling runs inside a database transaction that creates the enrollment and reduces the available seats together.

## Tech stack

| Concern | Tool |
| --- | --- |
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL |
| ORM and migrations | TypeORM |
| Validation | class-validator, class-transformer |
| Configuration | @nestjs/config (validated at start-up) |
| API docs | @nestjs/swagger |

## Getting started

### 1. Prerequisites

- Node.js 20.12 or newer
- PostgreSQL 14 or newer
- Git

### 2. Install

```bash
git clone https://github.com/kamrulhassan017/EduNestAPI.git
cd EduNestAPI
npm install
```

### 3. Create the database

```bash
psql -U postgres
```

```sql
CREATE USER edunest_user WITH PASSWORD 'change_me';
CREATE DATABASE edunest_db OWNER edunest_user;
GRANT ALL PRIVILEGES ON DATABASE edunest_db TO edunest_user;
```

Type `\q` to leave `psql`.

### 4. Configure

Copy the example file and put your own values in it:

```bash
cp .env.example .env
```

| Variable | Meaning |
| --- | --- |
| `PORT` | Port the API listens on (default 3000) |
| `DB_HOST`, `DB_PORT` | PostgreSQL address |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Database login and name |
| `DB_LOGGING` | `true` to print SQL queries |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime |
| `MAIL_*` | SMTP settings for the mailer (Mailtrap while testing) |

The app checks these values when it starts and stops with a clear message if one is missing or wrong. `.env` is in `.gitignore`; never commit it.

### 5. Build the schema and run

```bash
npm run migration:run
npm run start:dev
```

| URL | What it is |
| --- | --- |
| http://localhost:3000/api/v1/health | API and database status |
| http://localhost:3000/api/docs | Swagger UI |

## Migrations

`synchronize` is off, so tables change only through migration files in `src/database/migrations/`.

| Task | Command |
| --- | --- |
| Generate a migration from entity changes | `npm run migration:generate -- src/database/migrations/AddCourses` |
| Create an empty migration | `npm run migration:create -- src/database/migrations/SeedRoles` |
| Apply pending migrations | `npm run migration:run` |
| Undo the last migration | `npm run migration:revert` |
| List applied and pending migrations | `npm run migration:show` |

Pull `main` before generating a migration so two people's migrations don't clash.

## Response format

Every successful response:

```json
{
  "success": true,
  "message": "Created successfully",
  "data": { "id": 1, "code": "CSC4161" },
  "meta": null
}
```

List endpoints fill `meta`:

```json
"meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
```

Every error:

```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "A record with code 'CSC4161' already exists",
  "path": "/api/v1/courses",
  "timestamp": "2026-11-15T14:30:00.000Z"
}
```

| Status | When |
| --- | --- |
| 200 / 201 | Success / created |
| 400 | DTO validation failed (message lists each failing field) |
| 401 | Missing, invalid or expired token |
| 403 | Logged in, but the role is not allowed |
| 404 | Record not found |
| 409 | Duplicate unique value, linked record, or no seats left |
| 500 | Unexpected error (details go to the server log only) |

## Project structure

```
src/
  main.ts                    bootstrap: prefix, ValidationPipe, filter, interceptors, Swagger
  app.module.ts              ConfigModule, TypeORM, request logger, feature modules
  app.controller.ts          GET /api/v1/health
  config/
    env.validation.ts        rules for every .env value
    swagger.config.ts        Swagger UI at /api/docs with bearer auth
  database/
    typeorm.config.ts        shared DB settings (app + CLI)
    data-source.ts           data source for the migration CLI
    migrations/
  common/
    decorators/              @ResponseMessage (auth decorators added by the Auth module)
    dto/                     PaginationQueryDto
    filters/                 AllExceptionsFilter
    interceptors/            TransformInterceptor (response envelope)
    interfaces/              response types
    middleware/              RequestLoggerMiddleware
    utils/                   paginate()
  auth/  users/              Member 2
  departments/  courses/     Member 3
  enrollments/  grades/      Member 4
```

## Building a feature module

1. `nest g resource <name> --no-spec` and choose REST API.
2. Put the entity in `<name>/entities/`, with separate `create-*.dto.ts` and `update-*.dto.ts` in `<name>/dto/`.
3. Register the entity with `TypeOrmModule.forFeature([Entity])` in the module.
4. For lists, take `@Query() query: PaginationQueryDto` and return `paginate(items, total, query.page, query.limit)`.
5. Throw Nest's built-in exceptions (`NotFoundException`, `ConflictException`, ...). Duplicate keys become 409 automatically.
6. Add `@ApiTags`, `@ApiProperty` and `@ApiBearerAuth('access-token')` as you go.
7. Generate a migration, run `npm run lint` and `npm run build`, then open a pull request.

## Team

| Member | Area |
| --- | --- |
| Member 1 (Md. Kamrul Hassan Rabby, team lead) | Core setup, configuration, database and migrations, Swagger, middleware, response and error format |
| Member 2 | Auth and users |
| Member 3 | Departments and courses |
| Member 4 | Enrollments and grades |
