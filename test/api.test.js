import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
const { default: app } = await import('../src/app.js');
const { store } = await import('../src/data/store.js');

let adminToken;
let teacherToken;
let studentToken;
let studentId;
let subjectId;

before(async () => {
  const admin = { id: '00000000-0000-4000-8000-000000000001', name: 'Admin', email: 'admin@test.local', role: 'admin', passwordHash: await bcrypt.hash('AdminPass123', 4), createdAt: new Date().toISOString() };
  const teacher = { id: '00000000-0000-4000-8000-000000000002', name: 'Teacher', email: 'teacher@test.local', role: 'teacher', passwordHash: await bcrypt.hash('TeacherPass123', 4), createdAt: new Date().toISOString() };
  store.users.set(admin.id, admin);
  store.users.set(teacher.id, teacher);
  const teacherRecord = { id: '00000000-0000-4000-8000-000000000003', name: teacher.name, email: teacher.email, phone: '', subject: '', createdAt: teacher.createdAt, userId: teacher.id };
  store.teachers.set(teacherRecord.id, teacherRecord);
  adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { subject: admin.id });
  teacherToken = jwt.sign({ role: 'teacher' }, process.env.JWT_SECRET, { subject: teacher.id });
});

beforeEach(() => {
  store.students.clear();
  store.classes.clear();
  store.subjects.clear();
  store.results.clear();
  studentToken = undefined;
  studentId = undefined;
  subjectId = undefined;
});

describe('authentication and role access', () => {
  it('registers a student with a token and never returns a password hash', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Student', email: 'student@test.local', password: 'StudentPass123' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.user.role, 'student');
    assert.equal('passwordHash' in response.body.data.user, false);
    assert.equal([...store.users.values()].at(-1).passwordHash.startsWith('$2'), true);
    studentToken = response.body.data.token;
    studentId = response.body.data.student.id;
    const login = await request(app).post('/api/auth/login').send({ email: 'student@test.local', password: 'StudentPass123' });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.id, response.body.data.user.id);
    assert.equal('passwordHash' in login.body.data.user, false);
  });

  it('rejects self-assigned admin and invalid credentials', async () => {
    const escalated = await request(app).post('/api/auth/register').send({ name: 'Bad', email: 'bad@test.local', password: 'Password123', role: 'admin' });
    assert.equal(escalated.status, 403);
    const invalid = await request(app).post('/api/auth/login').send({ email: 'absent@test.local', password: 'Password123' });
    assert.equal(invalid.status, 401);
  });

  it('returns 401 when a protected route has no token and 403 for disallowed writes', async () => {
    const unauthenticated = await request(app).get('/api/students');
    assert.equal(unauthenticated.status, 401);
    const registration = await request(app).post('/api/auth/register').send({ name: 'Student', email: `${randomUUID()}@test.local`, password: 'StudentPass123' });
    const forbidden = await request(app).post('/api/students').set('Authorization', `Bearer ${registration.body.data.token}`).send({ name: 'Another', email: 'another@test.local' });
    assert.equal(forbidden.status, 403);
  });

  it('allows admin to provision a teacher but rejects admin role provisioning', async () => {
    const teacher = await request(app).post('/api/auth/users').set('Authorization', `Bearer ${adminToken}`).send({ name: 'New Teacher', email: 'newteacher@test.local', password: 'TeacherPass123', role: 'teacher' });
    assert.equal(teacher.status, 201);
    const forbiddenAdmin = await request(app).post('/api/auth/users').set('Authorization', `Bearer ${adminToken}`).send({ name: 'New Admin', email: 'newadmin@test.local', password: 'AdminPass123', role: 'admin' });
    assert.equal(forbiddenAdmin.status, 400);
  });
});

