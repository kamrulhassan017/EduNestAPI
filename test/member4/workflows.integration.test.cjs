const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  setup,
  User,
  Department,
  CourseOffering,
  AuditLog,
  Enrollment,
  Grade,
} = require('./helpers.cjs');
let h;
before(async () => {
  h = await setup();
});
after(async () => {
  if (h) await h.close();
});

// All tests run sequentially against one disposable DB. Unique courses isolate cases.
test('three Member 4 migrations apply/revert/reapply, preserve teammate tables, and have zero schema drift', async () => {
  const keep = await h.ds
    .getRepository(Department)
    .save({ name: 'Migration sentinel', code: 'KEEP' });
  assert.deepEqual(
    (await h.ds.driver.createSchemaBuilder().log()).upQueries,
    [],
  );
  for (const table of ['grades', 'enrollments', 'audit_logs']) {
    await h.ds.undoLastMigration();
    assert.equal(
      (await h.ds.query('SELECT to_regclass($1) AS name', [table]))[0].name,
      null,
    );
  }
  assert.equal(await h.ds.getRepository(User).count(), 12);
  assert.ok(await h.ds.getRepository(Department).findOneBy({ id: keep.id }));
  assert.equal(
    (await h.ds.query("SELECT to_regclass('course_offerings') AS name"))[0]
      .name,
    'course_offerings',
  );
  assert.equal(
    (
      await h.ds.query(
        "SELECT count(*)::int AS n FROM pg_type WHERE typname='enrollments_status_enum'",
      )
    )[0].n,
    0,
  );
  await h.ds.runMigrations();
  assert.deepEqual(
    (await h.ds.driver.createSchemaBuilder().log()).upQueries,
    [],
  );
});

test('database constraints match the PDF: audit indexes/no FKs, enrollment unique/restrict, grade unique/cascade/numeric', async () => {
  const runner = h.ds.createQueryRunner();
  try {
    const audit = await runner.getTable('audit_logs');
    assert.equal(audit.foreignKeys.length, 0);
    assert.equal(audit.indices.length, 2);
    const enrollments = await runner.getTable('enrollments');
    assert.ok(
      enrollments.uniques.some(
        (u) => u.name === 'UQ_enrollment_student_offering',
      ),
    );
    assert.deepEqual(
      enrollments.foreignKeys.map((f) => f.onDelete),
      ['RESTRICT', 'RESTRICT'],
    );
    const grades = await runner.getTable('grades');
    assert.ok(
      grades.uniques.some((u) => u.columnNames.join() === 'enrollmentId'),
    );
    assert.equal(
      grades.foreignKeys.find((f) => f.referencedTableName === 'enrollments')
        .onDelete,
      'CASCADE',
    );
    assert.equal(
      grades.foreignKeys.find((f) => f.referencedTableName === 'users')
        .onDelete,
      'RESTRICT',
    );
    for (const [name, precision] of [
      ['marks', 5],
      ['gradePoint', 3],
    ]) {
      const col = grades.columns.find((c) => c.name === name);
      assert.equal(col.precision, precision);
      assert.equal(col.scale, 2);
    }
  } finally {
    await runner.release();
  }
});

test('global audit tracks successful POST/PATCH/DELETE with actor/id/path but not reads or failures', async () => {
  const d = (
    await h.api(
      'POST',
      '/departments',
      { name: 'Audit example', code: 'AUD' },
      201,
    )
  ).data;
  let rows = await h.ds
    .getRepository(AuditLog)
    .findBy({ entity: 'Departments', entityId: String(d.id) });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'DEPARTMENTS_CREATE');
  assert.equal(rows[0].actorId, 1);
  assert.equal(rows[0].actorRole, 'admin');
  assert.deepEqual(rows[0].details, {
    method: 'POST',
    path: '/api/v1/departments',
  });
  const before = await h.ds.getRepository(AuditLog).count();
  await h.api('GET', `/departments/${d.id}`);
  await h.api(
    'POST',
    '/departments',
    { name: 'Audit example', code: 'AUD' },
    409,
  );
  await h.api(
    'PATCH',
    `/departments/${d.id}`,
    { name: 'Unauthorized edit' },
    403,
    3,
  );
  assert.equal(await h.ds.getRepository(AuditLog).count(), before);
  await h.api('PATCH', `/departments/${d.id}`, { name: 'Audit updated' });
  await h.api('DELETE', `/departments/${d.id}`);
  rows = await h.ds
    .getRepository(AuditLog)
    .find({
      where: { entity: 'Departments', entityId: String(d.id) },
      order: { id: 'ASC' },
    });
  assert.deepEqual(
    rows.map((r) => r.action),
    ['DEPARTMENTS_CREATE', 'DEPARTMENTS_UPDATE', 'DEPARTMENTS_DELETE'],
  );
});

