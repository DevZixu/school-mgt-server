import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { email, requiredText, validateBody, validateId, validateQuery } from '../utils/validation.js';

const teacherSchema = z.object({ name: requiredText, email, phone: requiredText.optional(), subject: requiredText.optional() }).strict();
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const getTeacher = (teacherId) => {
  validateId(teacherId);
  const teacher = store.teachers.get(teacherId);
  if (!teacher) throw new AppError(404, 'Teacher not found');
  return teacher;
};

const getAll = (req, res) => {
  validateQuery(req.query);
  return send(res, [...store.teachers.values()]);
};

const getById = (req, res) => send(res, getTeacher(req.params.id));

const create = (req, res) => {
  const data = validateBody(req.body, teacherSchema);
  const teacher = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  store.teachers.set(teacher.id, teacher);
  return send(res, teacher, 201);
};

const updateById = (req, res) => {
  const teacher = getTeacher(req.params.id);
  const data = validateBody(req.body, teacherSchema, { partial: true });
  if (Object.keys(data).length === 0) throw new AppError(400, 'At least one field is required');
  Object.assign(teacher, data);
  return send(res, teacher);
};

const deleteById = (req, res) => {
  validateId(req.params.id);
  if (!store.teachers.delete(req.params.id)) throw new AppError(404, 'Teacher not found');
  return res.status(204).end();
};

export const teacherController = {
  roles: { read: ['admin', 'teacher'], write: ['admin'], delete: ['admin'] },
  getAll, getById, create, updateById, deleteById,
};