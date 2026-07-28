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
const mock_db_1 = require("../helpers/mock-db");
jest.mock("uuid", () => ({ v4: jest.fn(() => "test-correlation-id") }));
const factories_1 = require("../helpers/factories");
jest.mock("../../middleware/auth.middleware", () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: "test-user", email: "test@example.com" };
        next();
    },
    optionalAuthMiddleware: (req, _res, next) => {
        req.user = { userId: "test-user", email: "test@example.com" };
        next();
    },
}));
jest.mock("../../middleware/rbac.middleware", () => ({
    requirePermission: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
    requireAnyPermission: () => (_req, _res, next) => next(),
    requireAllPermissions: () => (_req, _res, next) => next(),
    getUserPermissions: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../../middleware/audit.middleware", () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
describe("Financial Routes", () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require("../../server")))).default;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("POST /api/v1/financial/transactions", () => {
        it("should record a transaction and return 201", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: "550e8400-e29b-41d4-a716-446655440000" }));
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: "550e8400-e29b-41d4-a716-446655440001" }));
            mock_db_1.mockPrisma.payment.create.mockResolvedValue((0, factories_1.createMockPayment)({
                id: "pay-new", serviceRequestId: "550e8400-e29b-41d4-a716-446655440000",
                userId: "550e8400-e29b-41d4-a716-446655440001", status: "PENDING",
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/financial/transactions")
                .send({
                serviceRequestId: "550e8400-e29b-41d4-a716-446655440000",
                amount: 100,
                currency: "USD",
                userId: "550e8400-e29b-41d4-a716-446655440001",
            });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.amount).toBe(100);
        });
        it("should return 400 for missing required fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/financial/transactions")
                .send({ amount: 100, currency: "USD" });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
        it("should return 400 when both serviceRequestId and visaApplicationId provided", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/financial/transactions")
                .send({
                serviceRequestId: "550e8400-e29b-41d4-a716-446655440000",
                visaApplicationId: "550e8400-e29b-41d4-a716-446655440001",
                amount: 100,
                currency: "USD",
                userId: "550e8400-e29b-41d4-a716-446655440002",
            });
            expect(res.status).toBe(400);
        });
        it("should return 404 when service request not found", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/financial/transactions")
                .send({
                serviceRequestId: "550e8400-e29b-41d4-a716-446655440000",
                amount: 100,
                currency: "USD",
                userId: "550e8400-e29b-41d4-a716-446655440001",
            });
            expect(res.status).toBe(404);
        });
    });
    describe("GET /api/v1/financial/transactions", () => {
        it("should return paginated transactions", async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([(0, factories_1.createMockPayment)({ id: "pay-1" })]);
            mock_db_1.mockPrisma.payment.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(app).get("/api/v1/financial/transactions");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.meta.total).toBe(1);
        });
    });
    describe("GET /api/v1/financial/transactions/:id", () => {
        it("should return a transaction by ID", async () => {
            mock_db_1.mockPrisma.payment.findUnique.mockResolvedValue((0, factories_1.createMockPayment)({ id: "pay-1" }));
            const res = await (0, supertest_1.default)(app).get("/api/v1/financial/transactions/pay-1");
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe("pay-1");
        });
        it("should return 404 for nonexistent ID", async () => {
            mock_db_1.mockPrisma.payment.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app).get("/api/v1/financial/transactions/nonexistent");
            expect(res.status).toBe(404);
        });
    });
    describe("GET /api/v1/financial/reconciliation/daily", () => {
        it("should return daily reconciliation", async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([
                (0, factories_1.createMockPayment)({ id: "pay-1", amount: 100, status: "COMPLETED", createdAt: new Date("2026-07-28T10:00:00Z") }),
                (0, factories_1.createMockPayment)({ id: "pay-2", amount: 50, status: "FAILED", createdAt: new Date("2026-07-28T11:00:00Z") }),
            ]);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });
            const res = await (0, supertest_1.default)(app)
                .get("/api/v1/financial/reconciliation/daily")
                .query({ date: "2026-07-28" });
            expect(res.status).toBe(200);
            expect(res.body.data.totalCollections).toBe(100);
            expect(res.body.data.discrepancyCount).toBe(1);
        });
    });
    describe("GET /api/v1/financial/reports/monthly", () => {
        it("should return monthly report", async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([
                {
                    ...(0, factories_1.createMockPayment)({ id: "pay-1", amount: 100, currency: "USD", status: "COMPLETED", userId: "off-1", createdAt: new Date("2026-07-10T10:00:00Z") }),
                    serviceRequest: { serviceType: { name: "Passport", category: "DOCUMENT" } },
                },
            ]);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });
            const res = await (0, supertest_1.default)(app)
                .get("/api/v1/financial/reports/monthly")
                .query({ year: "2026", month: "7" });
            expect(res.status).toBe(200);
            expect(res.body.data.totalCollections).toBe(100);
            expect(res.body.data.totalTransactions).toBe(1);
        });
    });
});