test('audit survives actor deletion and admin filters combine with correct pagination', async () => {
  const actor = await h.ds
    .getRepository(User)
    .save({
      id: 90,
      name: 'Temporary',
      email: 'temp@test.invalid',
      role: 'admin',
      passwordHash: 'unused',
    });
  await h.ds
    .getRepository(AuditLog)
    .save({
      actorId: actor.id,
      actorRole: 'admin',
      action: 'USER_DELETED',
      entity: 'User',
      entityId: String(actor.id),
    });
  await h.ds.getRepository(User).delete(actor.id);
  assert.equal(
    await h.ds.getRepository(AuditLog).countBy({ actorId: actor.id }),
    1,
  );
  const result = await h.api(
    'GET',
    '/audit?entity=Departments&action=DEPARTMENTS_CREATE&actorId=1&page=1&limit=1',
  );
  assert.equal(result.data.length, 1);
  assert.equal(result.meta.total, 1);
  assert.equal(result.data[0].actorId, 1);
  for (const id of [2, 3]) await h.api('GET', '/audit', undefined, 403, id);
  await h.api('GET', '/audit', undefined, 401, null);
});

test('PDF enrollment cases 1-4: enroll, duplicate, two seats, full; failure leaves no row', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id, 3);
  assert.equal(e.studentId, 3);
  assert.equal(e.status, 'enrolled');
  assert.equal(e.droppedAt, null);
  assert.equal(e.grade, null);
  await h.api('POST', '/enrollments', { offeringId: o.id }, 409, 3);
  await h.enroll(o.id, 5);
  const full = await h.api(
    'POST',
    '/enrollments',
    { offeringId: o.id },
    409,
    6,
  );
  assert.match(full.message, /full \(2 seats\)/);
  assert.equal(
    await h.ds.getRepository(Enrollment).countBy({ offeringId: o.id }),
    2,
  );
});

test('PDF cases 5-6, 10-12, 14: mine/details/class list/admin filters enforce role and ownership', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id, 3);
  const mine = await h.api(
    'GET',
    '/enrollments/mine?limit=1',
    undefined,
    200,
    3,
  );
  assert.equal(mine.data[0].id, e.id);
  assert.equal(mine.data[0].offering.course.id, o.courseId);
  assert.equal(mine.data[0].offering.teacher.id, 2);
  for (const id of [1, 2, 3])
    await h.api('GET', `/enrollments/${e.id}`, undefined, 200, id);
  for (const id of [4, 5])
    await h.api('GET', `/enrollments/${e.id}`, undefined, 403, id);
  const list = await h.api(
    'GET',
    `/offerings/${o.id}/students?page=1&limit=1`,
    undefined,
    200,
    2,
  );
  assert.equal(list.data[0].student.id, 3);
  assert.deepEqual(list.meta, { page: 1, limit: 1, total: 1, totalPages: 1 });
  for (const id of [3, 4])
    await h.api('GET', `/offerings/${o.id}/students`, undefined, 403, id);
  await h.api('GET', `/offerings/${o.id}/students`, undefined, 200, 1);
  const filtered = await h.api(
    'GET',
    `/enrollments?offeringId=${o.id}&studentId=3&status=enrolled`,
  );
  assert.equal(filtered.meta.total, 1);
  assert.equal(filtered.data[0].id, e.id);
  for (const id of [2, 3])
    await h.api('GET', '/enrollments', undefined, 403, id);
  for (const id of [1, 2])
    await h.api('POST', '/enrollments', { offeringId: o.id }, 403, id);
  for (const id of [1, 2])
    await h.api('GET', '/enrollments/mine', undefined, 403, id);
});

