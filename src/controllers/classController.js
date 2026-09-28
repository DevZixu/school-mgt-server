import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText, validateBody, validateId, validateQuery } from '../utils/validation.js';

const classSchema = z.object({ name: requiredText, level: requiredText.optional(), teacherId: id.optional() }).strict();
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const getClass = (classId) => {
  validateId(classId);
  const schoolClass = store.classes.get(classId);
  if (!schoolClass) throw new AppError(404, 'Class not found');
  return schoolClass;
};
const isStudentClass = (schoolClass, user) => {
  if (user.role !== 'student') return true;
  const student = [...store.students.values()].find((item) => item.userId === user.id);
  return schoolClass.id === student?.classId;
};
const validateTeacher = (teacherId) => {
  if (teacherId && !store.teachers.has(teacherId)) throw new AppError(400, 'teacherId does not reference an existing record');
};

const getAll = (req, res) => {
  validateQuery(req.query);
  return send(res, [...store.classes.values()].filter((schoolClass) => isStudentClass(schoolClass, req.user)));
};
const getById = (req, res) => {
  const schoolClass = getClass(req.params.id);
  if (!isStudentClass(schoolClass, req.user)) throw new AppError(403, 'Forbidden');
  return send(res, schoolClass);
};
const create = (req, res) => {
  const data = validateBody(req.body, classSchema);
  validateTeacher(data.teacherId);
  const schoolClass = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  store.classes.set(schoolClass.id, schoolClass);
  return send(res, schoolClass, 201);
};
const updateById = (req, res) => {
  const schoolClass = getClass(req.params.id);
  const data = validateBody(req.body, classSchema, { partial: true });
  if (Object.keys(data).length === 0) throw new AppError(400, 'At least one field is required');
  validateTeacher(data.teacherId);
  Object.assign(schoolClass, data);
  return send(res, schoolClass);
};
const deleteById = (req, res) => {
  validateId(req.params.id);
  if (!store.classes.delete(req.params.id)) throw new AppError(404, 'Class not found');
  return res.status(204).end();
};

export const classController = {
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  getAll, getById, create, updateById, deleteById,
};