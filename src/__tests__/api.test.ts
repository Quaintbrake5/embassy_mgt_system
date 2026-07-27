import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-correlation-id'),
}));

jest.mock('../config/db.config', () => ({
  prisma: {
    $disconnect: jest.fn(),
  },
}));

jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: 'test-user', email: 'test@example.com' };
    next();
  },
}));

jest.mock('../middleware/audit.middleware', () => ({
  auditMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../middleware/error.middleware', () => ({
  errorMiddleware: (err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      },
    });
  },
  notFoundMiddleware: (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  },
}));

jest.mock('../services/auth.service');
jest.mock('../services/user.service');
jest.mock('../services/role.service');
jest.mock('../services/permission.service');
jest.mock('../services/audit.service');

describe('API Health & Root Endpoints', () => {
  let app: Application;

  beforeAll(async () => {
    app = (await import('../server')).default;
  });

  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
  });

  it('GET / should return 200 with API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toContain('Embassy');
    expect(res.body.version).toBeDefined();
  });

  it('GET /nonexistent should return 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});