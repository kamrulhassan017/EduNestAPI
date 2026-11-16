# Dhrubo — Member 4 implementation and handoff

Source: **all 37 pages of `dhrubo.pdf`**. The PDF and Member 3's source/tests were
left unchanged. Work is on `enrollments/member-4`, based on the saved Member 3
commit `d3fe603`. This is a **stacked local preparation branch**, not three submitted
or approved PRs. No commits/pushes/merges were performed for this Member 4 work.

## Completion and prerequisites

| PDF pages | Requirement                                                                                                  | Status / location                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1–3       | Scope, package restrictions, build order                                                                     | Reviewed; no packages added; Member 2 remains a prerequisite                                      |
| 4–7       | Setup, migrations, branch/PR/review workflow                                                                 | Steps below; no private credentials or global Git identity changed                                |
| 8–9       | Own audit/enrollment/grade tables and exact teammate contracts                                               | Implemented in the specified folders; only existing production file edited is `src/app.module.ts` |
| 10–15     | Audit log, interceptor, filters, indexes, global module, admin endpoint                                      | Complete in `src/audit/` plus CreateAuditLogs migration                                           |
| 16–25     | Six enrollment endpoints, transaction/seat limit, same-course rule, reactivation, class list, access control | Complete in `src/enrollments/` plus CreateEnrollments migration                                   |
| 26–33     | Three grade endpoints, scale, decimal conversion, audit details, transcript/CGPA, graded-drop restriction    | Complete in `src/grades/` plus CreateGrades migration; PR 3 enrollment additions included         |
| 34        | Swagger review and transaction explanation                                                                   | All four owned controllers already use Member 3's toolkit; explanation below                      |
| 35–37     | Teammate review, Swagger login/seed steps, troubleshooting                                                   | Checklist below; real JWT login/seed depends on Member 2                                          |

**Not yet production-integrated:** Member 2's Auth/Users modules, decorators,
Role/User exports and AuthUser interface are still missing from this checkout.
VS Code reports these unresolved imports (and a consequent unresolved User type
warning), so a clean full application build/lint is **not claimed**. The new
controllers depend on Member 2's real global JWT and role guards. Do not deploy
without them: `@Roles` is metadata, not authorization by itself.

The code can be prepared and tested now, but the PDF's requirement to wait for
prerequisite PRs to merge is not satisfied by local test fixtures. Real login,
seed, password handling, account activation, full-stack Swagger/browser demo,
team review, PR approvals and merges remain integration/human steps. Nothing here
creates alternate production Auth/Users implementations.

## What is implemented

All paths below use the existing **`/api/v1`** prefix, not the PDF's `/api`.
Swagger remains `/api/docs` (JSON `/api/docs-json`).

| Method | Route                     | Access                                                |
| ------ | ------------------------- | ----------------------------------------------------- |
| GET    | `/audit`                  | Admin; entity/action/actorId filters and pagination   |
| POST   | `/enrollments`            | Student; `{ "offeringId": 1 }`, identity from token   |
| GET    | `/enrollments/mine`       | Student's own history, offering/course/teacher/grade  |
| GET    | `/enrollments`            | Admin; offeringId/studentId/status filters            |
| GET    | `/enrollments/:id`        | Owner student, assigned teacher, admin                |
| PATCH  | `/enrollments/:id/drop`   | Owner student or admin; no dropping a graded row      |
| GET    | `/offerings/:id/students` | Assigned teacher or admin; active students and grades |
| PUT    | `/enrollments/:id/grade`  | Assigned teacher or admin; `{ "marks": 82.5 }`        |
| GET    | `/grades/mine`            | Student's own transcript and CGPA                     |
| GET    | `/offerings/:id/grades`   | Assigned teacher or admin; array with student details |

Audit logs successful POST/PUT/PATCH/DELETE automatically via a global
interceptor; failures/reads/Auth are skipped. Grades is skipped by the interceptor
because GradesService records GRADE_GIVEN/GRADE_CHANGED, enrollmentId, old/new
marks and letter itself. No bodies/passwords/authorization headers are stored.
The trail deliberately has no foreign keys. It survives actor/entity deletion.
Audit writes are best effort: DB errors are logged, never fail the business
request. Consequently this design is **not** a guaranteed durable transactional
outbox; an audit outage/process crash can lose a trail entry, as in the PDF.

