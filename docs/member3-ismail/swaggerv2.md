# PR 4 — final Swagger pass (ismail.pdf, pages 34–36)

**Pending prerequisite:** the Auth, Users, Enrollments, Grades and Audit
controllers have not been merged. Do not create substitute controllers or change
teammates' business logic just to complete documentation early. Apply this exact
checklist after their real files arrive; ask each owner to approve their changes.

Branch: `courses/swagger-polish`  
Commit/PR: `docs(swagger): document every endpoint`

## Mechanical edits only

Merge these imports into each controller's existing imports:

```ts
import { HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
```

Only import HttpStatus where CREATED is used. Add the model imports listed below.
Under existing `@Roles` / `@ResponseMessage` decorators, add:

```ts
@ApiOperation({ summary: '<summary in the table>' })
@ApiEnvelope(/* arguments in the table */)
@ApiErrors(/* status codes in the table */)
```

Preserve routes, names, signatures, parameter decorators, role metadata, status
codes, response messages, ordering and handler bodies. Do not rename anything.
Protected controller bearer decorators must use `@ApiBearerAuth('access-token')`
to match this repository's existing security scheme. Login/register/health must
not acquire a bearer requirement. Health needs no change per the guide.

### `src/auth/auth.controller.ts`

Models: `AuthResponseDto` from `./dto/auth-response.dto`; `User` from
`../users/entities/user.entity`.

| Method   | Summary                           | ApiEnvelope arguments                             | ApiErrors arguments |
| -------- | --------------------------------- | ------------------------------------------------- | ------------------- |
| register | Register a new student account    | `AuthResponseDto, { status: HttpStatus.CREATED }` | `400, 409`          |
| login    | Log in and get a JWT access token | `AuthResponseDto`                                 | `400, 401`          |
| me       | Get my own profile                | `User`                                            | `401`               |

### `src/users/users.controller.ts`

Model: `User` from `./entities/user.entity`.

| Method         | Summary                                     | ApiEnvelope arguments                  | ApiErrors arguments       |
| -------------- | ------------------------------------------- | -------------------------------------- | ------------------------- |
| create         | Create a user with any role (admin)         | `User, { status: HttpStatus.CREATED }` | `400, 401, 403, 409`      |
| findAll        | List users (filter by role, search) (admin) | `User, { paginated: true }`            | `400, 401, 403`           |
| changePassword | Change my password                          | `null`                                 | `400, 401`                |
| findOne        | Get one user (admin)                        | `User`                                 | `401, 403, 404`           |
| update         | Update name, email or role (admin)          | `User`                                 | `400, 401, 403, 404, 409` |
| setStatus      | Activate or deactivate a user (admin)       | `User`                                 | `400, 401, 403, 404`      |
| remove         | Delete a user (admin)                       | `null`                                 | `400, 401, 403, 404, 409` |

### `src/enrollments/enrollments.controller.ts`

Model: `Enrollment` from `./entities/enrollment.entity`.

| Method   | Summary                            | ApiEnvelope arguments                        | ApiErrors arguments       |
| -------- | ---------------------------------- | -------------------------------------------- | ------------------------- |
| enroll   | Enroll in an offering (student)    | `Enrollment, { status: HttpStatus.CREATED }` | `400, 401, 403, 404, 409` |
| findMine | My enrollments (student)           | `Enrollment, { paginated: true }`            | `400, 401, 403`           |
| findAll  | List all enrollments (admin)       | `Enrollment, { paginated: true }`            | `400, 401, 403`           |
| findOne  | Get one enrollment                 | `Enrollment`                                 | `401, 403, 404`           |
| drop     | Drop an enrollment (own, or admin) | `Enrollment`                                 | `401, 403, 404, 409`      |

### `src/enrollments/offering-students.controller.ts`

Model: `Enrollment` from `./entities/enrollment.entity`.

| Method       | Summary                                                 | ApiEnvelope arguments             | ApiErrors arguments  |
| ------------ | ------------------------------------------------------- | --------------------------------- | -------------------- |
| findStudents | Students enrolled in an offering (its teacher or admin) | `Enrollment, { paginated: true }` | `400, 401, 403, 404` |

### `src/grades/grades.controller.ts`

Models: `Grade` from `./entities/grade.entity`; `TranscriptDto` from
`./dto/transcript.dto`.

| Method          | Summary                                              | ApiEnvelope arguments      | ApiErrors arguments  |
| --------------- | ---------------------------------------------------- | -------------------------- | -------------------- |
| setGrade        | Give or update a grade (offering's teacher or admin) | `Grade`                    | `400, 401, 403, 404` |
| transcript      | My transcript and CGPA (student)                     | `TranscriptDto`            | `401, 403`           |
| findForOffering | All grades of an offering (its teacher or admin)     | `Grade, { isArray: true }` | `401, 403, 404`      |

### `src/audit/audit.controller.ts`

Model: `AuditLog` from `./entities/audit-log.entity`.

| Method  | Summary                             | ApiEnvelope arguments           | ApiErrors arguments |
| ------- | ----------------------------------- | ------------------------------- | ------------------- |
| findAll | Audit trail of every change (admin) | `AuditLog, { paginated: true }` | `400, 401, 403`     |

## Whole-project acceptance checklist

- [ ] Prerequisite Auth/Users and Audit/Enrollments/Grades PRs are merged.
- [ ] Pull main, install dependencies, run migrations on a test DB.
- [ ] Add the 20 method documentation sets above; no logic changes.
- [ ] Confirm Health, Auth, Users, Departments, Courses, Offerings, Enrollments,
      Grades, Audit tag order.
- [ ] Every operation has a one-line summary.
- [ ] Every protected operation has a working access-token lock; public
      register/login/health do not.
- [ ] Responses document success/message/data and pagination meta; meta is null
      on non-paginated results in this actual repository.
- [ ] Expected 400/401/403/404/409 responses reference ErrorResponseDto.
- [ ] User schema and actual related-user responses contain no password/hash.
      If not, ask Member 2 to fix their entity; do not silently modify their logic.
- [ ] DTO examples and constraints/enums are visible. This checkout has no Swagger
      CLI plugin; missing model property metadata must be agreed with each owner.
- [ ] `/api/docs-json` loads; import that URL into Postman if desired.
- [ ] Re-run all tests and the full README demo using real JWT tokens.
- [ ] `npm run lint` and `npm run build` pass after the prerequisite code is present.
- [ ] Each owner reviews/approves the decorator changes in their controllers.

This document is a pending integration checklist, **not a claim that absent
controllers have already been edited or that real JWT integration was tested**.
