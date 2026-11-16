// TEST ONLY: reuse missing Member 2 contracts, never substitute Member 3 or 4 code.
require('../member3/register-fixtures.cjs');
const assert = require('node:assert/strict');
const {
  Module,
  ValidationPipe,
  ClassSerializerInterceptor,
  UnauthorizedException,
  ForbiddenException,
} = require('@nestjs/common');
const { NestFactory, Reflector } = require('@nestjs/core');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { DataSource } = require('typeorm');
const {
  User,
  FixtureUsers1700000000000,
} = require('../member3/fixture-contracts.cjs');
const {
  Department,
} = require('../../src/departments/entities/department.entity.ts');
const { Course } = require('../../src/courses/entities/course.entity.ts');
const {
  CourseOffering,
} = require('../../src/offerings/entities/course-offering.entity.ts');
const { AuditLog } = require('../../src/audit/entities/audit-log.entity.ts');
const {
  Enrollment,
} = require('../../src/enrollments/entities/enrollment.entity.ts');
const { Grade } = require('../../src/grades/entities/grade.entity.ts');
const {
  DepartmentsModule,
} = require('../../src/departments/departments.module.ts');
const { CoursesModule } = require('../../src/courses/courses.module.ts');
const { OfferingsModule } = require('../../src/offerings/offerings.module.ts');
const { AuditModule } = require('../../src/audit/audit.module.ts');
const {
  EnrollmentsModule,
} = require('../../src/enrollments/enrollments.module.ts');
const { GradesModule } = require('../../src/grades/grades.module.ts');
const { AuditService } = require('../../src/audit/audit.service.ts');
const { AppController } = require('../../src/app.controller.ts');
const { AppService } = require('../../src/app.service.ts');
const {
  AllExceptionsFilter,
} = require('../../src/common/filters/all-exceptions.filter.ts');
const {
  TransformInterceptor,
} = require('../../src/common/interceptors/transform.interceptor.ts');
const { setupSwagger } = require('../../src/config/swagger.config.ts');
const {
  CreateDepartmentsAndCourses1794780000000,
} = require('../../src/database/migrations/1794780000000-CreateDepartmentsAndCourses.ts');
const {
  CreateCourseOfferings1794780001000,
} = require('../../src/database/migrations/1794780001000-CreateCourseOfferings.ts');
const {
  CreateAuditLogs1794780002000,
} = require('../../src/database/migrations/1794780002000-CreateAuditLogs.ts');
const {
  CreateEnrollments1794780003000,
} = require('../../src/database/migrations/1794780003000-CreateEnrollments.ts');
const {
  CreateGrades1794780004000,
} = require('../../src/database/migrations/1794780004000-CreateGrades.ts');

