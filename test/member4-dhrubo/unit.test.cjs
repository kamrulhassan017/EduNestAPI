require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const { of, throwError, lastValueFrom } = require('rxjs');
const { toLetterGrade } = require('../../src/grades/grade-scale.ts');
const { SetGradeDto } = require('../../src/grades/dto/set-grade.dto.ts');
const {
  CreateEnrollmentDto,
} = require('../../src/enrollments/dto/create-enrollment.dto.ts');
const {
  EnrollmentQueryDto,
} = require('../../src/enrollments/dto/enrollment-query.dto.ts');
const { AuditQueryDto } = require('../../src/audit/dto/audit-query.dto.ts');
const { AuditService } = require('../../src/audit/audit.service.ts');
const { AuditInterceptor } = require('../../src/audit/audit.interceptor.ts');

for (const [min, max, letter, point] of [
  [80, 100, 'A+', 4],
  [75, 79.99, 'A', 3.75],
  [70, 74.99, 'A-', 3.5],
  [65, 69.99, 'B+', 3.25],
  [60, 64.99, 'B', 3],
  [55, 59.99, 'B-', 2.75],
  [50, 54.99, 'C+', 2.5],
  [45, 49.99, 'C', 2.25],
  [40, 44.99, 'D', 2],
  [0, 39.99, 'F', 0],
])
  test(`UGC grade boundaries ${min}–${max} => ${letter} / ${point}`, () => {
    for (const marks of [min, max])
      assert.deepEqual(toLetterGrade(marks), { letter, point });
  });

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (metatype, value, type = 'body') =>
  pipe.transform(value, { metatype, type });
test('grade DTO accepts boundaries/two decimals and rejects strings, nonfinite, null, missing, out-of-range and excess precision', async () => {
  for (const marks of [0, 100, 82.5, 79.99])
    assert.equal((await validate(SetGradeDto, { marks })).marks, marks);
  for (const marks of [
    -0.01,
    100.01,
    82.555,
    '82',
    null,
    undefined,
    NaN,
    Infinity,
  ])
    await assert.rejects(validate(SetGradeDto, { marks }), { status: 400 });
  await assert.rejects(validate(SetGradeDto, { marks: 82, gradePoint: 4 }), {
    status: 400,
  });
});
test('enrollment DTO only accepts a positive numeric offering ID; student cannot choose studentId/role', async () => {
  assert.equal(
    (await validate(CreateEnrollmentDto, { offeringId: 1 })).offeringId,
    1,
  );
  for (const offeringId of [0, -1, 1.5, '1', null, undefined])
    await assert.rejects(validate(CreateEnrollmentDto, { offeringId }), {
      status: 400,
    });
  for (const extra of [
    { studentId: 1 },
    { role: 'admin' },
    { status: 'enrolled' },
  ])
    await assert.rejects(
      validate(CreateEnrollmentDto, { offeringId: 1, ...extra }),
      { status: 400 },
    );
});
test('query DTOs transform IDs/page/limit, preserve skip, and reject invalid filters', async () => {
  const query = await validate(
    EnrollmentQueryDto,
    {
      studentId: '3',
      offeringId: '2',
      status: 'dropped',
      page: '2',
      limit: '5',
    },
    'query',
  );
  assert.equal(query.studentId, 3);
  assert.equal(query.offeringId, 2);
  assert.equal(query.skip, 5);
  const audit = await validate(
    AuditQueryDto,
    { actorId: '1', action: 'GRADE_CHANGED', entity: 'Grade' },
    'query',
  );
  assert.equal(audit.actorId, 1);
  assert.equal(audit.page, 1);
  assert.equal(audit.limit, 10);
  for (const values of [
    { status: 'invalid' },
    { studentId: '0' },
    { offeringId: 'bad' },
    { page: '0' },
    { limit: '101' },
  ])
    await assert.rejects(validate(EnrollmentQueryDto, values, 'query'), {
      status: 400,
    });
  for (const values of [
    { actorId: '0' },
    { actorId: '1.5' },
    { entity: 'x'.repeat(51) },
    { action: 'x'.repeat(51) },
  ])
    await assert.rejects(validate(AuditQueryDto, values, 'query'), {
      status: 400,
    });
});

