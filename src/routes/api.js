import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { store, collections } from '../data/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { validateBody, validateId, validateQuery } from '../utils/validation.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const credentialSchema = {
  name: { type: 'string', required: true },
  email: { type: 'email', required: true },
  password: { type: 'password', required: true },
};

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function issueToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '2h' });
}

function getRecord(collectionName, id, label) {
  validateId(id);
  const record = collections[collectionName].find((item) => item.id === id);
  if (!record) throw new AppError(404, `${label[0].toUpperCase()}${label.slice(1)} not found`);
  return record;
}

function sendRecord(res, record, status = 200) {
  return res.status(status).json({ success: true, data: record });
}

router.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
  validateBody(req.body, { ...credentialSchema, role: { type: 'role' } });
  const requestedRole = req.body.role ?? 'student';
  if (requestedRole !== 'student') throw new AppError(403, 'Public registration is limited to student accounts');
  const email = req.body.email.trim().toLowerCase();
  if (store.users.some((user) => user.email === email)) throw new AppError(409, 'Email is already registered');

  const user = {
    id: randomUUID(),
    name: req.body.name.trim(),
    email,
    role: 'student',
    passwordHash: await bcrypt.hash(req.body.password, 12),
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  const student = { id: randomUUID(), name: user.name, email, phone: '', classId: null, createdAt: user.createdAt, userId: user.id };
  store.students.push(student);
  sendRecord(res, { user: publicUser(user), token: issueToken(user), student }, 201);
}));

router.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  validateBody(req.body, { email: { type: 'email', required: true }, password: { type: 'password', required: true } });
  const email = req.body.email.trim().toLowerCase();
  const user = store.users.find((item) => item.email === email);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  sendRecord(res, { user: publicUser(user), token: issueToken(user) });
}));

router.post('/auth/users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  validateBody(req.body, { ...credentialSchema, role: { type: 'role', required: true } });
  if (req.body.role === 'admin') throw new AppError(400, 'Admin accounts are provisioned through environment configuration');
  const email = req.body.email.trim().toLowerCase();
  if (store.users.some((user) => user.email === email)) throw new AppError(409, 'Email is already registered');
  const user = {
    id: randomUUID(), name: req.body.name.trim(), email, role: req.body.role,
    passwordHash: await bcrypt.hash(req.body.password, 12), createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  if (user.role === 'teacher') store.teachers.push({ id: randomUUID(), name: user.name, email, phone: '', subject: '', createdAt: user.createdAt, userId: user.id });
  if (user.role === 'student') store.students.push({ id: randomUUID(), name: user.name, email, phone: '', classId: null, createdAt: user.createdAt, userId: user.id });
  sendRecord(res, publicUser(user), 201);
}));

router.use(authenticate);

for (const [path, name, schema] of [
  ['/students', 'students', {
    name: { type: 'string', required: true }, email: { type: 'email', required: true }, phone: { type: 'string' }, classId: { type: 'uuid' },
  }],
  ['/teachers', 'teachers', {
    name: { type: 'string', required: true }, email: { type: 'email', required: true }, phone: { type: 'string' }, subject: { type: 'string' },
  }],
  ['/classes', 'classes', {
    name: { type: 'string', required: true }, level: { type: 'string' }, teacherId: { type: 'uuid' },
  }],
  ['/subjects', 'subjects', {
    name: { type: 'string', required: true }, code: { type: 'string', required: true }, teacherId: { type: 'uuid' }, classId: { type: 'uuid' },
  }],
  ['/results', 'results', {
    studentId: { type: 'uuid', required: true }, subjectId: { type: 'uuid', required: true }, score: { type: 'score', required: true },
    grade: { type: 'string', required: true }, term: { type: 'string', required: true }, session: { type: 'string', required: true },
  }],
]) {
  const route = Router();
  const managerRoles = name === 'results' ? ['admin', 'teacher'] : ['admin'];
  const readerRoles = name === 'students' ? ['admin', 'teacher', 'student']
    : name === 'teachers' ? ['admin', 'teacher'] : ['admin', 'teacher', 'student'];

  route.get('/', authorize(...readerRoles), (req, res) => {
    validateQuery(req.query);
    let items = collections[name];
    if (req.user.role === 'student') {
      if (name === 'students') items = items.filter((item) => item.userId === req.user.id);
      else if (name === 'results') {
        const student = store.students.find((item) => item.userId === req.user.id);
        items = items.filter((item) => item.studentId === student?.id);
      } else if (name === 'classes') {
        const student = store.students.find((item) => item.userId === req.user.id);
        items = items.filter((item) => item.id === student?.classId);
      }
    }
    sendRecord(res, items);
  });

  route.get('/:id', authorize(...readerRoles), (req, res) => {
    const item = getRecord(name, req.params.id, name.slice(0, -1));
    if (req.user.role === 'student') {
      const student = store.students.find((record) => record.userId === req.user.id);
      const owns = name === 'students' ? item.userId === req.user.id
        : name === 'results' ? item.studentId === student?.id
          : name === 'classes' ? item.id === student?.classId : true;
      if (!owns) throw new AppError(403, 'Forbidden');
    }
    sendRecord(res, item);
  });

  route.post('/', authorize(...managerRoles), (req, res) => {
    validateBody(req.body, schema);
    for (const field of ['classId', 'teacherId', 'studentId', 'subjectId']) {
      const collection = { classId: 'classes', teacherId: 'teachers', studentId: 'students', subjectId: 'subjects' }[field];
      if (req.body[field] && !collections[collection].some((record) => record.id === req.body[field])) {
        throw new AppError(400, `${field} does not reference an existing record`);
      }
    }
    const record = { ...req.body, id: randomUUID(), createdAt: new Date().toISOString() };
    collections[name].push(record);
    sendRecord(res, record, 201);
  });

  route.put('/:id', authorize(...managerRoles), (req, res) => {
    validateId(req.params.id);
    validateBody(req.body, schema, { partial: true });
    if (Object.keys(req.body).length === 0) throw new AppError(400, 'At least one field is required');
    const record = getRecord(name, req.params.id, name.slice(0, -1));
    for (const field of ['classId', 'teacherId', 'studentId', 'subjectId']) {
      const collection = { classId: 'classes', teacherId: 'teachers', studentId: 'students', subjectId: 'subjects' }[field];
      if (req.body[field] && !collections[collection].some((item) => item.id === req.body[field])) {
        throw new AppError(400, `${field} does not reference an existing record`);
      }
    }
    Object.assign(record, req.body);
    sendRecord(res, record);
  });

  route.delete('/:id', authorize(...(name === 'results' ? ['admin'] : ['admin'])), (req, res) => {
    validateId(req.params.id);
    const index = collections[name].findIndex((record) => record.id === req.params.id);
    if (index < 0) {
      const label = name.slice(0, -1);
      throw new AppError(404, `${label[0].toUpperCase()}${label.slice(1)} not found`);
    }
    collections[name].splice(index, 1);
    res.status(204).end();
  });

  router.use(path, route);
}

export default router;