import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-correlation-id'),
}));

const mockPrisma: any = {
  embassy: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  visaApplication: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
  watchlistEntry: { findMany: jest.fn() },
  verificationCheck: { create: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  $disconnect: jest.fn(),
};

jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: 'test-user', email: 'test@example.com' };
    next();
  },
}));

jest.mock('../../middleware/audit.middleware', () => ({
  auditMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/error.middleware', () => ({
  errorMiddleware: (err: any, _req: Request, res: Response, _next: NextFunction) => { console.log("ERR:",err.message); 
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      },
    });
  },
  notFoundMiddleware: (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  },
}));

jest.mock('../../middleware/rbac.middleware', () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getUserPermissions: jest.fn(() => Promise.resolve(['visa:read-all'])),
}));

jest.mock('../../middleware/validation.middleware', () => ({
  validate: () => (req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/embassy.middleware', () => ({
  resolveEmbassyContext: (_req: Request, _res: Response, next: NextFunction) => next(),
}));


describe('Visa Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = (await import('../../server')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/visa', () => {
    it('should create a visa application', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test Embassy', code: 'TEST', country: 'Test', city: 'Test' });
      mockPrisma.visaApplication.create.mockResolvedValue({
        id: 'visa-1',
        applicationNumber: 'VA-K8X91-ABCD1234',
        userId: 'test-user',
        visaType: 'TOURIST',
        embassyId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'DRAFT',
        submittedAt: null,
        decisionAt: null,
        createdAt: new Date(),
        Updated: new Date(),
        user: null,
        embassy: null,
        documents: [],
        decision: null,
        payments: [],
        verificationChecks: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ userid: 'test-user', firstName: 'Test', lastName: 'User', email: 'test@example.com', status: 'ACTIVE' });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await request(app)
        .post('/api/v1/visa')
        .send({ visaType: 'TOURIST', embassyId: '550e8400-e29b-41d4-a716-446655440000' })
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationNumber).toMatch(/^VA-/);
    });

    it('should return 404 for missing embassy', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/visa')
        .send({ visaType: 'TOURIST', embassyId: '00000000-0000-0000-0000-000000000000' })
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/visa', () => {
    it('should return paginated visa applications', async () => {
      mockPrisma.visaApplication.findMany.mockResolvedValue([
        { id: 'visa-1', applicationNumber: 'VA-001', userId: 'test-user', visaType: 'TOURIST', embassyId: '550e8400-e29b-41d4-a716-446655440000', status: 'UNDER_REVIEW', submittedAt: null, decisionAt: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null, documents: [], decision: null, payments: [], verificationChecks: [] },
      ]);
      mockPrisma.visaApplication.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/visa')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/visa/:id', () => {
    it('should return a single visa application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        id: 'visa-1', applicationNumber: 'VA-001', userId: 'test-user', visaType: 'TOURIST', embassyId: '550e8400-e29b-41d4-a716-446655440000', status: 'UNDER_REVIEW', submittedAt: null, decisionAt: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null, documents: [], decision: null, payments: [], verificationChecks: [],
      });

      const res = await request(app)
        .get('/api/v1/visa/visa-1')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('visa-1');
    });
  });

  describe('POST /api/v1/visa/:id/submit', () => {
    it('should submit a DRAFT application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({ id: 'visa-1', status: 'DRAFT', applicationNumber: 'VA-001' });
      mockPrisma.visaApplication.update.mockResolvedValue({
        id: 'visa-1', applicationNumber: 'VA-001', userId: 'test-user', visaType: 'TOURIST', embassyId: '550e8400-e29b-41d4-a716-446655440000', status: 'SUBMITTED', submittedAt: new Date(), decisionAt: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null, documents: [], decision: null, payments: [], verificationChecks: [],
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await request(app)
        .post('/api/v1/visa/visa-1/submit')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUBMITTED');
    });
  });
});