The grade scale is exactly the guide's UGC table:

| Marks  | Letter | Point |
| ------ | ------ | ----- |
| 80–100 | A+     | 4.00  |
| 75–<80 | A      | 3.75  |
| 70–<75 | A-     | 3.50  |
| 65–<70 | B+     | 3.25  |
| 60–<65 | B      | 3.00  |
| 55–<60 | B-     | 2.75  |
| 50–<55 | C+     | 2.50  |
| 45–<50 | C      | 2.25  |
| 40–<45 | D      | 2.00  |
| 0–<40  | F      | 0.00  |

Marks accept at most two decimal places. Stored numeric marks/points serialize
as **numbers**, not strings. CGPA = sum(point × credits) / sum(credits), rounded
to two decimals; no graded credits yields null. Only graded, enrolled rows count;
F credits count in the denominator. No unrequested retake/replacement policy was
invented: the guide includes each graded enrollment.

## Repository adaptations and correctness fixes

1. Preserve Member 1's `/api/v1`, envelopes, filters and bootstrap. Success meta
   is always present here, null on non-paginated responses.
2. The actual shared helper is `paginate(items, total, page, limit)`, **not** the
   repository-taking helper shown in the PDF. Each list uses `findAndCount`
   with DTO skip/take, then the existing helper. No shared helper was changed.
3. Swagger uses the existing named `access-token` security scheme. Explicit
   entity/DTO property metadata is included because the project's Swagger CLI
   plugin is not enabled. All four controllers have summaries/envelopes/errors,
   completing their applicable Member 3 PR 4 decorations ahead of review.
4. **Student row lock before offering row lock:** the PDF's offering lock prevents
   two people taking the last seat, but alone cannot stop one student enrolling
   into two different sections concurrently. A student-row `FOR UPDATE` serializes
   that student's requests first. Then the offering-row `FOR UPDATE` protects seat
   counting. All checks/reactivation/insertion share the same transaction.
5. **Enrollment row lock for both drop and grade:** the PDF checks outside a
   transaction could allow a grade and drop to succeed simultaneously. Both now
   lock the same enrollment row, check state/ownership and write inside a
   transaction. Concurrent first grades also serialize into one insert + one
   update, preserving the accurate old marks value. Relations are loaded after
   locking the unjoined row (avoids PostgreSQL locking nullable outer joins).
6. Grade audits run only after commit, outside the business transaction, preserving
   the PDF's audit-failure behavior. No audit row for rolled-back grade operations.
7. Service ownership checks fail closed for unexpected roles as well as the
   controller restrictions. IDs in URLs use ParseIntPipe. `mine` is before `:id`.
8. All Member 3 names/contracts are preserved. No changes to their entities,
   controllers, services, migrations, fixture files or package/config files.

### Viva: why locks?

Without a lock, two transactions can both read "one seat available" and both
insert. The first transaction here locks the offering until commit/rollback;
the second waits and then counts the committed seats. A rule exception rolls back
all its writes and frees the locks. The additional student lock covers different
sections; the shared enrollment lock covers drop/grade conflicts. Tests assert
actual PostgreSQL START TRANSACTION, FOR UPDATE, COMMIT and ROLLBACK queries.
For a manual demonstration, set `DB_LOGGING=true` in your private `.env`, restart,
and show one successful enrollment and one full/duplicate failure.

**Cross-team update policy still needs agreement:** the Member 3 PDF permits
admins to change course/term/capacity after creation. Member 4's enrollment writes
are safe under concurrent enrollment/drop/grade, but cannot prevent another
module reducing capacity below already-enrolled students or changing a course/
term into a conflict. Likewise editing course credits changes the live transcript
calculation, as specified in the guide. Coordinate enrollment-aware update rules
with Member 3/lead; do not silently modify their files. Do not mutate these values
during the seat-limit demo. The immutable-history policy is outside this PDF.

