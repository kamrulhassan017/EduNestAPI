# Member 1 (Kamrul, team lead): Core setup

The project skeleton every other module is built on: configuration, database and migrations, the global request pipeline, API docs, and the team workflow.

## What this part provides

| Part | File(s) | What it does |
| --- | --- | --- |
| Project setup | `package.json`, `tsconfig.json`, `nest-cli.json`, `.prettierrc`, `eslint.config.mjs` | NestJS 11 + TypeScript project, build, lint and format scripts |
| Configuration | `src/config/env.validation.ts`, `.env.example` | Reads `.env` once and validates it at start-up; the app refuses to start with a missing or invalid value |
| Database | `src/database/typeorm.config.ts` | One set of PostgreSQL settings shared by the app and the migration CLI |
| Migrations | `src/database/data-source.ts`, `src/database/migrations/`, `npm run migration:*` | `synchronize` is off; tables change only through migration files |
| Bootstrap | `src/main.ts` | `/api/v1` prefix, CORS, global pipe, filter and interceptors, Swagger |
| Validation | `src/main.ts` (global `ValidationPipe`) | Every DTO is checked; unknown fields are rejected; `"5"` becomes `5` |
| Error format | `src/common/filters/all-exceptions.filter.ts` | One error shape for the whole API; duplicate keys become 409; no stack traces sent to clients |
| Response format | `src/common/interceptors/transform.interceptor.ts`, `src/common/decorators/response-message.decorator.ts` | Every success is `{ success, message, data, meta }`; `@ResponseMessage()` sets the message |
| Pagination | `src/common/dto/pagination-query.dto.ts`, `src/common/utils/paginate.ts` | Shared `?page=&limit=` and `meta: { page, limit, total, totalPages }` |
| Request logger | `src/common/middleware/request-logger.middleware.ts` | Logs method, URL, status and time for every request, with an `X-Request-Id` |
| API docs | `src/config/swagger.config.ts` | Swagger UI at `/api/docs` with a JWT **Authorize** button |
| Health check | `src/app.controller.ts`, `src/app.service.ts` | `GET /api/v1/health` reports API and database status |
| Integration | `src/app.module.ts` | Registers every member's module |

## Bonus features owned

Env config, migrations, Swagger UI, middleware (request logger), response manipulation (envelope and serialization).

## Response and error format

```json
{ "success": true, "message": "Created successfully", "data": { "id": 1 }, "meta": null }
```

```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "A record with email 'a@b.com' already exists",
  "path": "/api/v1/users",
  "timestamp": "2026-11-16T08:00:00.000Z"
}
```

## Team workflow

1. `git checkout main` and `git pull origin main`.
2. `git checkout -b <name>/<feature>`, for example `ismail/offering-filters`.
3. Commit small working steps, then `git push -u origin <branch>`.
4. Open a pull request; another member reviews; merge into `main`.
5. Only the team lead edits shared files (`main.ts`, `app.module.ts`, `src/common/`, `src/config/`). Ask in the pull request if you need a change there.

## Running it

```bash
npm install
cp .env.example .env      # then fill in your own values
npm run migration:run
npm run start:dev
```

API: http://localhost:3000/api/v1 · Swagger: http://localhost:3000/api/docs

## Screenshots for the report

- The app starting with `API running at ...` and `Swagger docs at ...`
- `GET /api/v1/health` returning `"database": "up"`
- A 400 validation error showing the list of field messages
- The request logger lines in the terminal
- `npm run migration:run` applying the migrations
