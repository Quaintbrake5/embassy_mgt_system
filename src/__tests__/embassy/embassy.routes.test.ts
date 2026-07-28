import request from 'supertest';
import { mockPrisma } from '../helpers/mock-db';
import { createMockEmbassy, createMockDepartment } from '../helpers/factories';

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
  getUserPermissions: jest.fn().mockResolvedValue(['embassy:read', 'embassy:create', 'embassy:update', 'embassy:delete', 'department:read', 'department:create', 'department:update', 'department:delete']),
}));

jest.mock('../../middleware/embassy.middleware', () => ({
  resolveEmbassyContext: (_req: any, _res: any, next: any) => next(),
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

describe('Embassy Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/embassies', () => {
    it('should list embassies', async () => {
      mockPrisma.embassy.findMany.mockResolvedValue([createMockEmbassy({ departments: [] })]);
      mockPrisma.embassy.count.mockResolvedValue(1);

      const res = await request(app).get('/api/v1/embassies');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/embassies', () => {
    it('should create embassy', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      mockPrisma.embassy.create.mockResolvedValue(createMockEmbassy({ departments: [] }));

      const res = await request(app)
        .post('/api/v1/embassies')
        .send({ name: 'Test Embassy', code: 'TEST', country: 'TC', city: 'TCity', address: '123 St' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 on invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/embassies')
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('should return 409 on duplicate code', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());

      const res = await request(app)
        .post('/api/v1/embassies')
        .send({ name: 'Test Embassy', code: 'TEST', country: 'TC', city: 'TCity', address: '123 St' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/embassies/:id', () => {
    it('should get embassy by id', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy({ departments: [] }));

      const res = await request(app).get('/api/v1/embassies/embassy-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('embassy-1');
    });

    it('should return 404 for missing', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/embassies/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/embassies/:id', () => {
    it('should update embassy', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.embassy.update.mockResolvedValue(createMockEmbassy({ name: 'Updated', departments: [] }));

      const res = await request(app)
        .put('/api/v1/embassies/embassy-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/embassies/:id', () => {
    it('should delete embassy with no dependents', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.count.mockResolvedValue(0);
      mockPrisma.serviceRequest.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.visaApplication.count.mockResolvedValue(0);
      mockPrisma.emergencyCase.count.mockResolvedValue(0);

      const res = await request(app).delete('/api/v1/embassies/embassy-1');

      expect(res.status).toBe(200);
    });

    it('should return 409 when departments exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.count.mockResolvedValue(1);
      mockPrisma.serviceRequest.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.visaApplication.count.mockResolvedValue(0);
      mockPrisma.emergencyCase.count.mockResolvedValue(0);

      const res = await request(app).delete('/api/v1/embassies/embassy-1');

      expect(res.status).toBe(409);
    });
  });

  describe('Department sub-routes', () => {
    it('POST /api/v1/embassies/:eid/departments should create', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.findUnique.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue(createMockDepartment());

      const res = await request(app)
        .post('/api/v1/embassies/embassy-1/departments')
        .send({ name: 'Visa', slug: 'visa' });

      expect(res.status).toBe(201);
    });

    it('GET /api/v1/embassies/:eid/departments should list', async () => {
      mockPrisma.department.findMany.mockResolvedValue([createMockDepartment()]);

      const res = await request(app).get('/api/v1/embassies/embassy-1/departments');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('PUT /api/v1/embassies/departments/:id should update', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(createMockDepartment());
      mockPrisma.department.update.mockResolvedValue(createMockDepartment({ name: 'Updated' }));

      const res = await request(app)
        .put('/api/v1/embassies/departments/dept-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/embassies/departments/:id should delete', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(createMockDepartment());

      const res = await request(app).delete('/api/v1/embassies/departments/dept-1');

      expect(res.status).toBe(200);
    });
  });
});
