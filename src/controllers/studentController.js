import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';

export const studentController = createCrudController({
  collection: store.students,
  store,
  label: 'student',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: {
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
    phone: { type: 'string' },
    classId: { type: 'uuid' },
  },
  visibleToStudent: (student, user) => student.userId === user.id,
});