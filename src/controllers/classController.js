import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText } from '../utils/validation.js';

export const classController = createCrudController({
  collection: store.classes,
  store,
  label: 'class',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: z.object({ name: requiredText, level: requiredText.optional(), teacherId: id.optional() }).strict(),
  visibleToStudent: (schoolClass, user, data) => {
    const student = [...data.students.values()].find((item) => item.userId === user.id);
    return schoolClass.id === student?.classId;
  },
});