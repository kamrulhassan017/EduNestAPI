# Ismail — Member 3 handoff

Source: `ismail.pdf` (all **40 pages** reviewed). This branch implements the
Member 3 catalogue and Swagger work, not Member 2's authentication or Member 4's
student workflows.

## Current status

| Guide section                                | Status                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PR 1 — Swagger toolkit (pages 9–13)          | Implemented: envelope/error decorators, pagination/error models, Swagger configuration                                                |
| PR 2 — Departments and courses (pages 14–25) | Implemented: all 10 routes, DTOs, entities, services, module exports, migration                                                       |
| PR 3 — Course offerings (pages 26–33)        | Implemented: all 6 routes, teacher validation contract, DTOs/entity/service, module export, migration; PR 3 course additions included |
| PR 4 — Swagger polish (pages 34–36)          | All Member 3 routes documented. Other owners' controllers do not exist yet; exact remaining checklist is in `swagger-polish.md`       |
| Demo / review / setup (pages 3–7, 37–40)     | Instructions and complete demo sequence below; GitHub approvals, merges and collaborator setup are human/team steps                   |

**Production integration is blocked on Member 2's missing Auth/Users PR.** The
checkout and remote main were both `f51cddf755aaf1f8e467e94ca2028d772439a0af` when
checked. They contained Member 1's core only. The application does not currently
build/start without Member 2's imports. No permissive production auth stubs were
created to hide that. Do not deploy the new controllers without the global JWT
and role guards: `@Roles` alone is metadata, not enforcement.

Work is on local branch `courses/member-3`. Nothing has been committed, pushed,
approved, or merged. The prior `tsconfig.json` fix was retained.

## Tests and what they prove

Latest verification: **37 tests passed, 0 failed, 0 skipped** — 17 validation/
Swagger tests and 20 real PostgreSQL/HTTP integration tests with Member 2 fixtures.
`git diff --check` passed. Temporary test containers were removed. VS Code reports
no diagnostics in `tsconfig.json` or the shared envelope decorator; missing Member
2 contracts remain integration blockers.

Install the existing lockfile dependencies, then run:

```sh
npm ci
node --test test/member3-ismail/validation.test.cjs test/member3-ismail/swagger.test.cjs
node test/member3-ismail/run-postgres.cjs
```

The integration runner needs Docker. It starts a **new PostgreSQL 17** container
on a random localhost-only port, generates a disposable password, and removes the
container/database after the run. It does not read `.env`, connect to your real
DB, or delete other containers. It uses the existing `postgres:17-alpine` image
(or Docker downloads that image if unavailable). No npm packages were added.

Coverage:

- Real Nest HTTP routing, validation/transformation, serialization, success
  envelopes, shared exception filter and TypeORM queries against PostgreSQL.
- All 18 catalogue acceptance cases from pages 25 and 33, including lower-case
  normalization, duplicates, missing department/teacher, invalid credits,
  filtering/pagination, related entities, role restrictions and malformed IDs.
- All 16 CRUD/list/mine routes, including PATCH and unreferenced DELETE paths.
- Updates preserve omitted fields; required columns reject null; nullable course
  descriptions can be cleared.
- `mine` overrides forged teacher IDs and keeps correct page offsets.
- Duplicate concurrent offering creates produce exactly one 201 and one 409.
- Department/course deletion restrictions and an external enrollment-shaped FK
  demonstrate offering deletion returns 409 when referenced.
- `OfferingsService` is injectable and `findOne(id)` returns the relations and
  fields expected by Member 4.
- Both migrations apply, revert, and reapply on PostgreSQL; there is no TypeORM
  schema drift; Member 2's fixture users remain untouched.
- Swagger JSON includes all 16 operations, named security, schemas, summaries,
  pagination, null responses, validation examples/limits and error envelopes.
  Swagger HTML/configuration are served. UI appearance was not manually tested
  in a browser.

### Important test boundary

`test/member3-ismail/register-fixtures.cjs` redirects **only six Member 2 contracts** to
`fixture-contracts.cjs` inside the test process. The fixtures supply a minimal
User table, UsersService and fixed test identities/role guard. Your actual
controllers, services, DTOs, entities, modules and migrations are tested.

