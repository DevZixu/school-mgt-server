import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText } from '../utils/validation.js';

export const subjectController = createCrudController({
  collection: store.subjects,
  store,
  label: 'subject',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: z.object({ name: requiredText, code: requiredText, teacherId: id.optional(), classId: id.optional() }).strict(),
});