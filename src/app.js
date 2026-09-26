import express from 'express';
import helmet from 'helmet';
import api from './routes/api.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(requestLogger);
app.get('/health', (req, res) => res.json({ success: true, message: 'School Management API is running' }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

export default app;