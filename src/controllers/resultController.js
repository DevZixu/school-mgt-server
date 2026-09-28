import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';
import { z } from 'zod';
import { id, requiredText, score } from '../utils/validation.js';

export const resultController = createCrudController({
  collection: store.results,
  store,
  label: 'result',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin', 'teacher'], delete: ['admin'] },
  schema: z.object({
    studentId: id,
    subjectId: id,
    score,
    grade: requiredText,
    term: requiredText,
    session: requiredText,
  }).strict(),
  visibleToStudent: (result, user, data) => {
    const student = [...data.students.values()].find((item) => item.userId === user.id);
    return result.studentId === student?.id;
  },
});