test('PDF cases 7-9, 13: drop frees seat, full prevents reactivation, then re-enroll reuses row; FK protects offering', async () => {
  const o = await h.offering();
  const s1 = await h.enroll(o.id, 3);
  await h.enroll(o.id, 5);
  await h.api('PATCH', `/enrollments/${s1.id}/drop`, undefined, 403, 5);
  await h.api('PATCH', `/enrollments/${s1.id}/drop`, undefined, 403, 2);
  const dropped = (
    await h.api('PATCH', `/enrollments/${s1.id}/drop`, undefined, 200, 3)
  ).data;
  assert.equal(dropped.status, 'dropped');
  assert.ok(dropped.droppedAt);
  await h.api('PATCH', `/enrollments/${s1.id}/drop`, undefined, 409, 3);
  const s3 = await h.enroll(o.id, 6);
  await h.api('POST', '/enrollments', { offeringId: o.id }, 409, 3);
  const unchanged = await h.ds
    .getRepository(Enrollment)
    .findOneByOrFail({ id: s1.id });
  assert.equal(unchanged.status, 'dropped');
  assert.ok(unchanged.droppedAt);
  await h.api('PATCH', `/enrollments/${s3.id}/drop`, undefined, 200, 1);
  const reactivated = await h.enroll(o.id, 3);
  assert.equal(reactivated.id, s1.id);
  assert.equal(reactivated.droppedAt, null);
  assert.equal(reactivated.enrolledAt, s1.enrolledAt);
  const classList = await h.api(
    'GET',
    `/offerings/${o.id}/students`,
    undefined,
    200,
    2,
  );
  assert.deepEqual(
    classList.data.map((e) => e.studentId),
    [3, 5],
  );
  const filtered = await h.api(
    'GET',
    `/enrollments?offeringId=${o.id}&status=dropped`,
  );
  assert.equal(filtered.meta.total, 1);
  assert.equal(filtered.data[0].studentId, 6);
  await h.api('DELETE', `/offerings/${o.id}`, undefined, 409);
  await h.api('PATCH', `/enrollments/${s1.id}/drop`, undefined, 200, 3);
  const other = classList.data.find((e) => e.studentId === 5);
  await h.api('PATCH', `/enrollments/${other.id}/drop`);
  await h.api('DELETE', `/offerings/${o.id}`, undefined, 409); // history also protected
});

test('same-course/same-term prohibits another section; different semester/year are permitted', async () => {
  const a = await h.offering();
  const b = await h.offering({ courseId: a.courseId, section: 'B' });
  const nextSemester = await h.offering({
    courseId: a.courseId,
    semester: 'spring',
  });
  const nextYear = await h.offering({ courseId: a.courseId, year: 2027 });
  await h.enroll(a.id, 7);
  await h.api('POST', '/enrollments', { offeringId: b.id }, 409, 7);
  await h.enroll(nextSemester.id, 7);
  await h.enroll(nextYear.id, 7);
});

