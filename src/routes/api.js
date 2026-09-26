import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import resourceRoutes from './resourceRoutes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use(authenticate, resourceRoutes);

export default router;