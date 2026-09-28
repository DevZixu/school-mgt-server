import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText, score, validateBody, validateId, validateQuery } from '../utils/validation.js';

const resultSchema = z.object({
    studentId: id,
    subjectId: id,
    score,
    grade: requiredText,
    term: requiredText,
    session: requiredText,
  }).strict();
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const getResult = (resultId) => {
  validateId(resultId);
  const result = store.results.get(resultId);
  if (!result) throw new AppError(404, 'Result not found');
  return result;
};
const getStudentId = (userId) => [...store.students.values()].find((student) => student.userId === userId)?.id;
const canViewResult = (result, user) => user.role !== 'student' || result.studentId === getStudentId(user.id);
const validateRelations = ({ studentId, subjectId }) => {
  if (!store.students.has(studentId)) throw new AppError(400, 'studentId does not reference an existing record');
  if (!store.subjects.has(subjectId)) throw new AppError(400, 'subjectId does not reference an existing record');
};

const getAll = (req, res) => {
  validateQuery(req.query);
  return send(res, [...store.results.values()].filter((result) => canViewResult(result, req.user)));
};
const getById = (req, res) => {
  const result = getResult(req.params.id);
  if (!canViewResult(result, req.user)) throw new AppError(403, 'Forbidden');
  return send(res, result);
};
const create = (req, res) => {
  const data = validateBody(req.body, resultSchema);
  validateRelations(data);
  const result = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  store.results.set(result.id, result);
  return send(res, result, 201);
};
const updateById = (req, res) => {
  const result = getResult(req.params.id);
  const data = validateBody(req.body, resultSchema, { partial: true });
  if (Object.keys(data).length === 0) throw new AppError(400, 'At least one field is required');
  validateRelations({ ...result, ...data });
  Object.assign(result, data);
  return send(res, result);
};
const deleteById = (req, res) => {
  validateId(req.params.id);
  if (!store.results.delete(req.params.id)) throw new AppError(404, 'Result not found');
  return res.status(204).end();
};

export const resultController = {
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin', 'teacher'], delete: ['admin'] },
  getAll, getById, create, updateById, deleteById,
};