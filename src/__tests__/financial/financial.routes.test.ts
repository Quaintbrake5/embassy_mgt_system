import { Request, Response, NextFunction } from "express";
import request from "supertest";
import { mockPrisma } from "../helpers/mock-db";

jest.mock("uuid", () => ({ v4: jest.fn(() => "test-correlation-id") }));
import { createMockPayment, createMockServiceRequest, createMockUser } from "../helpers/factories";

jest.mock("../../middleware/auth.middleware", () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: "test-user", email: "test@example.com" };
    next();
  },
  optionalAuthMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: "test-user", email: "test@example.com" };
    next();
  },
}));

jest.mock("../../middleware/rbac.middleware", () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAnyPermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAllPermissions: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getUserPermissions: jest.fn(() => Promise.resolve([])),
}));

jest.mock("../../middleware/audit.middleware", () => ({
  auditMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

describe("Financial Routes", () => {
  let app: any;

  beforeAll(async () => {
    app = (await import("../../server")).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/financial/transactions", () => {
    it("should record a transaction and return 201", async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(
        createMockServiceRequest({ id: "550e8400-e29b-41d4-a716-446655440000" })
      );
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ userid: "550e8400-e29b-41d4-a716-446655440001" })
      );
      mockPrisma.payment.create.mockResolvedValue(
        createMockPayment({
          id: "pay-new", serviceRequestId: "550e8400-e29b-41d4-a716-446655440000",
          userId: "550e8400-e29b-41d4-a716-446655440001", status: "PENDING",
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });

      const res = await request(app)
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
      const res = await request(app)
        .post("/api/v1/financial/transactions")
        .send({ amount: 100, currency: "USD" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when both serviceRequestId and visaApplicationId provided", async () => {
      const res = await request(app)
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
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);

      const res = await request(app)
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
      mockPrisma.payment.findMany.mockResolvedValue([createMockPayment({ id: "pay-1" })]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const res = await request(app).get("/api/v1/financial/transactions");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe("GET /api/v1/financial/transactions/:id", () => {
    it("should return a transaction by ID", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(createMockPayment({ id: "pay-1" }));

      const res = await request(app).get("/api/v1/financial/transactions/pay-1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("pay-1");
    });

    it("should return 404 for nonexistent ID", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/v1/financial/transactions/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/financial/reconciliation/daily", () => {
    it("should return daily reconciliation", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        createMockPayment({ id: "pay-1", amount: 100, status: "COMPLETED", createdAt: new Date("2026-07-28T10:00:00Z") }),
        createMockPayment({ id: "pay-2", amount: 50, status: "FAILED", createdAt: new Date("2026-07-28T11:00:00Z") }),
      ]);
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });

      const res = await request(app)
        .get("/api/v1/financial/reconciliation/daily")
        .query({ date: "2026-07-28" });

      expect(res.status).toBe(200);
      expect(res.body.data.totalCollections).toBe(100);
      expect(res.body.data.discrepancyCount).toBe(1);
    });
  });

  describe("GET /api/v1/financial/reports/monthly", () => {
    it("should return monthly report", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          ...createMockPayment({ id: "pay-1", amount: 100, currency: "USD", status: "COMPLETED", userId: "off-1", createdAt: new Date("2026-07-10T10:00:00Z") }),
          serviceRequest: { serviceType: { name: "Passport", category: "DOCUMENT" } },
        },
      ]);
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });

      const res = await request(app)
        .get("/api/v1/financial/reports/monthly")
        .query({ year: "2026", month: "7" });

      expect(res.status).toBe(200);
      expect(res.body.data.totalCollections).toBe(100);
      expect(res.body.data.totalTransactions).toBe(1);
    });
  });
});
