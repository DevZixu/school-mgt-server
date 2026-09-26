import { createCrudController } from './createCrudController.js';
import { store } from '../data/store.js';

export const teachersController = createCrudController({
  collection: store.teachers,
  store,
  label: 'teacher',
  roles: { read: ['admin', 'teacher'], write: ['admin'], delete: ['admin'] },
  schema: {
    name: { type: 'string', required: true }, email: { type: 'email', required: true }, phone: { type: 'string' }, subject: { type: 'string' },
  },
});