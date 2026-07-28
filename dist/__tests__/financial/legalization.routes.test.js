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
describe("Legalization Routes", () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require("../../server")))).default;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("POST /api/v1/legalization", () => {
        it("should create a legalization request and return 201", async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)({ id: "550e8400-e29b-41d4-a716-446655440000", category: "DOCUMENT_LEGALIZATION" }));
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)({ id: "550e8400-e29b-41d4-a716-446655440001" }));
            mock_db_1.mockPrisma.serviceRequest.create.mockResolvedValue((0, factories_1.createMockServiceRequest)({
                id: "sr-new", referenceNumber: "SR-TEST-123",
                serviceTypeId: "550e8400-e29b-41d4-a716-446655440000",
                embassyId: "550e8400-e29b-41d4-a716-446655440001",
                status: "SUBMITTED",
                details: { documentType: "Birth Certificate", destinationCountry: "France", urgency: "NORMAL" },
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/legalization")
                .send({
                documentType: "Birth Certificate",
                destinationCountry: "France",
                serviceTypeId: "550e8400-e29b-41d4-a716-446655440000",
                embassyId: "550e8400-e29b-41d4-a716-446655440001",
            });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.documentType).toBe("Birth Certificate");
        });
        it("should return 400 for missing required fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/legalization")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
    describe("GET /api/v1/legalization", () => {
        it("should return paginated legalization requests", async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([
                (0, factories_1.createMockServiceType)({ id: "st-legal", category: "DOCUMENT_LEGALIZATION" }),
            ]);
            mock_db_1.mockPrisma.serviceRequest.findMany.mockResolvedValue([
                (0, factories_1.createMockServiceRequest)({
                    id: "sr-1", details: { documentType: "Doc", destinationCountry: "FR" },
                }),
            ]);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(app).get("/api/v1/legalization");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe("GET /api/v1/legalization/:id", () => {
        it("should return a legalization request by ID", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({
                id: "sr-1",
                details: { documentType: "BC", destinationCountry: "FR" },
                serviceType: { id: "st-legal", name: "L", slug: "l", category: "DOCUMENT_LEGALIZATION" },
            }));
            const res = await (0, supertest_1.default)(app).get("/api/v1/legalization/sr-1");
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe("sr-1");
        });
        it("should return 404 for nonexistent ID", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app).get("/api/v1/legalization/nonexistent");
            expect(res.status).toBe(404);
        });
    });
    describe("PUT /api/v1/legalization/:id/process", () => {
        it("should process a legalization request (VERIFY)", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: "sr-1", status: "SUBMITTED", details: {} }));
            mock_db_1.mockPrisma.serviceRequest.update.mockResolvedValue((0, factories_1.createMockServiceRequest)({
                id: "sr-1", status: "IN_PROGRESS",
                details: { verifiedAt: "2026-01-01T00:00:00Z", verifiedBy: "test-user" },
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });
            const res = await (0, supertest_1.default)(app)
                .put("/api/v1/legalization/sr-1/process")
                .send({ action: "VERIFY" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it("should return 400 for invalid action", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/v1/legalization/sr-1/process")
                .send({ action: "INVALID" });
            expect(res.status).toBe(400);
        });
        it("should return 404 for nonexistent request", async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app)
                .put("/api/v1/legalization/nonexistent/process")
                .send({ action: "VERIFY" });
            expect(res.status).toBe(404);
        });
    });
});