These tests do **not** verify Member 2's real JWT signing/verification, passwords,
account activation, global guards, seed, registration, or final User schema.
They do not test Member 4's enrollment transactions, grades, audit or transcript.
Those must be tested again after the real modules merge. Test fixtures are never
imported from `src/` and must never be used to start production.

VS Code diagnostics identify the missing Member 2 imports and consequent type/
lint errors. A clean production build/lint is not claimed while they are absent.
Once merged, run the guide's `npm run lint` and `npm run build` and the full Swagger
acceptance/demo sequence. Do not suppress missing-import errors or copy the test
fixtures into `src/users` or `src/auth`.

## Exact contracts for teammates

### Member 2: preserve these paths/exports

| Path                                              | Required contract                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/common/decorators/roles.decorator.ts`        | `Roles(...roles)` compatible with your global role guard                                |
| `src/common/decorators/current-user.decorator.ts` | `CurrentUser('id')` extracts the authenticated numeric user ID                          |
| `src/users/enums/role.enum.ts`                    | `Role.ADMIN`, `Role.TEACHER`, `Role.STUDENT` with admin/teacher/student values          |
| `src/users/entities/user.entity.ts`               | `User` mapped to `users`, integer primary key `id`                                      |
| `src/users/users.service.ts`                      | `UsersService.findOneWithRole(id, role)`: return user; 404 if absent; 400 if wrong role |
| `src/users/users.module.ts`                       | `UsersModule` exports `UsersService`                                                    |

Register your AuthModule/global JWT and role guards as your guide specifies.
User password/hash properties must be excluded from serialization and Swagger
(e.g. `select: false`, `@Exclude`, `@ApiHideProperty`). Offering responses load
teacher relations, so this is important even when they are fetched by another
module. Member 3 has not modified any of your folders, dependencies, role logic,
user schema, or seed scripts.

### Member 4: these are ready to consume after prerequisite merges

- Import `OfferingsModule` from `src/offerings/offerings.module.ts`.
- Inject exported `OfferingsService`; call `findOne(id)` (404 when missing).
- Import `CourseOffering` from `src/offerings/entities/course-offering.entity.ts`.
- Import `Semester` from `src/offerings/enums/semester.enum.ts` (spring/summer/fall).
- Offering fields: `id`, `courseId`, `teacherId`, `semester`, `year`, `section`,
  `capacity`, `createdAt`, `updatedAt`; relations: `course`, `teacher`.
- `findOne` includes `course.department` and `teacher`.
- Course fields include `code`, `title`, integer `credits`, `description`,
  `departmentId`; all names match both guides.
- Enroll into offerings, not courses. Your FK to course_offerings must remain
  `ON DELETE RESTRICT` so reference protection works without importing your
  module into Member 3's modules. This also protects dropped enrollment history.
- Do not rename these service methods/entities or change the shared pagination
  helper to match the PDF pseudocode. See the actual signature below.

**Joint integration decision:** the PDF permits admins to change offering
capacity/course/term after creation, without defining enrollment-aware update
rules. That behavior is retained. Once enrollments exist, coordinate preventing
capacity reductions below the active student count and course/term changes that
would violate enrollment rules, under the same offering row lock. Member 3 does
not invent a dependency on Member 4's not-yet-existing tables or change their
transaction policy unilaterally. Do not change offering capacity/term during the
seat-limit demo until this policy is agreed/tested.

## Adaptations required by the actual repository

1. **Prefix:** Member 1's real prefix is `/api/v1`, not the PDF's `/api`.
   It was preserved. Swagger stays `/api/docs`, JSON `/api/docs-json`.
2. **Pagination:** the real helper is `paginate(items, total, page, limit)`.
   Services use `findAndCount` first and preserve the shared envelope/meta shape.
3. **Meta:** the shared interceptor always includes `meta`, null on non-lists.
   Swagger documents that actual shape rather than an optional meta property.
4. **Security scheme:** keep `@ApiBearerAuth('access-token')`, matching existing
   Swagger configuration. The PDF's unnamed decorator defaults to `bearer`, which
   would not match this repository. During PR 4, align teammates' decorators too.
5. **Swagger plugin:** contrary to the PDF, `nest-cli.json` does not enable it.
   Explicit property decorators on Member 3 entities/DTOs provide schemas without
   changing shared compiler/plugin configuration. Lazy relation schemas handle
   circular Department/Course/Offering references. Ask other owners to document
   their fields explicitly or agree on the plugin before final Swagger review.
6. **Public imports:** Swagger schema types come from `@nestjs/swagger`, not its
   private `dist/` path, which the installed package's exports disallow under the
   existing Node16 resolution setting.
7. **Mine pagination:** `Object.assign(new OfferingQueryDto(), query, {teacherId})`
   preserves the inherited `skip` getter; the PDF's plain object spread loses it.
8. **PATCH nulls:** `PartialType(..., {skipNullProperties: false})` keeps fields
   optional but does not accept null for required DB columns. The nullable
   description remains clearable. All constraints/examples are documented.
9. `main.ts` already calls `setupSwagger(app)`; no duplicate Swagger setup or
   unnecessary bootstrap edit was made. Health controller is unchanged as directed.

## Migrations and integration order

- `1794780000000-CreateDepartmentsAndCourses.ts`: departments, courses, unique
  names/codes and restrictive department FK.
- `1794780001000-CreateCourseOfferings.ts`: semester enum, course_offerings,
  `UQ_offering_course_term_section`, restrictive course/user FKs.

SQL was obtained from TypeORM's PostgreSQL schema builder using the actual Member
3 entities plus a **test-only User fixture**, separated into the guide's two
migrations, and verified by applying/reverting/reapplying and checking no schema
drift. Only Member 3 tables are created/altered in production migration files.
No production users table migration is included.

**Before first merge/application**, coordinate timestamps with the lead:
Member 2's Users migration must run before CreateCourseOfferings, and Member 4's
Enrollments migration must run after it, including on an entirely empty DB.
If necessary renumber these unpublished migrations (filename, class and `name`
together) before sharing, or regenerate after updating main/DB. Never edit a
migration already merged/applied by the team. Recheck against the real User
entity; do not accept generated diffs that alter teammates' tables.

Keep these dependency directions:

```text
DepartmentsModule exports DepartmentsService
CoursesModule -> DepartmentsModule; exports CoursesService
OfferingsModule -> CoursesModule + UsersModule; exports OfferingsService
EnrollmentsModule / GradesModule -> OfferingsModule (Member 4)
```

No Member 4 imports are introduced here. All three Member 3 modules are registered
in `app.module.ts`; when merging that shared list, keep every member's modules.

## Setup and PR workflow from the guide

1. Install Node 20+, PostgreSQL 14+, Git and VS Code (ESLint/Prettier recommended).
   Set your own Git identity and accept the repository collaborator invitation.
2. Merge Member 2 PR 1 before enabling catalogue routes. Preserve this local work,
   fetch/merge updated main, install its dependencies, and apply prerequisite DB
   migrations. Do not replace other members' files with these test fixtures.
3. Copy `.env.example` to `.env`; supply your own DB password/name and other required
   values. Create the configured database (`edunest` in the PDF, `edunest_db` in
   the existing README example). Never commit `.env` or tokens.
4. Run `npm run migration:run`, `npm run start:dev`; check
   `http://localhost:3000/api/v1/health` and `http://localhost:3000/api/docs`.
