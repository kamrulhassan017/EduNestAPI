# Member 2: Auth and Users

Registration, login with JWT, role-based access for every route, user management for admins, and a welcome email.

## What is in this module

| Part | File(s) |
| --- | --- |
| User entity (`users` table) | `src/users/entities/user.entity.ts` |
| Roles `admin`, `teacher`, `student` | `src/users/enums/role.enum.ts` |
| Users migration (runs before all others) | `src/database/migrations/1794770000000-CreateUsers.ts` |
| User CRUD, soft delete, change password | `src/users/users.controller.ts`, `users.service.ts`, `dto/` |
| First admin created on start-up | `src/users/admin-seeder.service.ts` |
| Register, login, current user | `src/auth/auth.controller.ts`, `auth.service.ts`, `dto/` |
| JWT verification | `src/auth/strategies/jwt.strategy.ts` |
| Global guards: token (401) then role (403) | `src/auth/guards/jwt-auth.guard.ts`, `roles.guard.ts`, registered in `auth.module.ts` |
| Custom decorators | `src/common/decorators/roles.decorator.ts`, `current-user.decorator.ts`, `public.decorator.ts` |
| Logged-in user type | `src/common/interfaces/auth-user.interface.ts` |
| Welcome email (Handlebars template) | `src/mail/mail.module.ts`, `mail.service.ts`, `templates/welcome.hbs` |

## Packages

Install once, from the project folder:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs-modules/mailer nodemailer handlebars
npm install -D @types/passport-jwt @types/bcrypt @types/nodemailer
```

All of them are the ones the course guide lists for authentication and email.

## Settings in `.env`

| Variable | Example | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | a long random string | Signs the tokens. Required. |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime (the guide asks for one hour). |
| `BCRYPT_SALT_ROUNDS` | `10` | bcrypt cost; 10 to 15 (NFR-01 needs at least 10). |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@edunest.local` / `Admin@12345` | First admin, created on start-up if there is no admin. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Mailtrap sandbox values | SMTP for the welcome email. Without `MAIL_USER`/`MAIL_PASSWORD` the app still runs and just skips the email. |

## Endpoints

All routes start with `/api/v1`.

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Creates a **student**; sends the welcome email |
| POST | `/auth/login` | Public | Returns `accessToken` (JWT with user id and role) |
| GET | `/auth/me` | Any logged-in user | Your own profile |
| GET | `/users` | Admin | `?page=&limit=&role=&isActive=&search=` |
| GET | `/users/:id` | Admin | |
| POST | `/users` | Admin | Create a teacher, admin or student account |
| PATCH | `/users/:id` | Owner or Admin | Owner: name and email. Admin: also `role` and `isActive` |
| DELETE | `/users/:id` | Admin | Soft delete: sets `isActive` to false |
| PATCH | `/users/me/password` | Any logged-in user | Needs the current password |

Every other route in the API now needs a token. Only register, login, `GET /health` and the Swagger docs are public.

## Rules it enforces

- Passwords are stored only as bcrypt hashes (10+ rounds). The hash is never selected by default, never returned in a response, and hidden in Swagger.
- Passwords need 8 to 72 characters with at least one letter and one number.
- Emails are trimmed and lower-cased, and must be unique (409 if taken).
- Login gives the same 401 message for an unknown email and a wrong password, so emails can't be guessed.
- A deactivated user gets 403 at login, and their existing token stops working at once (401). The token check re-reads the user on every request.
- Admins can't deactivate themselves or change their own role, so there is always an admin.
- Deactivating keeps the row, so enrollments, grades and audit history stay intact.

| Situation | Status |
| --- | --- |
| No token, bad token, expired token | 401 |
| Valid token, wrong role (e.g. student calls `GET /users`) | 403 |
| Student edits someone else's profile, or their own role | 403 |
| Weak password, bad email, unknown field | 400 |
| Email already used | 409 |
| User id doesn't exist | 404 |

## Contracts used by Members 3 and 4

Kept exactly as their branches expect:

- `Roles(...roles)` with metadata key `roles`, enforced by the global `RolesGuard`
- `CurrentUser()` / `CurrentUser('id')`
- `Role.ADMIN | Role.TEACHER | Role.STUDENT` = `'admin' | 'teacher' | 'student'`
- `User` mapped to `users`, integer `id`, fields `name`, `email`, `role`, `isActive`
- `UsersService.findOneWithRole(id, role)`: 404 if missing, 400 if wrong role
- `UsersModule` exports `UsersService`
- `AuthUser` = `{ id, email, name, role }` on `request.user`
- The controller is named `AuthController`, so the audit log skips auth calls

## Try it in Swagger

1. `npm run migration:run`, then `npm run start:dev`. The log shows `Seeded admin account admin@edunest.local` the first time.
2. Open http://localhost:3000/api/docs.
3. **POST /auth/login** with `{ "email": "admin@edunest.local", "password": "Admin@12345" }` and copy `data.accessToken`.
4. Click **Authorize**, paste the token, click **Authorize** and **Close**.
5. **POST /users** to create a teacher, e.g. `{ "name": "Dr. Ayesha Rahman", "email": "ayesha@edunest.local", "password": "Teach3r!", "role": "teacher" }`.
6. **POST /auth/register** to create a student, then log in as that student and call **GET /users**: it returns 403.

Screenshots for the report: login returning a JWT, a 401 without a token, a 403 for the wrong role, a 409 for a duplicate email, and the welcome email in the Mailtrap inbox.