## Migrations

Added only:

- `1794780002000-CreateAuditLogs.ts`: audit_logs; actor index and entity/entityId
  index, **no FKs**.
- `1794780003000-CreateEnrollments.ts`: enrollments_status_enum; enrollments;
  UQ_enrollment_student_offering; restrictive FKs to users and course_offerings.
- `1794780004000-CreateGrades.ts`: grades; numeric(5,2) marks, numeric(3,2)
  gradePoint; one-to-one enrollment uniqueness; CASCADE enrollment FK and RESTRICT
  gradedBy user FK. It does not alter enrollments.

SQL came from TypeORM's schema builder against disposable PostgreSQL with the
real Member 3/4 entities and a **test User**. Migrations were split into the three
required units and verified forward/backward/forward with **zero schema drift**.
Undo removes only owned tables/types/indexes; users/catalogue remain.

Before production merge, check the real User entity and migration timestamps:
Users must precede CourseOfferings, and both must precede Enrollments; Grades
follows Enrollments. These timestamps follow the existing Member 3 migrations.
Coordinate fresh-db ordering with the lead. If renumbering an **unpublished**
migration, change filename, class and name together. Never edit a migration
already shared/applied/on main; create a new corrective migration instead.

## Tests (verified)

Cross-check: all **21 feature-file paths**, all **10 endpoints**, all **three
migrations**, and all three AppModule registrations listed in the PDF are present.
The 31 numbered PDF acceptance cases are mapped below, including explicit limits
for missing Auth/Users integration. A second Member 4 test run passed after fixing
IDE-reported unnecessary assertions and adding definite-assignment declarations
for ORM/DTO-populated fields (without weakening shared compiler settings).

**81 passing tests, 0 failed, 0 skipped:**

- Member 4: **21 unit + 23 real PostgreSQL/HTTP integration** tests.
- Member 3 regression: **17 validation/Swagger + 20 PostgreSQL/HTTP** tests.
- `git diff --check` passed; temporary test containers were removed.
- IDE diagnostics checked: missing Member 2 contracts remain; no claim of a clean
  full build until those modules land. No lint autofix was run over teammates' files.

Run from **EduNestAPI**, not its parent repository:

```sh
npm ci
node --test test/member4-dhrubo/unit.test.cjs
node test/member4-dhrubo/run-postgres.cjs

# Existing Member 3 regression suite
node --test test/member3-ismail/validation.test.cjs test/member3-ismail/swagger.test.cjs
node test/member3-ismail/run-postgres.cjs
```

Docker is required for PostgreSQL suites. Each runner creates its own random-port,
loopback-only PostgreSQL 17 container with a random disposable password and removes
it afterward. No `.env` or existing database is used. Dependencies are from the
existing lockfile; no package changes were needed.

### Honest boundary of these tests

Member 4 reuses Member 3's **test-only** User/UsersService/UsersModule, Role and
parameter/role decorator contracts through the existing require hook. A local
fixture guard provides admin (1), teacher (2), another teacher (4), students
(3, 5–12), using fixed `fixture-<id>` tokens. These are **not JWTs**. All actual
Member 3/4 services/modules/entities/controllers, validation, serialization,
Swagger and migrations run against real Nest HTTP + PostgreSQL. AuthUser imports
are type-only; no fake interface/file was placed in production folders.

Auth register/login/seed/real JWT verification, active-account enforcement,
Member 2's final User serialization/schema and final production app bootstrap
remain to be tested with their implementation. The PDF audit example uses
POST users, absent here: HTTP tests instead exercise real catalogue writes, and
unit tests verify a UsersController produces USERS_CREATE correctly. Auth skip
is unit-tested; not a claim of having run a missing login/register endpoint.
Swagger JSON/HTML were checked programmatically, not manually in a browser.

### Every PDF acceptance case is accounted for