const identities = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  role: i === 0 ? 'admin' : i === 1 || i === 3 ? 'teacher' : 'student',
}));
class FixtureGuard {
  canActivate(context) {
    if (context.getClass().name === 'AppController') return true;
    const req = context.switchToHttp().getRequest();
    const user = identities.find(
      (u) => req.headers.authorization === `Bearer fixture-${u.id}`,
    );
    if (!user) throw new UnauthorizedException();
    req.user = user;
    const roles = new Reflector().getAllAndOverride('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}

async function setup() {
  const queries = [];
  const options = {
    type: 'postgres',
    host: '127.0.0.1',
    port: Number(process.env.MEMBER4_TEST_PORT),
    username: 'member4',
    password: process.env.MEMBER4_TEST_PASSWORD,
    database: 'member4_test',
    synchronize: false,
    entities: [
      User,
      Department,
      Course,
      CourseOffering,
      AuditLog,
      Enrollment,
      Grade,
    ],
    migrations: [
      FixtureUsers1700000000000,
      CreateDepartmentsAndCourses1794780000000,
      CreateCourseOfferings1794780001000,
      CreateAuditLogs1794780002000,
      CreateEnrollments1794780003000,
      CreateGrades1794780004000,
    ],
    logging: ['query'],
    logger: {
      logQuery: (sql) => queries.push(sql),
      logQueryError() {},
      logQuerySlow() {},
      logSchemaBuild() {},
      logMigration() {},
      log() {},
    },
  };
  assert.ok(
    options.port && options.password,
    'Use node test/member4/run-postgres.cjs (disposable DB only)',
  );
  const ds = new DataSource(options);
  let app;
  const pendingAudit = new Set();
  const drainAudits = () => Promise.all([...pendingAudit]);
  try {
    await ds.initialize();
    await ds.runMigrations();
    await ds
      .getRepository(User)
      .save(
        identities.map((u) => ({
          ...u,
          name: `${u.role} ${u.id}`,
          email: `user${u.id}@test.invalid`,
          passwordHash: 'fixture-secret-not-for-output',
        })),
      );
    class FixtureAppModule {}
    Module({
      imports: [
        TypeOrmModule.forRoot(options),
        DepartmentsModule,
        CoursesModule,
        OfferingsModule,
        AuditModule,
        EnrollmentsModule,
        GradesModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    })(FixtureAppModule);
    app = await NestFactory.create(FixtureAppModule, {
      logger: false,
      abortOnError: false,
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalGuards(new FixtureGuard());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(
      new TransformInterceptor(reflector),
      new ClassSerializerInterceptor(reflector),
    );
    // Observe, but do not replace, actual DB audit writes so tests can await the
    // specification's fire-and-forget interceptor without timing-based sleeps.
    const audit = app.get(AuditService);
    const originalLog = audit.log.bind(audit);
    audit.log = (...args) => {
      const promise = originalLog(...args);
      pendingAudit.add(promise);
      promise.finally(() => pendingAudit.delete(promise));
      return promise;
    };
    setupSwagger(app);
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    let sequence = 200;
    async function raw(method, route, body, id = 1) {
      const headers = {};
      if (id !== null) headers.authorization = `Bearer fixture-${id}`;
      if (body !== undefined) headers['content-type'] = 'application/json';
      const response = await fetch(`${url}/api/v1${route}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await response.json();
      await drainAudits();
      assert.ok(
        !JSON.stringify(json).includes('fixture-secret-not-for-output'),
      );
      assert.ok(!JSON.stringify(json).includes('passwordHash'));
      return { status: response.status, json };
    }
    async function api(method, route, body, expected = 200, id = 1) {
      const { status, json } = await raw(method, route, body, id);
      assert.equal(
        status,
        expected,
        `${method} ${route}: ${JSON.stringify(json)}`,
      );
      assert.equal(json.success, status < 400);
      if (status >= 400) {
        assert.equal(json.statusCode, status);
        assert.equal(json.path, `/api/v1${route}`);
        assert.ok(json.timestamp);
      } else {
        assert.ok(Object.hasOwn(json, 'data'));
        assert.ok(Object.hasOwn(json, 'meta'));
      }
      return json;
    }
    async function course(credits = 3) {
      const n = sequence++;
      const code = `M${String.fromCharCode(65 + Math.floor(n / 26))}${String.fromCharCode(65 + (n % 26))}`;
      const d = (
        await api(
          'POST',
          '/departments',
          { name: `Member4 Department ${n}`, code },
          201,
        )
      ).data;
      return (
        await api(
          'POST',
          '/courses',
          {
            code: `CSC${n}`,
            title: `Course ${n}`,
            credits,
            departmentId: d.id,
          },
          201,
        )
      ).data;
    }
    async function offering(values = {}) {
      const courseId = values.courseId ?? (await course()).id;
      return (
        await api(
          'POST',
          '/offerings',
          {
            courseId,
            teacherId: 2,
            semester: 'fall',
            year: 2026,
            section: 'A',
            capacity: 2,
            ...values,
          },
          201,
        )
      ).data;
    }
    async function enroll(offeringId, id = 3) {
      return (await api('POST', '/enrollments', { offeringId }, 201, id)).data;
    }
    return {
      ds,
      app,
      url,
      queries,
      api,
      raw,
      course,
      offering,
      enroll,
      drainAudits,
      close: async () => {
        await drainAudits();
        await app.close();
        await ds.destroy();
      },
    };
  } catch (error) {
    if (app) await app.close();
    if (ds.isInitialized) await ds.destroy();
    throw error;
  }
}
module.exports = {
  setup,
  User,
  Department,
  Course,
  CourseOffering,
  AuditLog,
  Enrollment,
  Grade,
  identities,
};