test('concurrent last-seat requests never overbook: exactly capacity succeeds and the others conflict', async () => {
  const o = await h.offering({ capacity: 2 });
  h.queries.length = 0;
  const results = await Promise.all(
    [3, 5, 6, 7, 8, 9, 10, 11].map((id) =>
      h.raw('POST', '/enrollments', { offeringId: o.id }, id),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 2);
  assert.equal(results.filter((r) => r.status === 409).length, 6);
  assert.equal(
    await h.ds
      .getRepository(Enrollment)
      .countBy({ offeringId: o.id, status: 'enrolled' }),
    2,
  );
  assert.ok(h.queries.some((q) => /START TRANSACTION/.test(q)));
  assert.ok(
    h.queries.some((q) => /FOR UPDATE/.test(q) && /course_offerings/.test(q)),
  );
  assert.ok(h.queries.some((q) => /COMMIT/.test(q)));
  assert.ok(h.queries.some((q) => /ROLLBACK/.test(q)));
});

test('concurrent different-section enrollment for the same student cannot bypass the course/term rule', async () => {
  // Repeat on several fresh courses to exercise separate offering locks.
  for (let round = 0; round < 4; round++) {
    const a = await h.offering();
    const b = await h.offering({ courseId: a.courseId, section: 'B' });
    const results = await Promise.all(
      [a, b].map((o) => h.raw('POST', '/enrollments', { offeringId: o.id }, 3)),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const total = await h.ds
      .getRepository(Enrollment)
      .count({ where: { studentId: 3, offering: { courseId: a.courseId } } });
    assert.equal(total, 1);
  }
});

test('concurrent duplicate and dropped-row reactivation produce one active row', async () => {
  const o = await h.offering();
  let results = await Promise.all(
    [1, 2].map(() => h.raw('POST', '/enrollments', { offeringId: o.id }, 3)),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const id = results.find((r) => r.status === 201).json.data.id;
  await h.api('PATCH', `/enrollments/${id}/drop`, undefined, 200, 3);
  results = await Promise.all(
    [1, 2].map(() => h.raw('POST', '/enrollments', { offeringId: o.id }, 3)),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(results.find((r) => r.status === 201).json.data.id, id);
  assert.equal(
    await h.ds.getRepository(Enrollment).countBy({ offeringId: o.id }),
    1,
  );
});

test('concurrent drops serialize: one succeeds, one conflicts', async () => {
  const e = await h.enroll((await h.offering()).id);
  const results = await Promise.all(
    [1, 2].map(() => h.raw('PATCH', `/enrollments/${e.id}/drop`, undefined, 3)),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});

test('PDF grading cases 1-2, 8-11: numeric grade, update same row, audit old/new, mine/class grades, no drop', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id);
  const first = (
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 82 }, 200, 2)
  ).data;
  assert.equal(first.marks, 82);
  assert.equal(first.letter, 'A+');
  assert.equal(first.gradePoint, 4);
  assert.equal(typeof first.gradePoint, 'number');
  assert.equal(first.gradedById, 2);
  assert.equal(first.enrollment.student.id, 3);
  assert.equal(first.gradedBy.id, 2);
  const changed = (
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 67.5 }, 200, 2)
  ).data;
  assert.equal(changed.id, first.id);
  assert.equal(changed.letter, 'B+');
  assert.equal(changed.gradePoint, 3.25);
  const mine = await h.api(
    'GET',
    '/enrollments/mine?limit=100',
    undefined,
    200,
    3,
  );
  assert.equal(mine.data.find((r) => r.id === e.id).grade.id, first.id);
  for (const id of [1, 3])
    await h.api('PATCH', `/enrollments/${e.id}/drop`, undefined, 409, id);
  const grades = await h.api(
    'GET',
    `/offerings/${o.id}/grades`,
    undefined,
    200,
    2,
  );
  assert.equal(grades.data.length, 1);
  assert.equal(grades.data[0].enrollment.student.name, 'student 3');
  assert.equal(grades.meta, null);
  const students = await h.api(
    'GET',
    `/offerings/${o.id}/students`,
    undefined,
    200,
    2,
  );
  assert.equal(students.data[0].grade.gradePoint, 3.25);
  const audit = await h.api('GET', '/audit?entity=Grade');
  const rows = audit.data
    .filter((r) => r.entityId === String(first.id))
    .reverse();
  assert.deepEqual(
    rows.map((r) => r.action),
    ['GRADE_GIVEN', 'GRADE_CHANGED'],
  );
  assert.deepEqual(
    rows.map((r) => r.details),
    [
      { enrollmentId: e.id, oldMarks: null, newMarks: 82, letter: 'A+' },
      { enrollmentId: e.id, oldMarks: 82, newMarks: 67.5, letter: 'B+' },
    ],
  );
  assert.equal(
    await h.ds.getRepository(AuditLog).countBy({ entity: 'Grades' }),
    0,
  );
});

