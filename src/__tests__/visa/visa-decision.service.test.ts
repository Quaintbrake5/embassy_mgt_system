import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockVisaApplication } from '../helpers/factories';
import { VisaDecisionService } from '../../services/visa-decision.service';

jest.mock('../../config/db.config', () => ({
  prisma: mockPrisma,
}));

describe('VisaDecisionService', () => {
  let service: VisaDecisionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisaDecisionService(mockPrisma as any);
  });

  describe('createDecision', () => {
    it('should APPROVE an application and update status', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'UNDER_REVIEW' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          visaDecision: {
            create: jest.fn().mockResolvedValue({
              id: 'dec-1',
              visaApplicationId: 'visa-1',
              officerId: 'officer-1',
              decision: 'APPROVE',
              remarks: 'All documents in order',
              rationale: 'Meets requirements',
              decidedAt: new Date(),
              createdAt: new Date(),
              officer: { userid: 'officer-1', firstName: 'Jane', lastName: 'Officer', email: 'jane@embassy.com' },
              secondaryOfficer: null,
            }),
          },
          visaApplication: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createDecision(
        'visa-1',
        { decision: 'APPROVE', remarks: 'All documents in order', rationale: 'Meets requirements' },
        'officer-1'
      );

      expect(result.decision).toBe('APPROVE');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'DECISION' }),
        })
      );
    });

    it('should REJECT an application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'UNDER_REVIEW' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          visaDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-2', visaApplicationId: 'visa-1', officerId: 'officer-1', decision: 'REJECT', decidedAt: new Date(), createdAt: new Date(), officer: { userid: 'officer-1', firstName: 'Jane', lastName: 'Officer', email: 'jane@embassy.com' }, secondaryOfficer: null }) },
          visaApplication: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createDecision('visa-1', { decision: 'REJECT', rationale: 'Insufficient funds' }, 'officer-1');

      expect(result.decision).toBe('REJECT');
    });

    it('should require secondaryOfficerId for ESCALATE_TO_HQ', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'UNDER_REVIEW' })
      );

      await expect(service.createDecision('visa-1', { decision: 'ESCALATE_TO_HQ' }, 'officer-1'))
        .rejects.toThrow('Secondary officer ID is required when escalating to HQ');
    });

    it('should reject decision on DRAFT application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'DRAFT' })
      );

      await expect(service.createDecision('visa-1', { decision: 'APPROVE' }, 'officer-1'))
        .rejects.toThrow(/Cannot make decision on application in status DRAFT/);
    });

    it('should reject decision on already APPROVED application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'APPROVED' })
      );

      await expect(service.createDecision('visa-1', { decision: 'APPROVE' }, 'officer-1'))
        .rejects.toThrow(/Cannot make decision on application in status APPROVED/);
    });

    it('should throw NotFoundError for non-existent application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(null);

      await expect(service.createDecision('visa-1', { decision: 'APPROVE' }, 'officer-1'))
        .rejects.toThrow('Visa application not found');
    });

    it('should handle REQUEST_MORE_INFO decision', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'UNDER_REVIEW' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          visaDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-3', visaApplicationId: 'visa-1', officerId: 'officer-1', decision: 'REQUEST_MORE_INFO', decidedAt: new Date(), createdAt: new Date(), officer: { userid: 'officer-1', firstName: 'Jane', lastName: 'Officer', email: 'jane@embassy.com' }, secondaryOfficer: null }) },
          visaApplication: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createDecision('visa-1', { decision: 'REQUEST_MORE_INFO', remarks: 'Please provide additional documents' }, 'officer-1');

      expect(result.decision).toBe('REQUEST_MORE_INFO');
    });
  });

  describe('getDecision', () => {
    it('should return decision for an application', async () => {
      mockPrisma.visaDecision.findUnique.mockResolvedValue({
        id: 'dec-1',
        visaApplicationId: 'visa-1',
        officerId: 'officer-1',
        decision: 'APPROVE',
        decidedAt: new Date(),
        createdAt: new Date(),
        officer: { userid: 'officer-1', firstName: 'Jane', lastName: 'Officer', email: 'jane@embassy.com' },
        secondaryOfficer: null,
      });

      const result = await service.getDecision('visa-1');

      expect(result.decision).toBe('APPROVE');
    });

    it('should throw NotFoundError when no decision exists', async () => {
      mockPrisma.visaDecision.findUnique.mockResolvedValue(null);

      await expect(service.getDecision('visa-1')).rejects.toThrow('Visa decision not found for this application');
    });
  });

  describe('getDecisionsByOfficer', () => {
    it('should return paginated decisions for an officer', async () => {
      mockPrisma.visaDecision.findMany.mockResolvedValue([
        { id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'officer-1', decision: 'APPROVE', decidedAt: new Date(), createdAt: new Date(), officer: { userid: 'officer-1', firstName: 'Jane', lastName: 'Officer', email: 'jane@embassy.com' }, secondaryOfficer: null },
      ]);
      mockPrisma.visaDecision.count.mockResolvedValue(1);

      const result = await service.getDecisionsByOfficer('officer-1', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
