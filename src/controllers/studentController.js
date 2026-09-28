import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { email, id, requiredText, validateBody, validateId, validateQuery } from '../utils/validation.js';

const studentSchema = z.object({ name: requiredText, email, phone: requiredText.optional(), classId: id.optional() }).strict();
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const getStudent = (studentId) => {
  validateId(studentId);
  const student = store.students.get(studentId);
  if (!student) throw new AppError(404, 'Student not found');
  return student;
};
const canViewStudent = (student, user) => user.role !== 'student' || student.userId === user.id;

const getAll = (req, res) => {
  validateQuery(req.query);
  const students = [...store.students.values()].filter((student) => canViewStudent(student, req.user));
  return send(res, students);
};

const getById = (req, res) => {
  const student = getStudent(req.params.id);
  if (!canViewStudent(student, req.user)) throw new AppError(403, 'Forbidden');
  return send(res, student);
};

const create = (req, res) => {
  const data = validateBody(req.body, studentSchema);
  if (data.classId && !store.classes.has(data.classId)) throw new AppError(400, 'classId does not reference an existing record');
  const student = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  store.students.set(student.id, student);
  return send(res, student, 201);
};

const updateById = (req, res) => {
  const student = getStudent(req.params.id);
  const data = validateBody(req.body, studentSchema, { partial: true });
  if (Object.keys(data).length === 0) throw new AppError(400, 'At least one field is required');
  if (data.classId && !store.classes.has(data.classId)) throw new AppError(400, 'classId does not reference an existing record');
  Object.assign(student, data);
  return send(res, student);
};

const deleteById = (req, res) => {
  validateId(req.params.id);
  if (!store.students.delete(req.params.id)) throw new AppError(404, 'Student not found');
  return res.status(204).end();
};

export const studentController = {
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  getAll, getById, create, updateById, deleteById,
};