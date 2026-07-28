import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));

const mockPrisma = {
  user: { findUnique: jest.fn() },
  visaApplication: { findUnique: jest.fn(), update: jest.fn() },
  visaDecision: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn((fn: any) => fn({
    visaDecision: { create: jest.fn() },
    visaApplication: { update: jest.fn() },
  })),
  $disconnect: jest.fn(),
};

jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: 'test-officer', email: 'officer@embassy.com' };
    next();
  },
}));

jest.mock('../../middleware/audit.middleware', () => ({
  auditMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/error.middleware', () => ({
  errorMiddleware: (err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' } });
  },
  notFoundMiddleware: (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  },
}));

jest.mock('../../middleware/rbac.middleware', () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/validation.middleware', () => ({
  validate: () => (req: Request, _res: Response, next: NextFunction) => next(),
}));

describe('Visa Decision Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = (await import('../../server')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/visa/decisions/applications/:id/decision', () => {
    it('should create a decision', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({ id: 'visa-1', applicationNumber: 'VA-001', status: 'UNDER_REVIEW' });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({
        visaDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', remarks: null, rationale: 'All good', decidedAt: new Date(), createdAt: new Date(), officer: { userid: 'test-officer', firstName: 'Test', lastName: 'Officer', email: 'officer@embassy.com' }, secondaryOfficer: null }) },
        visaApplication: { update: jest.fn().mockResolvedValue({}) },
      }));
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await request(app)
        .post('/api/v1/visa/decisions/applications/visa-1/decision')
        .send({ decision: 'APPROVE', rationale: 'All good' })
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(201);
      expect(res.body.data.decision).toBe('APPROVE');
    });
  });

  describe('GET /api/v1/visa/decisions/applications/:id/decision', () => {
    it('should return decision for an application', async () => {
      mockPrisma.visaDecision.findUnique.mockResolvedValue({
        id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', decidedAt: new Date(), createdAt: new Date(),
        officer: { userid: 'test-officer', firstName: 'Test', lastName: 'Officer', email: 'officer@embassy.com' },
        secondaryOfficer: null,
      });

      const res = await request(app)
        .get('/api/v1/visa/decisions/applications/visa-1/decision')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe('APPROVE');
    });
  });

  describe('GET /api/v1/visa/decisions/decisions/officer/me', () => {
    it('should return my decisions', async () => {
      mockPrisma.visaDecision.findMany.mockResolvedValue([
        { id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', decidedAt: new Date(), createdAt: new Date(), officer: null, secondaryOfficer: null },
      ]);
      mockPrisma.visaDecision.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/visa/decisions/decisions/officer/me')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});