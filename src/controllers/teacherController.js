import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { email, requiredText } from '../utils/validation.js';

export const teacherController = createCrudController({
  collection: store.teachers,
  store,
  label: 'teacher',
  roles: { read: ['admin', 'teacher'], write: ['admin'], delete: ['admin'] },
  schema: z.object({ name: requiredText, email, phone: requiredText.optional(), subject: requiredText.optional() }).strict(),
});