test('PDF grading cases 3-6: invalid marks, another teacher/student, and dropped enrollment fail with no grade audit', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id);
  const before = await h.ds
    .getRepository(AuditLog)
    .countBy({ entity: 'Grade' });
  for (const marks of [-1, 120, 82.555, '82', null])
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks }, 400, 2);
  for (const id of [3, 4])
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 82 }, 403, id);
  await h.api('PATCH', `/enrollments/${e.id}/drop`, undefined, 200, 3);
  await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 82 }, 400, 2);
  assert.equal(
    await h.ds.getRepository(Grade).countBy({ enrollmentId: e.id }),
    0,
  );
  assert.equal(
    await h.ds.getRepository(AuditLog).countBy({ entity: 'Grade' }),
    before,
  );
});

test('admin can grade/update, but offering grades are forbidden to students and another teacher', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id);
  const grade = (await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 0 }))
    .data;
  assert.equal(grade.letter, 'F');
  assert.equal(grade.gradePoint, 0);
  assert.equal(grade.gradedById, 1);
  const updated = (
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 100 })
  ).data;
  assert.equal(updated.id, grade.id);
  assert.equal(updated.gradePoint, 4);
  const logs = await h.ds
    .getRepository(AuditLog)
    .find({
      where: { entity: 'Grade', entityId: String(grade.id) },
      order: { id: 'ASC' },
    });
  assert.equal(logs[1].action, 'GRADE_CHANGED');
  assert.equal(logs[1].details.oldMarks, 0);
  for (const id of [3, 4])
    await h.api('GET', `/offerings/${o.id}/grades`, undefined, 403, id);
  await h.api('GET', `/offerings/${o.id}/grades`);
  for (const id of [1, 2])
    await h.api('GET', '/grades/mine', undefined, 403, id);
});

test('transcript is isolated, empty CGPA is null, failed credits count, ungraded/dropped excluded, CGPA weighted and rounded', async () => {
  const empty = (await h.api('GET', '/grades/mine', undefined, 200, 12)).data;
  assert.deepEqual(empty, {
    studentId: 12,
    courses: [],
    totalCredits: 0,
    cgpa: null,
  });
  for (const [credits, marks] of [
    [3, 82.5],
    [2, 67.5],
    [1, 0],
  ]) {
    const c = await h.course(credits);
    const o = await h.offering({ courseId: c.id });
    const e = await h.enroll(o.id, 12);
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks }, 200, 2);
  }
  await h.enroll((await h.offering()).id, 12); // ungraded
  const dropped = await h.enroll((await h.offering()).id, 12);
  await h.api('PATCH', `/enrollments/${dropped.id}/drop`, undefined, 200, 12);
  const transcript = (await h.api('GET', '/grades/mine', undefined, 200, 12))
    .data;
  assert.equal(transcript.studentId, 12);
  assert.equal(transcript.courses.length, 3);
  assert.equal(transcript.totalCredits, 6);
  assert.equal(transcript.cgpa, 3.08);
  assert.deepEqual(
    transcript.courses.map((r) => r.letter),
    ['A+', 'B+', 'F'],
  );
  assert.equal(transcript.courses[0].marks, 82.5);
  assert.equal(transcript.courses[0].semester, 'fall');
  assert.equal(transcript.courses[0].year, 2026);
  assert.ok(transcript.courses.every((r) => r.courseCode && r.courseTitle));
  const another = (await h.api('GET', '/grades/mine', undefined, 200, 11)).data;
  assert.deepEqual(another.courses, []);
});

