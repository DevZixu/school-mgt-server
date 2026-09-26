import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';

export const classController = createCrudController({
  collection: store.classes,
  store,
  label: 'class',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: {
    name: { type: 'string', required: true },
    level: { type: 'string' },
    teacherId: { type: 'uuid' },
  },
  visibleToStudent: (schoolClass, user, data) => {
    const student = [...data.students.values()].find((item) => item.userId === user.id);
    return schoolClass.id === student?.classId;
  },
});