5. After Member 2's seed/user-management PR exists, run its seed command using your
   private SEED_ADMIN_PASSWORD, then create a teacher and student accounts.
6. Log in through Swagger, copy `data.accessToken` without quotes, and Authorize.
   Switch users by logging in again and replacing the token.
7. Run all PDF cases and the tests above, then `npm run lint` and `npm run build`.
   Inspect lint edits so other owners' formatting is not accidentally committed.
8. Split/submit work in the prescribed PR order (this local preparation branch is
   combined, not an already-submitted set of PRs):

   | Branch                        | Commit / PR title                                                  | Wait for                        |
   | ----------------------------- | ------------------------------------------------------------------ | ------------------------------- |
   | `courses/swagger-toolkit`     | `feat(swagger): add envelope/error decorators and tidy Swagger UI` | Nothing; ask Member 1 to review |
   | `courses/departments-courses` | `feat(courses): add departments and courses CRUD`                  | Member 2 PR 1 and toolkit       |
   | `courses/offerings`           | `feat(courses): add course offerings`                              | Departments/courses             |
   | `courses/swagger-polish`      | `docs(swagger): document every endpoint`                           | All teammates' PRs              |

   For PR 2 alone, hold the CourseOffering import/inverse relation, offering
   repository/count check and module registration until PR 3, as the PDF states.

