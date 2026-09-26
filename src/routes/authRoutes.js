import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { createUserAccount, loginUser, registerStudent } from '../controllers/authController.js';

const router = Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/register', authRateLimit, registerStudent);
router.post('/login', authRateLimit, loginUser);
router.post('/users', authenticate, authorize('admin'), createUserAccount);

export default router;