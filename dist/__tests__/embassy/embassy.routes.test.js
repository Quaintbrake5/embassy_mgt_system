"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'admin-user', email: 'admin@test.com' };
        next();
    },
}));
jest.mock('../../middleware/rbac.middleware', () => ({
    requirePermission: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
    requireAnyPermission: () => (_req, _res, next) => next(),
    requireAllPermissions: () => (_req, _res, next) => next(),
    getUserPermissions: jest.fn().mockResolvedValue(['embassy:read', 'embassy:create', 'embassy:update', 'embassy:delete', 'department:read', 'department:create', 'department:update', 'department:delete']),
}));
jest.mock('../../middleware/embassy.middleware', () => ({
    resolveEmbassyContext: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
        res.status(err.statusCode || 500).json({
            success: false,
            error: { message: err.message || 'Internal server error', details: err.details },
        });
    },
    notFoundMiddleware: (_req, res) => {
        res.status(404).json({ success: false, error: { message: 'Route not found' } });
    },
}));
jest.mock('uuid', () => ({ v4: () => 'test-correlation-id' }));
const server_1 = __importDefault(require("../../server"));
describe('Embassy Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/v1/embassies', () => {
        it('should list embassies', async () => {
            mock_db_1.mockPrisma.embassy.findMany.mockResolvedValue([(0, factories_1.createMockEmbassy)({ departments: [] })]);
            mock_db_1.mockPrisma.embassy.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/embassies');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('POST /api/v1/embassies', () => {
        it('should create embassy', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.embassy.create.mockResolvedValue((0, factories_1.createMockEmbassy)({ departments: [] }));
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/embassies')
                .send({ name: 'Test Embassy', code: 'TEST', country: 'TC', city: 'TCity', address: '123 St' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
        it('should return 400 on invalid data', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/embassies')
                .send({ name: '' });
            expect(res.status).toBe(400);
        });
        it('should return 409 on duplicate code', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/embassies')
                .send({ name: 'Test Embassy', code: 'TEST', country: 'TC', city: 'TCity', address: '123 St' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/v1/embassies/:id', () => {
        it('should get embassy by id', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)({ departments: [] }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/embassies/embassy-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('embassy-1');
        });
        it('should return 404 for missing', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/embassies/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/embassies/:id', () => {
        it('should update embassy', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.embassy.update.mockResolvedValue((0, factories_1.createMockEmbassy)({ name: 'Updated', departments: [] }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/embassies/embassy-1')
                .send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
    describe('DELETE /api/v1/embassies/:id', () => {
        it('should delete embassy with no dependents', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.appointment.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.visaApplication.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.emergencyCase.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/embassies/embassy-1');
            expect(res.status).toBe(200);
        });
        it('should return 409 when departments exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.count.mockResolvedValue(1);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.appointment.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.visaApplication.count.mockResolvedValue(0);
            mock_db_1.mockPrisma.emergencyCase.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/embassies/embassy-1');
            expect(res.status).toBe(409);
        });
    });
    describe('Department sub-routes', () => {
        it('POST /api/v1/embassies/:eid/departments should create', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.department.create.mockResolvedValue((0, factories_1.createMockDepartment)());
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/embassies/embassy-1/departments')
                .send({ name: 'Visa', slug: 'visa' });
            expect(res.status).toBe(201);
        });
        it('GET /api/v1/embassies/:eid/departments should list', async () => {
            mock_db_1.mockPrisma.department.findMany.mockResolvedValue([(0, factories_1.createMockDepartment)()]);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/embassies/embassy-1/departments');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
        it('PUT /api/v1/embassies/departments/:id should update', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue((0, factories_1.createMockDepartment)());
            mock_db_1.mockPrisma.department.update.mockResolvedValue((0, factories_1.createMockDepartment)({ name: 'Updated' }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/embassies/departments/dept-1')
                .send({ name: 'Updated' });
            expect(res.status).toBe(200);
        });
        it('DELETE /api/v1/embassies/departments/:id should delete', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue((0, factories_1.createMockDepartment)());
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/embassies/departments/dept-1');
            expect(res.status).toBe(200);
        });
    });
});
