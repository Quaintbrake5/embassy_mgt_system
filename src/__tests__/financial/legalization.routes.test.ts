import { Request, Response, NextFunction } from "express";
import request from "supertest";
import { mockPrisma } from "../helpers/mock-db";

jest.mock("uuid", () => ({ v4: jest.fn(() => "test-correlation-id") }));
import { createMockServiceType, createMockServiceRequest, createMockEmbassy } from "../helpers/factories";

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

describe("Legalization Routes", () => {
  let app: any;

  beforeAll(async () => {
    app = (await import("../../server")).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/legalization", () => {
    it("should create a legalization request and return 201", async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(
        createMockServiceType({ id: "550e8400-e29b-41d4-a716-446655440000", category: "DOCUMENT_LEGALIZATION" })
      );
      mockPrisma.embassy.findUnique.mockResolvedValue(
        createMockEmbassy({ id: "550e8400-e29b-41d4-a716-446655440001" })
      );
      mockPrisma.serviceRequest.create.mockResolvedValue(
        createMockServiceRequest({
          id: "sr-new", referenceNumber: "SR-TEST-123",
          serviceTypeId: "550e8400-e29b-41d4-a716-446655440000",
          embassyId: "550e8400-e29b-41d4-a716-446655440001",
          status: "SUBMITTED",
          details: { documentType: "Birth Certificate", destinationCountry: "France", urgency: "NORMAL" },
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });

      const res = await request(app)
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
      const res = await request(app)
        .post("/api/v1/legalization")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/legalization", () => {
    it("should return paginated legalization requests", async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([
        createMockServiceType({ id: "st-legal", category: "DOCUMENT_LEGALIZATION" }),
      ]);
      mockPrisma.serviceRequest.findMany.mockResolvedValue([
        createMockServiceRequest({
          id: "sr-1", details: { documentType: "Doc", destinationCountry: "FR" },
        }),
      ]);
      mockPrisma.serviceRequest.count.mockResolvedValue(1);

      const res = await request(app).get("/api/v1/legalization");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/legalization/:id", () => {
    it("should return a legalization request by ID", async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(
        createMockServiceRequest({
          id: "sr-1",
          details: { documentType: "BC", destinationCountry: "FR" },
          serviceType: { id: "st-legal", name: "L", slug: "l", category: "DOCUMENT_LEGALIZATION" },
        })
      );

      const res = await request(app).get("/api/v1/legalization/sr-1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("sr-1");
    });

    it("should return 404 for nonexistent ID", async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/v1/legalization/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/v1/legalization/:id/process", () => {
    it("should process a legalization request (VERIFY)", async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(
        createMockServiceRequest({ id: "sr-1", status: "SUBMITTED", details: {} })
      );
      mockPrisma.serviceRequest.update.mockResolvedValue(
        createMockServiceRequest({
          id: "sr-1", status: "IN_PROGRESS",
          details: { verifiedAt: "2026-01-01T00:00:00Z", verifiedBy: "test-user" },
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" });

      const res = await request(app)
        .put("/api/v1/legalization/sr-1/process")
        .send({ action: "VERIFY" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 for invalid action", async () => {
      const res = await request(app)
        .put("/api/v1/legalization/sr-1/process")
        .send({ action: "INVALID" });

      expect(res.status).toBe(400);
    });

    it("should return 404 for nonexistent request", async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/v1/legalization/nonexistent/process")
        .send({ action: "VERIFY" });

      expect(res.status).toBe(404);
    });
  });
});
