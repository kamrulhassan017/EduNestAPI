// Real Nest HTTP + TypeORM + PostgreSQL, with ONLY Member 2 replaced by fixtures.
require('./register-fixtures.cjs');
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  Module,
  ValidationPipe,
  ClassSerializerInterceptor,
} = require('@nestjs/common');
const { NestFactory, Reflector } = require('@nestjs/core');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { DataSource } = require('typeorm');
const {
  User,
  FixtureAuthGuard,
  FixtureUsers1700000000000,
} = require('./fixture-contracts.cjs');
const {
  Department,
} = require('../../src/departments/entities/department.entity.ts');
const { Course } = require('../../src/courses/entities/course.entity.ts');
const {
  CourseOffering,
} = require('../../src/offerings/entities/course-offering.entity.ts');
const {
  DepartmentsModule,
} = require('../../src/departments/departments.module.ts');
const { CoursesModule } = require('../../src/courses/courses.module.ts');
const { OfferingsModule } = require('../../src/offerings/offerings.module.ts');
const {
  OfferingsService,
} = require('../../src/offerings/offerings.service.ts');
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

let app, ds, baseUrl;
let sequence = 100;
const options = {
  type: 'postgres',
  host: '127.0.0.1',
  port: Number(process.env.MEMBER3_TEST_PORT),
  username: 'member3',
  password: process.env.MEMBER3_TEST_PASSWORD,
  database: 'member3_test',
  synchronize: false,
  entities: [User, Department, Course, CourseOffering],
  migrations: [
    FixtureUsers1700000000000,
    CreateDepartmentsAndCourses1794780000000,
    CreateCourseOfferings1794780001000,
  ],
};

