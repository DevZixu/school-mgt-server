import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { store } from '../data/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { validateBody } from '../utils/validation.js';
import { studentsController } from '../controllers/studentsController.js';
import { teachersController } from '../controllers/teachersController.js';
import { classesController } from '../controllers/classesController.js';
import { subjectsController } from '../controllers/subjectsController.js';
import { resultsController } from '../controllers/resultsController.js';

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

function sendRecord(res, record, status = 200) {
  return res.status(status).json({ success: true, data: record });
}

router.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
  validateBody(req.body, { ...credentialSchema, role: { type: 'role' } });
  const requestedRole = req.body.role ?? 'student';
  if (requestedRole !== 'student') throw new AppError(403, 'Public registration is limited to student accounts');
  const email = req.body.email.trim().toLowerCase();
  if ([...store.users.values()].some((user) => user.email === email)) throw new AppError(409, 'Email is already registered');

  const user = {
    id: randomUUID(),
    name: req.body.name.trim(),
    email,
    role: 'student',
    passwordHash: await bcrypt.hash(req.body.password, 12),
    createdAt: new Date().toISOString(),
  };
  store.users.set(user.id, user);
  const student = { id: randomUUID(), name: user.name, email, phone: '', classId: null, createdAt: user.createdAt, userId: user.id };
  store.students.set(student.id, student);
  sendRecord(res, { user: publicUser(user), token: issueToken(user), student }, 201);
}));

router.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  validateBody(req.body, { email: { type: 'email', required: true }, password: { type: 'password', required: true } });
  const email = req.body.email.trim().toLowerCase();
  const user = [...store.users.values()].find((item) => item.email === email);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  sendRecord(res, { user: publicUser(user), token: issueToken(user) });
}));

router.post('/auth/users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  validateBody(req.body, { ...credentialSchema, role: { type: 'role', required: true } });
  if (req.body.role === 'admin') throw new AppError(400, 'Admin accounts are provisioned through environment configuration');
  const email = req.body.email.trim().toLowerCase();
  if ([...store.users.values()].some((user) => user.email === email)) throw new AppError(409, 'Email is already registered');
  const user = {
    id: randomUUID(), name: req.body.name.trim(), email, role: req.body.role,
    passwordHash: await bcrypt.hash(req.body.password, 12), createdAt: new Date().toISOString(),
  };
  store.users.set(user.id, user);
  if (user.role === 'teacher') {
    const teacher = { id: randomUUID(), name: user.name, email, phone: '', subject: '', createdAt: user.createdAt, userId: user.id };
    store.teachers.set(teacher.id, teacher);
  }
  if (user.role === 'student') {
    const student = { id: randomUUID(), name: user.name, email, phone: '', classId: null, createdAt: user.createdAt, userId: user.id };
    store.students.set(student.id, student);
  }
  sendRecord(res, publicUser(user), 201);
}));

router.use(authenticate);

function mountResource(path, controller) {
  const resource = Router();
  resource.get('/', authorize(...controller.roles.read), controller.list);
  resource.get('/:id', authorize(...controller.roles.read), controller.get);
  resource.post('/', authorize(...controller.roles.write), controller.create);
  resource.put('/:id', authorize(...controller.roles.write), controller.update);
  resource.delete('/:id', authorize(...controller.roles.delete), controller.remove);
  router.use(path, resource);
}

mountResource('/students', studentsController);
mountResource('/teachers', teachersController);
mountResource('/classes', classesController);
mountResource('/subjects', subjectsController);
mountResource('/results', resultsController);

export default router;