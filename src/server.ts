import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from './config/redis.config';
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

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'upgrade-insecure-requests': isDevelopment ? null : [],
    },
  },
}));

function createRedisStore(prefix: string): RedisStore | undefined {
  if (redisClient.status === 'ready') {
    console.log(`[RateLimit] Using Redis store (prefix: ${prefix})`);
    return new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<number>,
      prefix,
    });
  }
  return undefined;
}

if (redisClient.status !== 'ready') {
  redisClient.once('ready', () => {
    console.log('[RateLimit] Redis store now available (cold start — restart to activate)');
  });
}

function rateLimitHandler(req: Request, res: Response): void {
  const retryAfter = Math.ceil(
    ((req as any).rateLimit?.resetTime
      ? (new Date((req as any).rateLimit.resetTime).getTime() - Date.now()) / 1000
      : 60)
  );
  res.setHeader('Retry-After', retryAfter);
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter,
    },
  });
}

const generalRedisStore = createRedisStore('rl:general:');
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  ...(generalRedisStore ? { store: generalRedisStore } : {}),
  handler: rateLimitHandler,
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

const authRedisStore = createRedisStore('rl:auth:');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  ...(authRedisStore ? { store: authRedisStore } : {}),
  handler: rateLimitHandler,
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

app.use('/api/v1/auth', authLimiter);
app.use(auditMiddleware);
app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;