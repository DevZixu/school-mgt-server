import { validate as isUuid } from 'uuid';
import { AppError } from './errors.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateBody = (body, schema, { partial = false } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }

  const allowed = new Set(Object.keys(schema));
  const unexpected = Object.keys(body).find((key) => !allowed.has(key));
  if (unexpected) throw new AppError(400, `Unexpected field: ${unexpected}`);

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined) {
      if (!partial && rules.required) throw new AppError(400, `${field} is required`);
      continue;
    }
    if (rules.type === 'string' && (typeof value !== 'string' || !value.trim())) {
      throw new AppError(400, `${field} must be a non-empty string`);
    }
    if (rules.type === 'email' && (typeof value !== 'string' || !emailPattern.test(value))) {
      throw new AppError(400, `${field} must be a valid email address`);
    }
    if (rules.type === 'password' && (typeof value !== 'string' || value.length < 8)) {
      throw new AppError(400, `${field} must be at least 8 characters`);
    }
    if (rules.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new AppError(400, `${field} must be a number`);
    }
    if (rules.type === 'score' && (typeof value !== 'number' || value < 0 || value > 100)) {
      throw new AppError(400, `${field} must be a number between 0 and 100`);
    }
    if (rules.type === 'role' && !['admin', 'teacher', 'student'].includes(value)) {
      throw new AppError(400, `${field} must be admin, teacher, or student`);
    }
    if (rules.type === 'uuid' && (typeof value !== 'string' || !isUuid(value))) {
      throw new AppError(400, `${field} must be a valid ID`);
    }
  }
  return body;
};

export const validateId = (id, field = 'id') => {
  if (!isUuid(id)) throw new AppError(400, `${field} must be a valid ID`);
  return id;
};

export const validateQuery = (query, allowed = []) => {
  const unexpected = Object.keys(query).find((key) => !allowed.includes(key));
  if (unexpected) throw new AppError(400, `Unexpected query parameter: ${unexpected}`);
  for (const value of Object.values(query)) {
    if (Array.isArray(value)) throw new AppError(400, 'Query parameters must not be repeated');
  }
};