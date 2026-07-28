import request from 'supertest';
import { mockPrisma } from '../helpers/mock-db';
import { createMockServiceType } from '../helpers/factories';

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-user', email: 'admin@test.com' };
    next();
  },
}));

jest.mock('../../middleware/rbac.middleware', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireAllPermissions: () => (_req: any, _res: any, next: any) => next(),
  getUserPermissions: jest.fn().mockResolvedValue(['service-type:read', 'service-type:create', 'service-type:update', 'service-type:delete']),
}));

jest.mock('../../middleware/error.middleware', () => ({
  errorMiddleware: (err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { message: err.message || 'Internal server error', details: err.details },
    });
  },
  notFoundMiddleware: (_req: any, res: any) => {
    res.status(404).json({ success: false, error: { message: 'Route not found' } });
  },
}));

jest.mock('uuid', () => ({ v4: () => 'test-correlation-id' }));

import app from '../../server';

describe('ServiceType Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/service-types', () => {
    it('should list service types', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([createMockServiceType()]);
      mockPrisma.serviceType.count.mockResolvedValue(1);

      const res = await request(app).get('/api/v1/service-types');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/service-types', () => {
    it('should create service type', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      mockPrisma.serviceType.create.mockResolvedValue(createMockServiceType());

      const res = await request(app)
        .post('/api/v1/service-types')
        .send({ name: 'Passport Renewal', slug: 'passport-renewal', category: 'VISA', fee: 100, duration: 10 });

      expect(res.status).toBe(201);
    });

    it('should return 400 on invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/service-types')
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('should return 409 on duplicate slug', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());

      const res = await request(app)
        .post('/api/v1/service-types')
        .send({ name: 'Passport', slug: 'passport-renewal', category: 'VISA' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/service-types/category/:category', () => {
    it('should filter by category', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([createMockServiceType()]);

      const res = await request(app).get('/api/v1/service-types/category/DOCUMENT');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/service-types/:id', () => {
    it('should get by id', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());

      const res = await request(app).get('/api/v1/service-types/st-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('st-1');
    });

    it('should return 404 for missing', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/service-types/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/service-types/:id', () => {
    it('should update', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceType.update.mockResolvedValue(createMockServiceType({ name: 'Updated' }));

      const res = await request(app)
        .put('/api/v1/service-types/st-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/service-types/:id', () => {
    it('should delete with no requests', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceRequest.count.mockResolvedValue(0);

      const res = await request(app).delete('/api/v1/service-types/st-1');

      expect(res.status).toBe(200);
    });

    it('should return 409 when requests exist', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceRequest.count.mockResolvedValue(3);

      const res = await request(app).delete('/api/v1/service-types/st-1');

      expect(res.status).toBe(409);
    });
  });
});