test('concurrent first grades upsert once and preserve accurate audit old/new chain', async () => {
  const e = await h.enroll((await h.offering()).id);
  const results = await Promise.all(
    [82, 67.5].map((marks) =>
      h.raw('PUT', `/enrollments/${e.id}/grade`, { marks }, 2),
    ),
  );
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200],
  );
  assert.equal(results[0].json.data.id, results[1].json.data.id);
  assert.equal(
    await h.ds.getRepository(Grade).countBy({ enrollmentId: e.id }),
    1,
  );
  const rows = await h.ds
    .getRepository(AuditLog)
    .findBy({ entity: 'Grade', entityId: String(results[0].json.data.id) });
  assert.equal(rows.length, 2);
  const given = rows.find((r) => r.action === 'GRADE_GIVEN');
  const changed = rows.find((r) => r.action === 'GRADE_CHANGED');
  assert.equal(given.details.oldMarks, null);
  assert.equal(changed.details.oldMarks, given.details.newMarks);
  assert.equal(
    (await h.ds.getRepository(Grade).findOneByOrFail({ enrollmentId: e.id }))
      .marks,
    changed.details.newMarks,
  );
});

test('concurrent grade-versus-drop never leaves a graded dropped enrollment', async () => {
  for (let round = 0; round < 6; round++) {
    const e = await h.enroll((await h.offering()).id);
    const jobs = [
      () => h.raw('PUT', `/enrollments/${e.id}/grade`, { marks: 82 }, 2),
      () => h.raw('PATCH', `/enrollments/${e.id}/drop`, undefined, 3),
    ];
    if (round % 2) jobs.reverse();
    const results = await Promise.all(jobs.map((job) => job()));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.some((r) => r.status === 400 || r.status === 409));
    const final = await h.ds
      .getRepository(Enrollment)
      .findOneOrFail({ where: { id: e.id }, relations: { grade: true } });
    assert.ok(
      final.status === 'enrolled' ? final.grade !== null : final.grade === null,
    );
  }
});

test('audit database failure does not fail a real catalogue write or committed grade', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id);
  await h.ds.query(
    'ALTER TABLE "audit_logs" RENAME TO "member4_audit_unavailable"',
  );
  try {
    await h.api('PATCH', `/offerings/${o.id}`, { section: 'B' });
    const g = await h.api(
      'PUT',
      `/enrollments/${e.id}/grade`,
      { marks: 82 },
      200,
      2,
    );
    assert.equal(g.data.gradePoint, 4);
  } finally {
    await h.ds.query(
      'ALTER TABLE "member4_audit_unavailable" RENAME TO "audit_logs"',
    );
  }
});

test('DB uniqueness/restrict/cascade constraints are effective, not just documented', async () => {
  const o = await h.offering();
  const e = await h.enroll(o.id);
  const g = (
    await h.api('PUT', `/enrollments/${e.id}/grade`, { marks: 82 }, 200, 2)
  ).data;
  await assert.rejects(
    h.ds.getRepository(Enrollment).save({ studentId: 3, offeringId: o.id }),
    { code: '23505' },
  );
  await assert.rejects(
    h.ds
      .getRepository(Grade)
      .save({
        enrollmentId: e.id,
        marks: 50,
        letter: 'C+',
        gradePoint: 2.5,
        gradedById: 2,
      }),
    { code: '23505' },
  );
  await assert.rejects(h.ds.getRepository(User).delete(3), { code: '23503' });
  await assert.rejects(h.ds.getRepository(User).delete(2), { code: '23503' });
  await h.ds.getRepository(Enrollment).delete(e.id);
  assert.equal(await h.ds.getRepository(Grade).countBy({ id: g.id }), 0);
  assert.ok(
    await h.ds
      .getRepository(AuditLog)
      .findOneBy({ entity: 'Grade', entityId: String(g.id) }),
  );
});

test('all ten endpoints reject unauthenticated requests', async () => {
  for (const [method, path, body] of [
    ['GET', '/audit'],
    ['POST', '/enrollments', { offeringId: 1 }],
    ['GET', '/enrollments/mine'],
    ['GET', '/enrollments'],
    ['GET', '/enrollments/1'],
    ['PATCH', '/enrollments/1/drop'],
    ['GET', '/offerings/1/students'],
    ['PUT', '/enrollments/1/grade', { marks: 82 }],
    ['GET', '/grades/mine'],
    ['GET', '/offerings/1/grades'],
  ])
    await h.api(method, path, body, 401, null);
});

