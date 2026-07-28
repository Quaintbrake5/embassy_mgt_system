"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-correlation-id'),
}));
jest.mock('../config/db.config', () => ({
    prisma: {
        $disconnect: jest.fn(),
    },
}));
jest.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'test-user', email: 'test@example.com' };
        next();
    },
}));
jest.mock('../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
        res.status(err.statusCode || 500).json({
            success: false,
            error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message || 'Internal server error',
            },
        });
    },
    notFoundMiddleware: (_req, res) => {
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
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../server')))).default;
    });
    it('GET /health should return 200 with status ok', async () => {
        const res = await (0, supertest_1.default)(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.uptime).toBeDefined();
    });
    it('GET / should return 200 with API metadata', async () => {
        const res = await (0, supertest_1.default)(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.name).toContain('Embassy');
        expect(res.body.version).toBeDefined();
    });
    it('GET /nonexistent should return 404', async () => {
        const res = await (0, supertest_1.default)(app).get('/nonexistent');
        expect(res.status).toBe(404);
    });
});
