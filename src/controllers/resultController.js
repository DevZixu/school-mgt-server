import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';

export const resultController = createCrudController({
  collection: store.results,
  store,
  label: 'result',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin', 'teacher'], delete: ['admin'] },
  schema: {
    studentId: { type: 'uuid', required: true },
    subjectId: { type: 'uuid', required: true },
    score: { type: 'score', required: true },
    grade: { type: 'string', required: true },
    term: { type: 'string', required: true },
    session: { type: 'string', required: true },
  },
  visibleToStudent: (result, user, data) => {
    const student = [...data.students.values()].find((item) => item.userId === user.id);
    return result.studentId === student?.id;
  },
});