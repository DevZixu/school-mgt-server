import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { email, id, requiredText } from '../utils/validation.js';

export const studentController = createCrudController({
  collection: store.students,
  store,
  label: 'student',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: z.object({ name: requiredText, email, phone: requiredText.optional(), classId: id.optional() }).strict(),
  visibleToStudent: (student, user) => student.userId === user.id,
});