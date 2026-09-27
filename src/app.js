import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { authenticate } from './middleware/auth.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(requestLogger);
app.get('/health', (req, res) => res.json({ success: true, message: 'School Management API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api', authenticate, resourceRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;