9. Inspect `git status`; exclude `.env`, node_modules and dist. Commit/push only the
   feature branch, open a PR to main describing endpoints/testing, and request
   review. Do not push directly to main or alter already-shared migrations.
10. After teammate approval, squash/merge and delete the remote branch; update main
    locally and delete the merged local branch. If main moved, merge it into the
    feature branch and resolve app-module conflicts by retaining all imports.
11. Tell Member 4 when offerings is merged. Review teammates by reading their diff
    and trying success/error cases, then approve or leave specific feedback.
    PR 4 must have Member 2 and Member 4 review changes to their own controllers.

## Full presentation sequence (guide page 37)

Use `/api/v1` for the paths below. Run on a fresh test database after everyone merges:

1. `GET /health`: status ok, database up.
2. Login as admin and Authorize.
3. Create department `{ "name": "Computer Science and Engineering", "code": "cse" }`.
   Create course `{ "code": "csc4161", "title": "Advanced Programming in Web Technology",
"credits": 3, "departmentId": <id> }`. Create a teacher through Users. Create
   offering `{ "courseId": <id>, "teacherId": <teacher>, "semester": "fall",
"year": 2026, "section": "a", "capacity": 2 }`.
4. Show credits 9 -> 400 and a duplicate -> 409. Show uppercased codes/section,
   related department/teacher, list search/filters and pagination.
5. Register two students. Login as S1, enroll in the offering, show `/enrollments/mine`.
6. S2 enrolls. Register S3 and attempt enrollment -> 409 full (Member 4 transaction).
7. Login as teacher, show `/offerings/mine`; PUT `/enrollments/<id>/grade`
   with `{ "marks": 82 }` -> A+ and numeric gradePoint 4.
8. Login as S1; `/grades/mine` -> transcript/CGPA.
9. As student POST `/courses` -> 403.
10. As admin GET `/audit` -> change trail with actors.

Also run the exact page 25 / 33 negative cases: department 99 missing -> 404;
GET course search -> meta; department detail -> courses; delete a populated
department -> 409; student GET catalogue -> 200; student POST -> 403; teacherId
pointing to a student -> 400; admin `/offerings/mine` -> 403; delete a course with
an offering -> 409; `/offerings/abc` -> 400. The automated fixture-backed tests
exercise all these scenarios with isolated IDs rather than assuming ID 1/99.

## Troubleshooting (guide page 40)

- DB password/database errors: check `.env` and create the configured database.
- Missing relation: run migrations in prerequisite order.
- Start-up validation: compare `.env` to `.env.example`.
- No schema diff: check `.entity.ts` suffix and saved files. Unexpected diff:
  update main and DB first; do not change a teammate's table accidentally.
- Missing auth package after pulling: install the updated manifest dependencies,
  not arbitrary new packages. Faculty package restrictions still apply.
- 400 unknown field: send only DTO properties. 401: use a fresh authorized token.
  403: wrong role/ownership. Port 3000 busy: stop old server or change PORT.
- Windows bcrypt: retry installation / install Visual Studio C++ Build Tools.
- Git password prompt: use your own PAT or browser sign-in, never hard-code tokens.
- If blocked, send the lead the exact error and affected branch, not credentials.
