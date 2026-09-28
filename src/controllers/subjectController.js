import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText, validateBody, validateId, validateQuery } from '../utils/validation.js';

const subjectSchema = z.object({ name: requiredText, code: requiredText, teacherId: id.optional(), classId: id.optional() }).strict();
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const getSubject = (subjectId) => {
  validateId(subjectId);
  const subject = store.subjects.get(subjectId);
  if (!subject) throw new AppError(404, 'Subject not found');
  return subject;
};
const validateRelations = ({ teacherId, classId }) => {
  if (teacherId && !store.teachers.has(teacherId)) throw new AppError(400, 'teacherId does not reference an existing record');
  if (classId && !store.classes.has(classId)) throw new AppError(400, 'classId does not reference an existing record');
};

const getAll = (req, res) => {
  validateQuery(req.query);
  return send(res, [...store.subjects.values()]);
};
const getById = (req, res) => send(res, getSubject(req.params.id));
const create = (req, res) => {
  const data = validateBody(req.body, subjectSchema);
  validateRelations(data);
  const subject = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  store.subjects.set(subject.id, subject);
  return send(res, subject, 201);
};
const updateById = (req, res) => {
  const subject = getSubject(req.params.id);
  const data = validateBody(req.body, subjectSchema, { partial: true });
  if (Object.keys(data).length === 0) throw new AppError(400, 'At least one field is required');
  validateRelations(data);
  Object.assign(subject, data);
  return send(res, subject);
};
const deleteById = (req, res) => {
  validateId(req.params.id);
  if (!store.subjects.delete(req.params.id)) throw new AppError(404, 'Subject not found');
  return res.status(204).end();
};

export const subjectController = {
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  getAll, getById, create, updateById, deleteById,
};