function context({
  name = 'UsersController',
  method = 'POST',
  params = {},
  user = { id: 1, role: 'admin' },
  type = 'http',
} = {}) {
  const controller = { [name]: class {} }[name];
  const request = {
    method,
    params,
    user,
    originalUrl: '/api/v1/users',
    body: { password: 'must-not-log' },
    headers: { authorization: 'must-not-log' },
  };
  return {
    getType: () => type,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  };
}
function interceptor() {
  const entries = [];
  return {
    entries,
    instance: new AuditInterceptor({
      log: async (entry) => {
        entries.push(entry);
      },
    }),
  };
}
for (const [method, action] of [
  ['POST', 'CREATE'],
  ['PUT', 'UPDATE'],
  ['PATCH', 'UPDATE'],
  ['DELETE', 'DELETE'],
]) {
  test(`audit interceptor maps ${method}, extracts ID, logs actor/path only and preserves the result`, async () => {
    const { instance, entries } = interceptor();
    const result = { id: 7, name: 'User' };
    assert.equal(
      await lastValueFrom(
        instance.intercept(context({ method }), { handle: () => of(result) }),
      ),
      result,
    );
    assert.deepEqual(entries, [
      {
        actorId: 1,
        actorRole: 'admin',
        action: `USERS_${action}`,
        entity: 'Users',
        entityId: '7',
        details: { method, path: '/api/v1/users' },
      },
    ]);
    assert.ok(!JSON.stringify(entries).includes('must-not-log'));
  });
}
test('audit prefers path ID for deletes, extracts wrapped IDs, and handles null/public responses', async () => {
  const { instance, entries } = interceptor();
  await lastValueFrom(
    instance.intercept(context({ method: 'DELETE', params: { id: '3' } }), {
      handle: () => of({ data: { id: 99 } }),
    }),
  );
  await lastValueFrom(
    instance.intercept(context(), { handle: () => of({ data: { id: 8 } }) }),
  );
  await lastValueFrom(
    instance.intercept(context({ user: null }), { handle: () => of(null) }),
  );
  assert.deepEqual(
    entries.map((r) => r.entityId),
    ['3', '8', null],
  );
  assert.equal(entries[2].actorId, null);
  assert.equal(entries[2].actorRole, null);
});
test('audit skips Auth login/register, Grades, reads and non-HTTP requests', async () => {
  const { instance, entries } = interceptor();
  for (const values of [
    { name: 'AuthController' },
    { name: 'GradesController', method: 'PUT' },
    { method: 'GET' },
    { method: 'HEAD' },
    { type: 'ws' },
  ]) {
    await lastValueFrom(
      instance.intercept(context(values), { handle: () => of('unchanged') }),
    );
  }
  assert.deepEqual(entries, []);
});
test('audit does not record failed requests and propagates the original error', async () => {
  const { instance, entries } = interceptor();
  const error = new Error('failure');
  await assert.rejects(
    lastValueFrom(
      instance.intercept(context(), { handle: () => throwError(() => error) }),
    ),
    (actual) => actual === error,
  );
  assert.deepEqual(entries, []);
});
test('AuditService normalizes nulls/string IDs and swallows/logs database errors', async () => {
  const saved = [];
  const service = new AuditService({
    create: (entry) => entry,
    save: async (entry) => {
      saved.push(entry);
    },
  });
  await service.log({ action: 'TEST', entity: 'Test', entityId: 1 });
  assert.deepEqual(saved[0], {
    actorId: null,
    actorRole: null,
    action: 'TEST',
    entity: 'Test',
    entityId: '1',
    details: null,
  });
  const broken = new AuditService({
    create: () => {
      throw new Error('DB unavailable');
    },
  });
  const errors = [];
  broken.logger.error = (...args) => errors.push(args);
  await assert.doesNotReject(broken.log({ action: 'TEST', entity: 'Test' }));
  assert.match(errors[0][0], /Could not write audit log TEST/);
});