describe('school record CRUD', () => {
  it('validates bodies and related IDs', async () => {
    const invalidEmail = await request(app).post('/api/students').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Invalid', email: 'bad-email' });
    assert.equal(invalidEmail.status, 400);
    const invalidRelation = await request(app).post('/api/results').set('Authorization', `Bearer ${adminToken}`).send({ studentId: '00000000-0000-4000-8000-000000000111', subjectId: '00000000-0000-4000-8000-000000000222', score: 50, grade: 'C', term: 'Term 1', session: '2026/2027' });
    assert.equal(invalidRelation.status, 400);
    const invalidScore = await request(app).post('/api/results').set('Authorization', `Bearer ${adminToken}`).send({ studentId: '00000000-0000-4000-8000-000000000111', subjectId: '00000000-0000-4000-8000-000000000222', score: 101, grade: 'A', term: 'Term 1', session: '2026/2027' });
    assert.equal(invalidScore.status, 400);
  });

  it('supports admin CRUD across students, teachers, classes, and subjects', async () => {
    const student = await request(app).post('/api/students').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Learner', email: 'learner@test.local' });
    assert.equal(student.status, 201);
    const studentRecord = student.body.data;
    assert.equal((await request(app).get('/api/students').set('Authorization', `Bearer ${adminToken}`)).status, 200);
    assert.equal((await request(app).get(`/api/students/${studentRecord.id}`).set('Authorization', `Bearer ${adminToken}`)).status, 200);
    assert.equal((await request(app).put(`/api/students/${studentRecord.id}`).set('Authorization', `Bearer ${adminToken}`).send({ phone: '12345' })).body.data.phone, '12345');

    const teacher = await request(app).post('/api/teachers').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Teacher', email: 'crudteacher@test.local' });
    const classResponse = await request(app).post('/api/classes').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Grade 1', teacherId: teacher.body.data.id });
    const subject = await request(app).post('/api/subjects').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Math', code: 'M1', classId: classResponse.body.data.id });
    assert.equal(teacher.status, 201);
    assert.equal(classResponse.status, 201);
    assert.equal(subject.status, 201);
    for (const path of ['/teachers', '/classes', '/subjects']) assert.equal((await request(app).get(`/api${path}`).set('Authorization', `Bearer ${adminToken}`)).status, 200);
    const records = [
      ['students', studentRecord.id, { phone: '67890' }],
      ['teachers', teacher.body.data.id, { phone: '54321' }],
      ['classes', classResponse.body.data.id, { level: 'Grade 2' }],
      ['subjects', subject.body.data.id, { name: 'Advanced Math' }],
    ];
    for (const [path, id, update] of records) {
      assert.equal((await request(app).get(`/api/${path}/${id}`).set('Authorization', `Bearer ${adminToken}`)).status, 200);
      assert.equal((await request(app).put(`/api/${path}/${id}`).set('Authorization', `Bearer ${adminToken}`).send(update)).status, 200);
      assert.equal((await request(app).delete(`/api/${path}/${id}`).set('Authorization', `Bearer ${adminToken}`)).status, 204);
    }
  });

  it('lets teachers create and update results but not delete students', async () => {
    const student = await request(app).post('/api/students').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Learner', email: 'resultstudent@test.local' });
    const subject = await request(app).post('/api/subjects').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Science', code: 'SCI' });
    studentId = student.body.data.id;
    subjectId = subject.body.data.id;
    const result = await request(app).post('/api/results').set('Authorization', `Bearer ${teacherToken}`).send({ studentId, subjectId, score: 85, grade: 'A', term: 'Term 1', session: '2026/2027' });
    assert.equal(result.status, 201);
    assert.equal((await request(app).get('/api/results').set('Authorization', `Bearer ${teacherToken}`)).status, 200);
    assert.equal((await request(app).get(`/api/results/${result.body.data.id}`).set('Authorization', `Bearer ${teacherToken}`)).status, 200);
    assert.equal((await request(app).put(`/api/results/${result.body.data.id}`).set('Authorization', `Bearer ${teacherToken}`).send({ score: 90 })).body.data.score, 90);
    assert.equal((await request(app).delete(`/api/students/${studentId}`).set('Authorization', `Bearer ${teacherToken}`)).status, 403);
    assert.equal((await request(app).delete(`/api/results/${result.body.data.id}`).set('Authorization', `Bearer ${adminToken}`)).status, 204);
  });

  it('limits students to their profile and own results', async () => {
    const registered = await request(app).post('/api/auth/register').send({ name: 'Mine', email: `${randomUUID()}@test.local`, password: 'StudentPass123' });
    studentToken = registered.body.data.token;
    studentId = registered.body.data.student.id;
    assert.equal((await request(app).get('/api/students').set('Authorization', `Bearer ${studentToken}`)).body.data.length, 1);
    const unrelated = await request(app).post('/api/students').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Other', email: 'other@test.local' });
    const forbiddenProfile = await request(app).get(`/api/students/${unrelated.body.data.id}`).set('Authorization', `Bearer ${studentToken}`);
    assert.equal(forbiddenProfile.status, 403);
    const subject = await request(app).post('/api/subjects').set('Authorization', `Bearer ${adminToken}`).send({ name: 'History', code: 'HIS' });
    const ownResult = await request(app).post('/api/results').set('Authorization', `Bearer ${adminToken}`).send({ studentId, subjectId: subject.body.data.id, score: 70, grade: 'B', term: 'Term 2', session: '2026/2027' });
    const otherResult = await request(app).post('/api/results').set('Authorization', `Bearer ${adminToken}`).send({ studentId: unrelated.body.data.id, subjectId: subject.body.data.id, score: 70, grade: 'B', term: 'Term 2', session: '2026/2027' });
    const results = await request(app).get('/api/results').set('Authorization', `Bearer ${studentToken}`);
    assert.deepEqual(results.body.data.map((record) => record.id), [ownResult.body.data.id]);
    assert.equal((await request(app).get(`/api/results/${otherResult.body.data.id}`).set('Authorization', `Bearer ${studentToken}`)).status, 403);
  });

  it('uses consistent not-found and missing-route errors', async () => {
    const missing = await request(app).get('/api/students/00000000-0000-4000-8000-000000000099').set('Authorization', `Bearer ${adminToken}`);
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { success: false, message: 'Student not found' });
    const route = await request(app).get('/missing');
    assert.equal(route.status, 404);
    assert.equal(route.body.success, false);
  });
});