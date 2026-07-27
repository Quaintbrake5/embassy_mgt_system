import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

import { prisma } from './config/db.config';
import { authMiddleware } from './middleware/auth.middleware';
import { auditMiddleware } from './middleware/audit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import routes from './routes';

const app: Application = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log('REQUEST:', req.method, req.path);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Embassy Management System API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1',
    health: '/health',
  });
});

// Test route
app.get('/test', (req: Request, res: Response) => {
  res.json({ test: true });
});

// API routes
app.use('/api/v1', routes);

// Global middleware
app.use(auditMiddleware);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
