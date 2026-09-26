import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';

export const subjectsController = createCrudController({
  collection: store.subjects,
  store,
  label: 'subject',
  roles: { read: ['admin', 'teacher', 'student'], write: ['admin'], delete: ['admin'] },
  schema: {
    name: { type: 'string', required: true }, code: { type: 'string', required: true }, teacherId: { type: 'uuid' }, classId: { type: 'uuid' },
  },
});