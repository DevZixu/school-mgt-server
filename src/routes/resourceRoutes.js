import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { studentController } from '../controllers/studentController.js';
import { teacherController } from '../controllers/teacherController.js';
import { classController } from '../controllers/classController.js';
import { subjectController } from '../controllers/subjectController.js';
import { resultController } from '../controllers/resultController.js';

const router = Router();

const mountResourceRoutes = (path, controller) => {
  const resourceRouter = Router();
  resourceRouter.get('/', authorize(...controller.roles.read), controller.getAll);
  resourceRouter.get('/:id', authorize(...controller.roles.read), controller.getById);
  resourceRouter.post('/', authorize(...controller.roles.write), controller.create);
  resourceRouter.put('/:id', authorize(...controller.roles.write), controller.updateById);
  resourceRouter.delete('/:id', authorize(...controller.roles.delete), controller.deleteById);
  router.use(path, resourceRouter);
};

mountResourceRoutes('/students', studentController);
mountResourceRoutes('/teachers', teacherController);
mountResourceRoutes('/classes', classController);
mountResourceRoutes('/subjects', subjectController);
mountResourceRoutes('/results', resultController);

export default router;