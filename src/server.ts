import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from './config/redis.config';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

import { auditMiddleware } from './middleware/audit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { register as metricsRegister } from './config/metrics.config';
import routes from './routes';
import { prisma } from './config/db.config';
import { AuditService } from './services/audit.service';
import logger from './config/logger.config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';

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
    logger.info('Rate-limit using Redis store', { prefix });
    return new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<number>,
      prefix,
    });
  }

  if (redisClient.status === 'connecting') {
    logger.info('Rate-limit Redis store pending (cold start)', { prefix });
  } else if (redisClient.status === 'reconnecting' || redisClient.status === 'close') {
    logger.warn('Rate-limit falling back to in-memory store because Redis is unavailable. In production, this means rate limiting is per-process, not global.', { prefix });
  }

  return undefined;
}

if (redisClient.status !== 'ready') {
  redisClient.once('ready', () => {
    logger.info('Rate-limit Redis store now available (cold start)');
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

app.use(requestLogger);
app.use(metricsMiddleware);

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
    service: 'embassy-mgt-system',
  });
});

if (process.env.METRICS_ENABLED !== 'false') {
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', metricsRegister.contentType);
      const metrics = await metricsRegister.metrics();
      res.send(metrics);
    } catch (err) {
      logger.error('Failed to generate metrics', { error: err });
      res.status(500).json({ success: false, error: { code: 'METRICS_ERROR', message: 'Failed to generate metrics' } });
    }
  });
}

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Embassy Management System API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    health: '/health',
  });
});

if (process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'EMS API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
}

app.use('/api/v1/auth', authLimiter);
app.use(auditMiddleware);
app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555', 10);
const auditService = new AuditService(prisma);
const cleanupTimer = setInterval(async () => {
  try {
    const deleted = await auditService.purgeOldLogs(retentionDays);
    if (deleted > 0) {
      logger.info(`Purged ${deleted} audit log(s) older than ${retentionDays} days`);
    }
  } catch (err) {
    logger.error('Audit retention cleanup failed', { error: err });
  }
}, RETENTION_INTERVAL_MS);

if (process.env.NODE_ENV !== 'test') {
  cleanupTimer.unref();
}

export default app;