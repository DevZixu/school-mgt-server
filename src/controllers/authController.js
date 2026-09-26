import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { store } from '../data/store.js';
import { AppError } from '../utils/errors.js';
import { validateBody } from '../utils/validation.js';

const credentialsSchema = {
  name: { type: 'string', required: true },
  email: { type: 'email', required: true },
  password: { type: 'password', required: true },
};

const publicUser = (user) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const sendSuccess = (res, data, status = 200) => res.status(status).json({ success: true, data });
const normalizeEmail = (email) => email.trim().toLowerCase();
const findUserByEmail = (email) => [...store.users.values()].find((user) => user.email === email);

const createUser = async ({ name, email, password, role }) => ({
  id: randomUUID(),
  name: name.trim(),
  email: normalizeEmail(email),
  role,
  passwordHash: await bcrypt.hash(password, 12),
  createdAt: new Date().toISOString(),
});

const createUserProfile = (user) => {
  const profile = {
    id: randomUUID(),
    name: user.name,
    email: user.email,
    phone: '',
    createdAt: user.createdAt,
    userId: user.id,
  };

  if (user.role === 'student') {
    profile.classId = null;
    store.students.set(profile.id, profile);
  }
  if (user.role === 'teacher') {
    profile.subject = '';
    store.teachers.set(profile.id, profile);
  }
  return profile;
};

const createToken = (user) => jwt.sign(
  { role: user.role },
  process.env.JWT_SECRET,
  { subject: user.id, expiresIn: '2h' },
);

export const registerStudent = async (req, res) => {
  validateBody(req.body, { ...credentialsSchema, role: { type: 'role' } });
  if (req.body.role && req.body.role !== 'student') {
    throw new AppError(403, 'Public registration is limited to student accounts');
  }

  const email = normalizeEmail(req.body.email);
  if (findUserByEmail(email)) throw new AppError(409, 'Email is already registered');

  const user = await createUser({ ...req.body, email, role: 'student' });
  const student = createUserProfile(user);
  store.users.set(user.id, user);

  return sendSuccess(res, { user: publicUser(user), token: createToken(user), student }, 201);
};

export const loginUser = async (req, res) => {
  validateBody(req.body, {
    email: { type: 'email', required: true },
    password: { type: 'password', required: true },
  });

  const user = findUserByEmail(normalizeEmail(req.body.email));
  const passwordMatches = user && await bcrypt.compare(req.body.password, user.passwordHash);
  if (!passwordMatches) throw new AppError(401, 'Invalid email or password');

  return sendSuccess(res, { user: publicUser(user), token: createToken(user) });
};

export const createUserAccount = async (req, res) => {
  validateBody(req.body, { ...credentialsSchema, role: { type: 'role', required: true } });
  if (req.body.role === 'admin') {
    throw new AppError(400, 'Admin accounts are provisioned through environment configuration');
  }

  const email = normalizeEmail(req.body.email);
  if (findUserByEmail(email)) throw new AppError(409, 'Email is already registered');

  const user = await createUser({ ...req.body, email });
  createUserProfile(user);
  store.users.set(user.id, user);

  return sendSuccess(res, publicUser(user), 201);
};