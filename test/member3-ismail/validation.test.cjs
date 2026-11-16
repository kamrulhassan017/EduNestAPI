require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const {
  CreateDepartmentDto,
} = require('../../src/departments/dto/create-department.dto.ts');
const {
  UpdateDepartmentDto,
} = require('../../src/departments/dto/update-department.dto.ts');
const {
  DepartmentQueryDto,
} = require('../../src/departments/dto/department-query.dto.ts');
const {
  CreateCourseDto,
} = require('../../src/courses/dto/create-course.dto.ts');
const {
  UpdateCourseDto,
} = require('../../src/courses/dto/update-course.dto.ts');
const { CourseQueryDto } = require('../../src/courses/dto/course-query.dto.ts');
const {
  CreateOfferingDto,
} = require('../../src/offerings/dto/create-offering.dto.ts');
const {
  UpdateOfferingDto,
} = require('../../src/offerings/dto/update-offering.dto.ts');
const {
  OfferingQueryDto,
} = require('../../src/offerings/dto/offering-query.dto.ts');
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const validate = (metatype, value, type = 'body') =>
  pipe.transform(value, { metatype, type });
const d = { name: 'Computer Science', code: 'CSE' };
const c = {
  code: 'CSC4161',
  title: 'Web Technology',
  credits: 3,
  departmentId: 1,
};
const o = {
  courseId: 1,
  teacherId: 2,
  semester: 'fall',
  year: 2026,
  section: 'A',
  capacity: 40,
};

test('department and course codes and offering sections trim and uppercase', async () => {
  assert.equal(
    (await validate(CreateDepartmentDto, { ...d, code: ' cse ' })).code,
    'CSE',
  );
  assert.equal(
    (await validate(CreateCourseDto, { ...c, code: ' csc4161 ' })).code,
    'CSC4161',
  );
  assert.equal(
    (await validate(CreateOfferingDto, { ...o, section: ' b2 ' })).section,
    'B2',
  );
});

for (const [label, Dto, valid, badValues] of [
  [
    'department',
    CreateDepartmentDto,
    d,
    [
      { name: 'x' },
      { name: 'x'.repeat(101) },
      { name: 7 },
      { code: 'A' },
      { code: 'A'.repeat(11) },
      { code: 'C1' },
      { code: null },
    ],
  ],
  [
    'course',
    CreateCourseDto,
    c,
    [
      { code: 'C123' },
      { code: 'CSC12' },
      { code: 'CSC12345' },
      { title: 'ab' },
      { title: 'x'.repeat(151) },
      { credits: 0 },
      { credits: 7 },
      { credits: 1.5 },
      { credits: '3' },
      { description: 'x'.repeat(2001) },
      { departmentId: 0 },
    ],
  ],
  [
    'offering',
    CreateOfferingDto,
    o,
    [
      { courseId: 0 },
      { teacherId: -1 },
      { semester: 'winter' },
      { year: 1999 },
      { year: 2101 },
      { year: 2026.5 },
      { section: '' },
      { section: 'ABCDEF' },
      { section: 'A B' },
      { capacity: 0 },
      { capacity: 501 },
      { capacity: 1.5 },
    ],
  ],
]) {
  test(`${label} rejects every invalid field boundary, missing fields and unknown keys`, async () => {
    for (const values of badValues)
      await assert.rejects(validate(Dto, { ...valid, ...values }), {
        status: 400,
      });
    await assert.rejects(validate(Dto, {}), { status: 400 });
    await assert.rejects(validate(Dto, { ...valid, unauthorized: true }), {
      status: 400,
    });
  });
}

test('minimum/maximum lengths and numeric boundaries are accepted', async () => {
  for (const name of ['AB', 'N'.repeat(100)])
    await validate(CreateDepartmentDto, { ...d, name });
  for (const code of ['AB', 'ABCDEFGHIJ'])
    await validate(CreateDepartmentDto, { ...d, code });
  for (const code of ['AB123', 'ABCDE1234'])
    await validate(CreateCourseDto, { ...c, code });
  for (const credits of [1, 6])
    await validate(CreateCourseDto, { ...c, credits });
  for (const title of ['ABC', 'T'.repeat(150)])
    await validate(CreateCourseDto, { ...c, title });
  await validate(CreateCourseDto, { ...c, description: 'D'.repeat(2000) });
  for (const year of [2000, 2100])
    await validate(CreateOfferingDto, { ...o, year });
  for (const capacity of [1, 500])
    await validate(CreateOfferingDto, { ...o, capacity });
  for (const semester of ['spring', 'summer', 'fall'])
    await validate(CreateOfferingDto, { ...o, semester });
  for (const section of ['1', 'ABCDE'])
    await validate(CreateOfferingDto, { ...o, section });
});

for (const [label, Dto, field] of [
  ['department', UpdateDepartmentDto, 'name'],
  ['course', UpdateCourseDto, 'credits'],
  ['offering', UpdateOfferingDto, 'capacity'],
]) {
  test(`${label} PATCH accepts omission but rejects null for required columns`, async () => {
    await validate(Dto, {});
    await assert.rejects(validate(Dto, { [field]: null }), { status: 400 });
  });
}

test('nullable course description can be omitted, set, or cleared', async () => {
  await validate(UpdateCourseDto, {});
  await validate(UpdateCourseDto, { description: 'Description' });
  assert.equal(
    (await validate(UpdateCourseDto, { description: null })).description,
    null,
  );
});

for (const Dto of [DepartmentQueryDto, CourseQueryDto, OfferingQueryDto]) {
  test(`${Dto.name} supplies defaults, converts page/limit and validates pagination`, async () => {
    const defaults = await validate(Dto, {}, 'query');
    assert.equal(defaults.page, 1);
    assert.equal(defaults.limit, 10);
    assert.equal(defaults.skip, 0);
    const query = await validate(Dto, { page: '3', limit: '5' }, 'query');
    assert.equal(query.skip, 10);
    for (const values of [
      { page: '0' },
      { page: '1.5' },
      { limit: '0' },
      { limit: '101' },
      { page: 'bad' },
    ]) {
      await assert.rejects(validate(Dto, values, 'query'), { status: 400 });
    }
  });
}

test('query IDs and terms transform and reject invalid filters', async () => {
  const course = await validate(
    CourseQueryDto,
    { departmentId: '2', search: 'web' },
    'query',
  );
  assert.equal(course.departmentId, 2);
  const offering = await validate(
    OfferingQueryDto,
    { courseId: '1', teacherId: '2', year: '2026', semester: 'fall' },
    'query',
  );
  assert.equal(offering.year, 2026);
  assert.equal(offering.courseId, 1);
  assert.equal(offering.teacherId, 2);
  for (const values of [
    { courseId: '0' },
    { teacherId: 'x' },
    { year: '2101' },
    { semester: 'winter' },
  ]) {
    await assert.rejects(validate(OfferingQueryDto, values, 'query'), {
      status: 400,
    });
  }
  for (const Dto of [DepartmentQueryDto, CourseQueryDto]) {
    await assert.rejects(validate(Dto, { search: 'x'.repeat(101) }, 'query'), {
      status: 400,
    });
  }
});