before(async () => {
  assert.ok(
    options.port && options.password,
    'Use node test/member3/run-postgres.cjs (disposable DB only)',
  );
  ds = new DataSource(options);
  await ds.initialize();
  await ds.runMigrations();
  await ds.getRepository(User).save([
    {
      id: 1,
      name: 'Admin',
      email: 'admin@test.invalid',
      role: 'admin',
      passwordHash: 'test-only-secret',
    },
    {
      id: 2,
      name: 'Teacher',
      email: 'teacher@test.invalid',
      role: 'teacher',
      passwordHash: 'test-only-secret',
    },
    {
      id: 3,
      name: 'Student',
      email: 'student@test.invalid',
      role: 'student',
      passwordHash: 'test-only-secret',
    },
    {
      id: 4,
      name: 'Other teacher',
      email: 'teacher2@test.invalid',
      role: 'teacher',
      passwordHash: 'test-only-secret',
    },
  ]);
  class FixtureAppModule {}
  Module({
    imports: [
      TypeOrmModule.forRoot(options),
      DepartmentsModule,
      CoursesModule,
      OfferingsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
  })(FixtureAppModule);
  app = await NestFactory.create(FixtureAppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalGuards(new FixtureAuthGuard());
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
  setupSwagger(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
after(async () => {
  if (app) await app.close();
  if (ds?.isInitialized) await ds.destroy();
});

async function api(method, path, body, status = 200, token = 'test-admin') {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  assert.equal(result.success, status < 400);
  if (status >= 400) {
    assert.equal(result.statusCode, status);
    assert.equal(result.path, `/api/v1${path}`);
    assert.ok(result.message);
    assert.ok(result.timestamp);
  } else {
    assert.ok(Object.hasOwn(result, 'data'));
    assert.ok(Object.hasOwn(result, 'meta'));
  }
  return result;
}
async function department() {
  const n = sequence++;
  const code = `T${String.fromCharCode(65 + Math.floor(n / 26))}${String.fromCharCode(65 + (n % 26))}`;
  return (
    await api('POST', '/departments', { name: `Department ${n}`, code }, 201)
  ).data;
}
async function course(departmentId) {
  if (!departmentId) departmentId = (await department()).id;
  return (
    await api(
      'POST',
      '/courses',
      {
        code: `CSC${sequence++}`,
        title: 'Web Technology',
        credits: 3,
        departmentId,
      },
      201,
    )
  ).data;
}
async function offering(courseId, values = {}) {
  if (!courseId) courseId = (await course()).id;
  return (
    await api(
      'POST',
      '/offerings',
      {
        courseId,
        teacherId: 2,
        semester: 'fall',
        year: 2026,
        section: 'a',
        capacity: 2,
        ...values,
      },
      201,
    )
  ).data;
}

test('migrations apply, revert and reapply without touching users; metadata has no schema drift', async () => {
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries, []);
  await ds.undoLastMigration();
  assert.equal(
    (await ds.query("SELECT to_regclass('course_offerings') AS name"))[0].name,
    null,
  );
  await ds.undoLastMigration();
  assert.equal(
    (await ds.query("SELECT to_regclass('courses') AS name"))[0].name,
    null,
  );
  assert.equal(
    (await ds.query("SELECT to_regclass('departments') AS name"))[0].name,
    null,
  );
  assert.equal(await ds.getRepository(User).count(), 4);
  await ds.runMigrations();
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries, []);
});

test('public health reports a live database in the existing envelope', async () => {
  const result = await api('GET', '/health', undefined, 200, null);
  assert.equal(result.data.database, 'up');
  assert.equal(result.meta, null);
});

test('all catalogue reads require authentication with the fixture guard', async () => {
  for (const path of [
    '/departments',
    '/courses',
    '/offerings',
    '/offerings/mine',
  ]) {
    await api('GET', path, undefined, 401, null);
  }
});

test('department codes normalize; both duplicate code and duplicate name return 409', async () => {
  const body = { name: 'Computer Science and Engineering', code: ' cse ' };
  const result = await api('POST', '/departments', body, 201);
  assert.equal(result.data.code, 'CSE');
  assert.equal(result.message, 'Department created');
  await api('POST', '/departments', body, 409);
  await api('POST', '/departments', { ...body, name: 'Different name' }, 409);
  await api('POST', '/departments', { ...body, code: 'EEE' }, 409);
});

test('department search, pagination, details, PATCH and empty delete work', async () => {
  const d = await department();
  const list = await api(
    'GET',
    `/departments?search=${d.code.toLowerCase()}&page=1&limit=5`,
  );
  assert.equal(list.data.length, 1);
  assert.deepEqual(list.meta, { page: 1, limit: 5, total: 1, totalPages: 1 });
  assert.deepEqual((await api('GET', `/departments/${d.id}`)).data.courses, []);
  const updated = await api('PATCH', `/departments/${d.id}`, {
    name: 'Updated Department',
  });
  assert.equal(updated.data.name, 'Updated Department');
  assert.equal(updated.data.code, d.code);
  assert.equal((await api('DELETE', `/departments/${d.id}`)).data, null);
  await api('GET', `/departments/${d.id}`, undefined, 404);
});

test('course creation normalizes code and includes department; duplicate is 409', async () => {
  const d = await department();
  const body = {
    code: ' csc4161 ',
    title: 'Advanced Programming in Web Technology',
    credits: 3,
    departmentId: d.id,
  };
  const result = await api('POST', '/courses', body, 201);
  assert.equal(result.data.code, 'CSC4161');
  assert.equal(result.data.department.id, d.id);
  await api('POST', '/courses', body, 409);
  const detail = await api('GET', `/departments/${d.id}`);
  assert.equal(detail.data.courses[0].id, result.data.id);
  await api('DELETE', `/departments/${d.id}`, undefined, 409);
});

test('missing department is 404; invalid credits or code are 400', async () => {
  const body = {
    code: 'CSC999',
    title: 'Web Technology',
    credits: 3,
    departmentId: 999999,
  };
  await api('POST', '/courses', body, 404);
  await api('POST', '/courses', { ...body, credits: 9 }, 400);
  await api('POST', '/courses', { ...body, code: 'invalid' }, 400);
});

test('course search combines department filter with both code/title and supports pagination', async () => {
  const d = await department();
  const a = await course(d.id);
  const b = await course(d.id);
  const list = await api(
    'GET',
    `/courses?departmentId=${d.id}&search=web&page=2&limit=1`,
  );
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].id, b.id);
  assert.deepEqual(list.meta, { page: 2, limit: 1, total: 2, totalPages: 2 });
  const byCode = await api(
    'GET',
    `/courses?departmentId=${d.id}&search=${a.code.toLowerCase()}`,
  );
  assert.equal(byCode.data[0].id, a.id);
});

test('course PATCH validates department and preserves omitted fields; unreferenced delete works', async () => {
  const c = await course();
  await api('PATCH', `/courses/${c.id}`, { departmentId: 999999 }, 404);
  const d = await department();
  const changed = await api('PATCH', `/courses/${c.id}`, {
    departmentId: d.id,
    title: 'Updated Title',
    description: 'New description',
  });
  assert.equal(changed.data.department.id, d.id);
  assert.equal(changed.data.credits, 3);
  assert.equal(changed.data.description, 'New description');
  const cleared = await api('PATCH', `/courses/${c.id}`, { description: null });
  assert.equal(cleared.data.description, null);
  assert.equal((await api('DELETE', `/courses/${c.id}`)).data, null);
  await api('GET', `/courses/${c.id}`, undefined, 404);
});

test('students/teachers may read but cannot mutate departments, courses or offerings', async () => {
  for (const token of ['test-student', 'test-teacher']) {
    for (const resource of ['departments', 'courses', 'offerings']) {
      await api('GET', `/${resource}`, undefined, 200, token);
      for (const [method, suffix] of [
        ['POST', ''],
        ['PATCH', '/1'],
        ['DELETE', '/1'],
      ]) {
        await api(
          method,
          `/${resource}${suffix}`,
          method === 'DELETE' ? undefined : {},
          403,
          token,
        );
      }
    }
  }
});

test('offering normalizes section and includes course/department/teacher without secrets', async () => {
  const o = await offering();
  assert.equal(o.section, 'A');
  assert.equal(o.teacher.id, 2);
  assert.equal(o.course.department.id, o.course.departmentId);
  assert.ok(!JSON.stringify(o).includes('password'));
  assert.ok(!JSON.stringify(o).includes('test-only-secret'));
  await api(
    'POST',
    '/offerings',
    {
      courseId: o.courseId,
      teacherId: 2,
      semester: 'fall',
      year: 2026,
      section: 'A',
      capacity: 2,
    },
    409,
  );
  await api('DELETE', `/courses/${o.courseId}`, undefined, 409);
});

test('offering rejects student as teacher, missing teacher/course, and invalid fields', async () => {
  const c = await course();
  const body = {
    courseId: c.id,
    teacherId: 3,
    semester: 'fall',
    year: 2026,
    section: 'A',
    capacity: 2,
  };
  const wrongRole = await api('POST', '/offerings', body, 400);
  assert.match(wrongRole.message, /not a teacher/);
  await api('POST', '/offerings', { ...body, teacherId: 999999 }, 404);
  await api(
    'POST',
    '/offerings',
    { ...body, teacherId: 2, courseId: 999999 },
    404,
  );
  for (const values of [
    { capacity: 0 },
    { capacity: 501 },
    { semester: 'winter' },
    { year: 1999 },
    { year: 2101 },
    { section: '!!!' },
  ]) {
    await api('POST', '/offerings', { ...body, teacherId: 2, ...values }, 400);
  }
});

test('offering list supports all four filters and teacher mine ignores forged teacherId', async () => {
  const c = await course();
  const a = await offering(c.id, { section: 'A' });
  const b = await offering(c.id, { section: 'B' });
  await offering(c.id, { section: 'C', teacherId: 4 });
  const list = await api(
    'GET',
    `/offerings?courseId=${c.id}&teacherId=2&semester=fall&year=2026`,
  );
  assert.deepEqual(
    list.data.map((o) => o.id),
    [b.id, a.id],
  );
  assert.equal(list.meta.total, 2);
  const mine = await api(
    'GET',
    `/offerings/mine?courseId=${c.id}&teacherId=4&page=2&limit=1`,
    undefined,
    200,
    'test-teacher',
  );
  assert.equal(mine.data[0].id, a.id);
  assert.equal(mine.data[0].teacherId, 2);
  assert.deepEqual(mine.meta, { page: 2, limit: 1, total: 2, totalPages: 2 });
  await api('GET', '/offerings/mine', undefined, 403, 'test-admin');
  await api('GET', '/offerings/mine', undefined, 403, 'test-student');
});

test('offering PATCH validates teacher/course and unique term/section', async () => {
  const c = await course();
  const a = await offering(c.id);
  const b = await offering(c.id, { section: 'B' });
  await api('PATCH', `/offerings/${b.id}`, { section: 'a' }, 409);
  await api('PATCH', `/offerings/${b.id}`, { teacherId: 3 }, 400);
  await api('PATCH', `/offerings/${b.id}`, { teacherId: 999999 }, 404);
  await api('PATCH', `/offerings/${b.id}`, { courseId: 999999 }, 404);
  const changed = await api('PATCH', `/offerings/${b.id}`, {
    teacherId: 4,
    capacity: 40,
    year: 2027,
  });
  assert.equal(changed.data.teacher.id, 4);
  assert.equal(changed.data.capacity, 40);
  assert.equal(changed.data.section, 'B');
  assert.equal((await api('DELETE', `/offerings/${a.id}`)).data, null);
  await api('GET', `/offerings/${a.id}`, undefined, 404);
});

test('Member 4 contract: OfferingsService is injectable with findOne and full relations', async () => {
  const o = await offering();
  const fetched = await app.get(OfferingsService).findOne(o.id);
  assert.equal(fetched.courseId, o.courseId);
  assert.equal(fetched.teacherId, 2);
  assert.equal(fetched.semester, 'fall');
  assert.equal(fetched.capacity, 2);
  assert.ok(fetched.course.department);
  assert.ok(fetched.teacher);
});

test('an enrollment-shaped external FK prevents offering deletion with a 409', async () => {
  const o = await offering();
  // An external reference fixture, not an implementation of Member 4's module.
  await ds.query(
    'CREATE TABLE "member4_fk_probe" ("offeringId" integer NOT NULL REFERENCES "course_offerings"("id") ON DELETE RESTRICT)',
  );
  try {
    await ds.query(
      'INSERT INTO "member4_fk_probe" ("offeringId") VALUES ($1)',
      [o.id],
    );
    await api('DELETE', `/offerings/${o.id}`, undefined, 409);
    assert.equal((await api('GET', `/offerings/${o.id}`)).data.id, o.id);
  } finally {
    await ds.query('DROP TABLE "member4_fk_probe"');
  }
  await api('DELETE', `/offerings/${o.id}`);
});

test('concurrent duplicate offering inserts yield one 201 and one 409 with one row', async () => {
  const c = await course();
  const body = {
    courseId: c.id,
    teacherId: 2,
    semester: 'fall',
    year: 2026,
    section: 'A',
    capacity: 2,
  };
  const responses = await Promise.all(
    [1, 2].map(() =>
      fetch(`${baseUrl}/api/v1/offerings`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  await Promise.all(responses.map((r) => r.json()));
  assert.equal(
    await ds.getRepository(CourseOffering).countBy({ courseId: c.id }),
    1,
  );
});

test('missing resources, malformed path IDs, invalid pagination and unknown DTO keys fail cleanly', async () => {
  for (const resource of ['departments', 'courses', 'offerings']) {
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      await api(
        method,
        `/${resource}/999999`,
        method === 'PATCH' ? {} : undefined,
        404,
      );
      await api(
        method,
        `/${resource}/abc`,
        method === 'PATCH' ? {} : undefined,
        400,
      );
    }
    await api('GET', `/${resource}?page=0`, undefined, 400);
    await api('GET', `/${resource}?limit=101`, undefined, 400);
    await api('GET', `/${resource}?unknown=x`, undefined, 400);
  }
  await api(
    'POST',
    '/departments',
    { name: 'Unknown field', code: 'XYZ', role: 'admin' },
    400,
  );
  const d = await department();
  await api('PATCH', `/departments/${d.id}`, { name: null }, 400);
  const c = await course();
  await api('PATCH', `/courses/${c.id}`, { credits: null }, 400);
  const o = await offering();
  await api('PATCH', `/offerings/${o.id}`, { capacity: null }, 400);
});

test('Swagger JSON contains all 16 catalogue operations with correct envelopes and errors', async () => {
  const response = await fetch(`${baseUrl}/api/docs-json`);
  assert.equal(response.status, 200);
  const spec = await response.json();
  assert.deepEqual(
    spec.tags.map((t) => t.name),
    [
      'Health',
      'Auth',
      'Users',
      'Departments',
      'Courses',
      'Offerings',
      'Enrollments',
      'Grades',
      'Audit',
    ],
  );
  assert.equal(
    spec.components.securitySchemes['access-token'].scheme,
    'bearer',
  );
  let operations = 0;
  for (const [path, methods] of Object.entries(spec.paths)) {
    if (!/^\/api\/v1\/(departments|courses|offerings)/.test(path)) continue;
    for (const [method, operation] of Object.entries(methods)) {
      operations++;
      assert.ok(operation.summary, `${path} summary`);
      assert.deepEqual(operation.security, [{ 'access-token': [] }]);
      const status = method === 'post' ? '201' : '200';
      const schema =
        operation.responses[status].content['application/json'].schema;
      assert.deepEqual(schema.required, ['success', 'message', 'data', 'meta']);
      assert.ok(schema.properties.success && schema.properties.message);
      if (method === 'delete')
        assert.equal(schema.properties.data.nullable, true);
      if (
        method === 'get' &&
        (!path.includes('{id}') || path.endsWith('/mine'))
      ) {
        assert.equal(schema.properties.data.type, 'array');
        assert.equal(
          schema.properties.meta.$ref,
          '#/components/schemas/PaginationMetaDto',
        );
      }
      assert.ok(operation.responses['401']);
      for (const code of ['400', '401', '403', '404', '409']) {
        if (operation.responses[code])
          assert.equal(
            operation.responses[code].content['application/json'].schema.$ref,
            '#/components/schemas/ErrorResponseDto',
          );
      }
    }
  }
  assert.equal(operations, 16);
  assert.ok(!spec.components.schemas.User.properties.passwordHash);
  assert.ok(!spec.paths['/api/v1/health'].get.security);
  assert.equal(
    spec.components.schemas.CreateCourseDto.properties.credits.maximum,
    6,
  );
  assert.deepEqual(
    spec.components.schemas.CreateOfferingDto.properties.semester.enum,
    ['spring', 'summer', 'fall'],
  );
  for (const name of ['Department', 'Course', 'CourseOffering'])
    assert.ok(spec.components.schemas[name].properties.id);
});

test('Swagger UI is served with title, collapsed tags, filter and try-it-out configuration', async () => {
  const html = await (await fetch(`${baseUrl}/api/docs`)).text();
  assert.match(html, /EduNest-API Docs/);
  const init = await (
    await fetch(`${baseUrl}/api/docs/swagger-ui-init.js`)
  ).text();
  for (const [key, value] of [
    ['docExpansion', '"none"'],
    ['filter', 'true'],
    ['persistAuthorization', 'true'],
    ['tryItOutEnabled', 'true'],
    ['displayRequestDuration', 'true'],
  ]) {
    assert.match(init, new RegExp(`"${key}"\\s*:\\s*${value}`));
  }
  assert.match(init, /How to try it/);
});
