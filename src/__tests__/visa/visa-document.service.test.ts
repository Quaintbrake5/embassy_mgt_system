import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockVisaApplication, createMockServiceRequest } from '../helpers/factories';
import { VisaDocumentService } from '../../services/visa-document.service';

jest.mock('../../config/db.config', () => ({
  prisma: mockPrisma,
}));

import { Prisma } from '../../generated/prisma/client';

describe('VisaDocumentService', () => {
  let service: VisaDocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisaDocumentService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a visa document linked to an application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(createMockVisaApplication());
      mockPrisma.visaDocument.create.mockResolvedValue({
        id: 'doc-1',
        visaApplicationId: 'visa-1',
        serviceRequestId: null,
        documentType: 'PASSPORT',
        fileName: 'passport.pdf',
        fileHash: 'abc123',
        fileUrl: 'https://storage.example.com/doc.pdf',
        uploadedAt: new Date(),
        createdAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.create({
        visaApplicationId: 'visa-1',
        documentType: 'PASSPORT',
        fileName: 'passport.pdf',
        fileHash: 'abc123',
        fileUrl: 'https://storage.example.com/doc.pdf',
      }, 'user-1');

      expect(result.documentType).toBe('PASSPORT');
      expect(result.fileName).toBe('passport.pdf');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should create a visa document linked to a service request', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest());
      mockPrisma.visaDocument.create.mockResolvedValue({
        id: 'doc-2',
        visaApplicationId: null,
        serviceRequestId: 'sr-1',
        documentType: 'SUPPORTING_DOCUMENT',
        fileName: 'support.pdf',
        fileHash: null,
        fileUrl: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.create({
        serviceRequestId: 'sr-1',
        documentType: 'SUPPORTING_DOCUMENT',
        fileName: 'support.pdf',
      }, 'user-1');

      expect(result.serviceRequestId).toBe('sr-1');
      expect(result.documentType).toBe('SUPPORTING_DOCUMENT');
    });

    it('should throw NotFoundError for non-existent visa application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(null);

      await expect(service.create({
        visaApplicationId: 'nonexistent',
        documentType: 'PASSPORT',
        fileName: 'test.pdf',
      }, 'user-1')).rejects.toThrow('Visa application not found');
    });

    it('should throw NotFoundError for non-existent service request', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);

      await expect(service.create({
        serviceRequestId: 'nonexistent',
        documentType: 'PASSPORT',
        fileName: 'test.pdf',
      }, 'user-1')).rejects.toThrow('Service request not found');
    });
  });

  describe('findByApplication', () => {
    it('should return documents for an application', async () => {
      mockPrisma.visaDocument.findMany.mockResolvedValue([
        { id: 'doc-1', visaApplicationId: 'visa-1', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date() },
      ]);

      const docs = await service.findByApplication('visa-1');

      expect(docs).toHaveLength(1);
      expect(docs[0].documentType).toBe('PASSPORT');
    });
  });

  describe('findById', () => {
    it('should return document by id', async () => {
      mockPrisma.visaDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        visaApplicationId: 'visa-1',
        documentType: 'PASSPORT',
        fileName: 'passport.pdf',
        uploadedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.findById('doc-1');

      expect(result.id).toBe('doc-1');
    });

    it('should throw NotFoundError for missing document', async () => {
      mockPrisma.visaDocument.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow('Visa document not found');
    });
  });

  describe('delete', () => {
    it('should delete document and log audit', async () => {
      mockPrisma.visaDocument.delete.mockResolvedValue({
        id: 'doc-1',
        visaApplicationId: 'visa-1',
        documentType: 'PASSPORT',
        fileName: 'passport.pdf',
        createdAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.delete('doc-1', 'user-1');

      expect(mockPrisma.visaDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'DELETE', entity: 'VisaDocument' }),
        })
      );
    });

    it('should throw NotFoundError when deleting non-existent document', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.9.0' });
      mockPrisma.visaDocument.delete.mockRejectedValue(prismaError);

      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow('Visa document not found');
    });
  });
});
