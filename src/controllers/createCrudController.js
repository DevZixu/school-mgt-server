import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { validateBody, validateId, validateQuery } from '../utils/validation.js';
import { getMapValues } from '../data/store.js';

const relationCollections = {
  classId: 'classes',
  teacherId: 'teachers',
  studentId: 'students',
  subjectId: 'subjects',
};

const sendRecord = (res, data, status = 200) => res.status(status).json({ success: true, data });

const notFoundLabel = (label) => `${label[0].toUpperCase()}${label.slice(1)} not found`;

export const createCrudController = ({ collection, label, schema, store, roles, visibleToStudent = () => true }) => {
  const getRecord = (id) => {
    validateId(id);
    const record = collection.get(id);
    if (!record) throw new AppError(404, notFoundLabel(label));
    return record;
  };

  const validateRelations = (body) => {
    for (const [field, collectionName] of Object.entries(relationCollections)) {
      const id = body[field];
      if (id && !store[collectionName].has(id)) {
        throw new AppError(400, `${field} does not reference an existing record`);
      }
    }
  };

  const getAll = (req, res) => {
    validateQuery(req.query);
    const items = getMapValues(collection).filter((item) => req.user.role !== 'student' || visibleToStudent(item, req.user, store));
    return sendRecord(res, items);
  };

  const getById = (req, res) => {
    const item = getRecord(req.params.id);
    if (req.user.role === 'student' && !visibleToStudent(item, req.user, store)) throw new AppError(403, 'Forbidden');
    return sendRecord(res, item);
  };

  const create = (req, res) => {
    validateBody(req.body, schema);
    validateRelations(req.body);
    const item = { ...req.body, id: randomUUID(), createdAt: new Date().toISOString() };
    collection.set(item.id, item);
    return sendRecord(res, item, 201);
  };

  const updateById = (req, res) => {
    validateId(req.params.id);
    validateBody(req.body, schema, { partial: true });
    if (Object.keys(req.body).length === 0) throw new AppError(400, 'At least one field is required');
    const item = getRecord(req.params.id);
    validateRelations(req.body);
    Object.assign(item, req.body);
    return sendRecord(res, item);
  };

  const deleteById = (req, res) => {
    validateId(req.params.id);
    if (!collection.has(req.params.id)) throw new AppError(404, notFoundLabel(label));
    collection.delete(req.params.id);
    return res.status(204).end();
  };

  return { getAll, getById, create, updateById, deleteById, roles };
};