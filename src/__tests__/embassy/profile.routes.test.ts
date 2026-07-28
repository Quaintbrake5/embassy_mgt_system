import request from 'supertest';
import { Prisma } from '../../generated/prisma/client';
import { mockPrisma } from '../helpers/mock-db';
import { createMockProfile } from '../helpers/factories';

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user', email: 'user@test.com' };
    next();
  },
}));

jest.mock('../../middleware/rbac.middleware', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireAllPermissions: () => (_req: any, _res: any, next: any) => next(),
  getUserPermissions: jest.fn().mockResolvedValue(['profile:create', 'profile:read']),
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

describe('Profile Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/profile', () => {
    it('should create profile', async () => {
      mockPrisma.profile.create.mockResolvedValue(createMockProfile());

      const res = await request(app)
        .post('/api/v1/profile')
        .send({ gender: 'MALE', dateOfBirth: '1990-01-01' });

      expect(res.status).toBe(201);
      expect(res.body.data.gender).toBe('MALE');
    });

    it('should return 400 on invalid gender', async () => {
      const res = await request(app)
        .post('/api/v1/profile')
        .send({ gender: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('should return 409 on duplicate', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (userId)',
        { code: 'P2002', clientVersion: '7.9.0' }
      );
      mockPrisma.profile.create.mockRejectedValue(prismaError);

      const res = await request(app)
        .post('/api/v1/profile')
        .send({ gender: 'MALE', dateOfBirth: '1990-01-01' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/profile/me', () => {
    it('should get own profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(createMockProfile());

      const res = await request(app).get('/api/v1/profile/me');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('prof-1');
    });

    it('should return 404 when no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/profile/me');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/profile/me', () => {
    it('should update profile', async () => {
      mockPrisma.profile.update.mockResolvedValue(
        createMockProfile({ city: 'New City', gender: 'FEMALE' })
      );

      const res = await request(app)
        .put('/api/v1/profile/me')
        .send({ gender: 'FEMALE', city: 'New City' });

      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('New City');
    });
  });

  describe('DELETE /api/v1/profile/me (GDPR)', () => {
    it('should anonymize profile data', async () => {
      mockPrisma.profile.update.mockResolvedValue(
        createMockProfile({
          gender: 'PREFER_NOT_TO_SAY',
          dateOfBirth: null,
          city: null,
          country: null,
          avatar: null,
          bio: null,
          state: null,
          postalCode: null,
        })
      );

      const res = await request(app).delete('/api/v1/profile/me');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('GDPR');
      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gender: 'PREFER_NOT_TO_SAY' }),
        })
      );
    });
  });

  describe('GET /api/v1/profile/:id (officer)', () => {
    it('should get profile by officer', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(createMockProfile());

      const res = await request(app).get('/api/v1/profile/user-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('prof-1');
    });

    it('should return 404 for missing profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/profile/nonexistent');

      expect(res.status).toBe(404);
    });
  });
});