| PDF cases        | Automated coverage                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Audit 1–2        | Actual catalogue create/actor/ID/path + UsersController interceptor test; actual users create waits for Member 2 |
| Audit 3          | Duplicate/forbidden/read produce no audit rows                                                                   |
| Audit 4          | Combined entity/action/actorId filters and pagination                                                            |
| Audit 5          | Student/teacher forbidden, anonymous unauthorized                                                                |
| Audit 6          | Auth controller excluded in interceptor unit test; real auth pending                                             |
| Enrollment 1–4   | S1/S2 success, duplicate 409, S3 full 409; no failed insert                                                      |
| Enrollment 5–6   | Mine includes course/teacher, another student cannot view                                                        |
| Enrollment 7–9   | Drop timestamp/seat freed/full prevents reactivation; same row reactivated after seat free                       |
| Enrollment 10–12 | Active-only class list, other teacher forbidden, admin dropped filter/meta                                       |
| Enrollment 13–14 | Offering deletion restricted even for dropped history; teacher cannot enroll                                     |
| Grade 1–2        | 82 -> A+/4, 67.5 -> B+/3.25, same grade ID, numeric outputs                                                      |
| Grade 3–6        | Invalid marks/precision, other teacher/student, dropped row rejected                                             |
| Grade 7          | Isolated transcript/credits/CGPA, including empty/null and weighted rounding                                     |
| Grade 8–9        | Both admin/student cannot drop graded enrollment; teacher list includes students                                 |
| Grade 10–11      | GIVEN/CHANGED old/new marks, no duplicate generic audit; mine includes grade                                     |

Additional tests cover real concurrent last-seat requests, concurrent different
sections for one student, duplicate creation/reactivation, concurrent drops,
concurrent grading and grading-vs-dropping, no secret fields, validation/spoofing,
all ten unauthenticated endpoints, real unique/FK/cascade constraints, audit DB
failure not failing business changes, deletion-surviving logs, all scale boundaries
and all ten Swagger operations.

## Remaining integration steps (do not skip)

1. Merge Member 2 PR 1 (Users/Auth), then Member 3 PR 3 (Offerings), into main in
   the specified order. This work is based on Member 3's local feature commit;
   do not overwrite or force-push that branch. Rebase/merge this feature branch
   onto reviewed prerequisites with the team before opening the final PRs.
2. Check these exact Member 2 paths/exports:
   - `src/users/entities/user.entity.ts`: User, users table, numeric id.
   - `src/users/enums/role.enum.ts`: ADMIN/TEACHER/STUDENT.
   - `src/users/users.service.ts`: findOneWithRole(id, role) for OfferingsService.
   - `src/users/users.module.ts`: exports UsersService.
   - `src/common/decorators/roles.decorator.ts`: compatible with global role guard.
   - `src/common/decorators/current-user.decorator.ts`: entire user or selected id.
   - `src/common/interfaces/auth-user.interface.ts`: AuthUser with numeric id/Role.
     Wire Member 2's real AuthModule/global guards. Their user entity must hide
     password/hash in queries, serialization and Swagger, including nested relations.
3. Preserve OfferingsModule's exported OfferingsService.findOne(id) and entities.
   AppModule must keep all members' modules plus AuditModule, EnrollmentsModule,
   GradesModule. AuditModule is global and exports AuditService; Grades can inject
   it without importing the module again.
4. Verify clean-database migration order and real User schema. Run migrations.
5. Run the production `npm run build` and `npm run lint` after the missing code is
   present; inspect lint changes to avoid committing teammates' formatting.
6. Re-run all acceptance cases with **real JWT tokens**, including ownership and
   anonymous failures. Retest password/hash exclusion with the actual User entity.
7. Member 3/owners review the Swagger decorations on the four owned controllers;
   Auth/Users Swagger polish remains dependent on their missing controllers.
8. Submit/review/merge the required PRs below; no main push, automatic approval,
   collaborator invitation, or remote branch deletion was done by this task.

## Setup, Swagger demo and PR workflow (pages 4–7, 35–37)

- Tools: Node 20+ (LTS recommended), PostgreSQL 14+, Git, VS Code with optional
  ESLint/Prettier extensions. The existing checkout/remote is **EduNestAPI**,
  `https://github.com/kamrulhassan017/EduNestAPI.git` (the PDF spelling differs).