test('missing IDs return 404; malformed paths, filters and forged studentId return 400', async () => {
  for (const [method, template, body, id] of [
    ['POST', '/enrollments', { offeringId: 999999 }, 3],
    ['GET', '/enrollments/ID', undefined, 3],
    ['PATCH', '/enrollments/ID/drop', undefined, 3],
    ['GET', '/offerings/ID/students', undefined, 2],
    ['PUT', '/enrollments/ID/grade', { marks: 82 }, 2],
    ['GET', '/offerings/ID/grades', undefined, 2],
  ]) {
    await h.api(method, template.replace('ID', '999999'), body, 404, id);
    if (template.includes('ID'))
      await h.api(method, template.replace('ID', 'abc'), body, 400, id);
  }
  for (const body of [
    {},
    { offeringId: 0 },
    { offeringId: '1' },
    { offeringId: 1, studentId: 5 },
  ])
    await h.api('POST', '/enrollments', body, 400, 3);
  for (const query of [
    'status=invalid',
    'studentId=0',
    'offeringId=abc',
    'page=0',
    'limit=101',
    'extra=x',
  ])
    await h.api('GET', `/enrollments?${query}`, undefined, 400);
  for (const query of [
    'actorId=0',
    `entity=${'x'.repeat(51)}`,
    `action=${'x'.repeat(51)}`,
    'page=0',
    'limit=101',
  ])
    await h.api('GET', `/audit?${query}`, undefined, 400);
  await h.api('GET', '/enrollments/mine?studentId=5', undefined, 400, 3);
});

test('all ten new Swagger operations have models/envelopes/security/errors, without secret fields', async () => {
  const spec = await (await fetch(`${h.url}/api/docs-json`)).json();
  const operations = [
    ['get', '/audit', true],
    ['post', '/enrollments'],
    ['get', '/enrollments', true],
    ['get', '/enrollments/mine', true],
    ['get', '/enrollments/{id}'],
    ['patch', '/enrollments/{id}/drop'],
    ['get', '/offerings/{id}/students', true],
    ['put', '/enrollments/{id}/grade'],
    ['get', '/grades/mine'],
    ['get', '/offerings/{id}/grades', false, true],
  ];
  for (const [method, path, paginated, array] of operations) {
    const op = spec.paths[`/api/v1${path}`][method];
    assert.ok(op.summary);
    assert.deepEqual(op.security, [{ 'access-token': [] }]);
    const schema =
      op.responses[method === 'post' ? 201 : 200].content['application/json']
        .schema;
    assert.deepEqual(schema.required, ['success', 'message', 'data', 'meta']);
    if (paginated || array) assert.equal(schema.properties.data.type, 'array');
    if (paginated)
      assert.equal(
        schema.properties.meta.$ref,
        '#/components/schemas/PaginationMetaDto',
      );
    else assert.equal(schema.properties.meta.nullable, true);
    assert.ok(op.responses[401]);
    assert.ok(op.responses[403]);
  }
  for (const model of [
    'AuditLog',
    'Enrollment',
    'Grade',
    'TranscriptDto',
    'TranscriptRowDto',
  ])
    assert.ok(spec.components.schemas[model]);
  assert.equal(spec.components.schemas.Grade.properties.marks.type, 'number');
  assert.equal(
    spec.components.schemas.SetGradeDto.properties.marks.maximum,
    100,
  );
  assert.equal(
    spec.components.schemas.TranscriptDto.properties.cgpa.nullable,
    true,
  );
  assert.ok(
    !Object.hasOwn(
      spec.components.schemas.CreateEnrollmentDto.properties,
      'studentId',
    ),
  );
  assert.ok(
    !Object.hasOwn(spec.components.schemas.User.properties, 'passwordHash'),
  );
  assert.equal((await fetch(`${h.url}/api/docs`)).status, 200);
});
