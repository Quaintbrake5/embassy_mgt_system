import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

import { authMiddleware } from './middleware/auth.middleware';
import { auditMiddleware } from './middleware/audit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import routes from './routes';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

const app: Application = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(helmet());

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  _res.locals.correlationId = correlationId;
  _res.setHeader('X-Correlation-ID', correlationId);
  next();
});

morgan.token('correlation-id', (_req: Request, res: Response) => {
  return res.locals.correlationId || '-';
});
app.use(morgan(':correlation-id :remote-addr :method :url :status :res[content-length] - :response-time ms'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Embassy Management System API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1',
    health: '/health',
  });
});

app.get('/test', (_req: Request, res: Response) => {
  res.json({ test: true });
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', routes);

app.use(auditMiddleware);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;