- Accept the collaborator invitation; use your own Git name/email. Don't change
  another person's attribution or use their credentials.
- `cd EduNestAPI`, install lockfile dependencies, `cp .env.example .env`, set your
  own DB credentials and required variables. Create the configured DB (`edunest`
  in the guide; follow your actual DB_NAME). Do not commit .env.
- After prerequisites: `npm run migration:run`, `npm run start:dev`; verify
  `/api/v1/health` and `/api/docs`. Stop with Ctrl+C.
- After Member 2 PR 2: use its `npm run seed`, admin@edunest.local and your private
  SEED_ADMIN_PASSWORD; admin creates teachers, register creates students.
- Swagger login: Auth -> POST `/api/v1/auth/login` -> Try it out; copy
  `data.accessToken` without quotes -> Authorize -> paste token. Repeat after
  changing identities. Never use fixture tokens on production.
- Prepare a course/teacher/offering with capacity 2 and S1/S2/S3. Run all PDF cases
  above: S1/S2 enroll, S3 full, drop/re-enroll, ownership failures, teacher grade
  82 then 67.5, transcript, forbidden graded drop and admin Grade audit trail.
- Explain and optionally show DB_LOGGING transaction statements during the demo.

The guide's separate PRs (this branch currently prepares all three together):

| Branch                    | Commit / PR title                                               | Wait for                |
| ------------------------- | --------------------------------------------------------------- | ----------------------- |
| `enrollments/audit-log`   | `feat(audit): add audit log with automatic change tracking`     | Member 2 PR 1           |
| `enrollments/enrollments` | `feat(enrollments): add enrollment with seat-limit transaction` | Member 3 PR 3 and Audit |
| `enrollments/grades`      | `feat(grades): add grading, transcript and CGPA`                | Enrollments             |

When splitting PR 2, defer Grade import/OneToOne metadata, the grade relations and
transactional drop's grade existence check until PR 3; keep the enrollment/student
and offering locking. Add only the appropriate module and migration per PR.
Do not push this combined branch as though three separately reviewed PRs exist.

For each PR: update main/dependencies/migrations after prerequisites land, create
the branch, add feature files, generate/check/apply only owned migration changes,
run Swagger cases/tests/lint/build, inspect git status/diff, commit feature files,
push **the feature branch**, then open PR to main (title = commit message,
description = endpoints + tests + dependencies). Request teammate review. Do not
stage .env, node_modules or dist. Do not push main directly.

If main changes, merge it into the feature branch; keep everyone's app-module
imports when resolving conflicts. After approval, use Squash and merge, delete
remote feature branch, update local main, then delete the merged local branch.
To review a teammate: read Files changed, fetch/check out their branch, install
updated dependencies, apply migrations on a test DB, try 2–3 routes including an
error, then leave specific feedback/approve and return to your work. Don't reset
or switch branches over unsaved changes.

### Troubleshooting

- Authentication failed / DB missing: check private DB_PASSWORD/DB_NAME and create
  the configured database. Startup validation: compare .env.example.
- Missing table: apply prerequisites and migrations. Unexpected migration changes:
  update main and DB before regeneration; never edit another member's tables.
- No schema changes: check saved `.entity.ts` files and loaded entities.
- Missing @nestjs/jwt or similar after pull: install the updated manifest's
  dependencies; do not add unapproved packages. Missing local src/users files
  require the teammate PR, not npm installation.
- 400 unknown field: send only DTO keys; studentId/gradePoint are server-controlled.
- 401: fresh real token in Authorize. 403: wrong role or wrong ownership.
- Port 3000 busy: stop the previous server or choose a private PORT setting.
- Windows bcrypt build: retry installation/install Visual Studio C++ build tools.
- Git push authentication: your own PAT/browser sign-in, never hard-coded tokens.
- Blocked >30 minutes: share the feature branch and exact error with the group,
  not your secrets; do not claim an unverified full build or real-auth success.
