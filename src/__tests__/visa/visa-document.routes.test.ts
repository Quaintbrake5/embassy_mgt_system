import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));

const mockPrisma = {
  user: { findUnique: jest.fn() },
  visaApplication: { findUnique: jest.fn() },
  serviceRequest: { findUnique: jest.fn() },
  visaDocument: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
  auditLog: { create: jest.fn() },
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

describe('Visa Document Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = (await import('../../server')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/visa/documents', () => {
    it('should create a visa document', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
      mockPrisma.visaDocument.create.mockResolvedValue({
        id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', serviceRequestId: null,
        documentType: 'PASSPORT', fileName: 'passport.pdf', fileHash: 'abc', fileUrl: 'https://example.com/doc.pdf',
        uploadedAt: new Date(), createdAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await request(app)
        .post('/api/v1/visa/documents')
        .send({ visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', fileUrl: 'https://example.com/doc.pdf' })
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentType).toBe('PASSPORT');
    });
  });

  describe('GET /api/v1/visa/documents/application/:visaApplicationId', () => {
    it('should return documents for an application', async () => {
      mockPrisma.visaDocument.findMany.mockResolvedValue([
        { id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/v1/visa/documents/application/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/visa/documents/:id', () => {
    it('should return a single document', async () => {
      mockPrisma.visaDocument.findUnique.mockResolvedValue({
        id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/visa/documents/660e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('660e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('DELETE /api/v1/visa/documents/:id', () => {
    it('should delete a document', async () => {
      mockPrisma.visaDocument.delete.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440001', documentType: 'PASSPORT', fileName: 'passport.pdf', createdAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await request(app)
        .delete('/api/v1/visa/documents/660e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});