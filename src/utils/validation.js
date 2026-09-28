import { z } from 'zod';
import { AppError } from './errors.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const requiredText = z.string().trim().min(1, 'must be a non-empty string');
export const email = z.string().trim().refine((value) => emailPattern.test(value), 'must be a valid email address');
export const password = z.string().min(8, 'must be at least 8 characters');
export const id = z.string().uuid('must be a valid ID');
export const role = z.enum(['admin', 'teacher', 'student']);
export const score = z.number().min(0).max(100, 'must be a number between 0 and 100');

const formatError = (error) => {
  const issue = error.issues[0];
  const field = issue.path[0];
  if (field === undefined) return issue.message;
  if (issue.code === 'invalid_type' && issue.expected === 'string') return `${field} must be a non-empty string`;
  return `${field} ${issue.message}`;
};

export const validateBody = (body, schema, { partial = false } = {}) => {
  const bodySchema = partial ? schema.partial() : schema;
  const result = bodySchema.safeParse(body);
  if (!result.success) throw new AppError(400, formatError(result.error));
  return result.data;
};

export const validateId = (value, field = 'id') => {
  const result = id.safeParse(value);
  if (!result.success) throw new AppError(400, `${field} must be a valid ID`);
  return result.data;
};

export const validateQuery = (query, allowed = []) => {
  const unexpected = Object.keys(query).find((key) => !allowed.includes(key));
  if (unexpected) throw new AppError(400, `Unexpected query parameter: ${unexpected}`);
  for (const value of Object.values(query)) {
    if (Array.isArray(value)) throw new AppError(400, 'Query parameters must not be repeated');
  }
};