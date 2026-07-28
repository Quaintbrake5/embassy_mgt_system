"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const visa_document_service_1 = require("../../services/visa-document.service");
jest.mock('../../config/db.config', () => ({
    prisma: mock_db_1.mockPrisma,
}));
const client_1 = require("../../generated/prisma/client");
describe('VisaDocumentService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new visa_document_service_1.VisaDocumentService(mock_db_1.mockPrisma);
    });
    describe('create', () => {
        it('should create a visa document linked to an application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)());
            mock_db_1.mockPrisma.visaDocument.create.mockResolvedValue({
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
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.create({
                visaApplicationId: 'visa-1',
                documentType: 'PASSPORT',
                fileName: 'passport.pdf',
                fileHash: 'abc123',
                fileUrl: 'https://storage.example.com/doc.pdf',
            }, 'user-1');
            expect(result.documentType).toBe('PASSPORT');
            expect(result.fileName).toBe('passport.pdf');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should create a visa document linked to a service request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)());
            mock_db_1.mockPrisma.visaDocument.create.mockResolvedValue({
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
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.create({
                serviceRequestId: 'sr-1',
                documentType: 'SUPPORTING_DOCUMENT',
                fileName: 'support.pdf',
            }, 'user-1');
            expect(result.serviceRequestId).toBe('sr-1');
            expect(result.documentType).toBe('SUPPORTING_DOCUMENT');
        });
        it('should throw NotFoundError for non-existent visa application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue(null);
            await expect(service.create({
                visaApplicationId: 'nonexistent',
                documentType: 'PASSPORT',
                fileName: 'test.pdf',
            }, 'user-1')).rejects.toThrow('Visa application not found');
        });
        it('should throw NotFoundError for non-existent service request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            await expect(service.create({
                serviceRequestId: 'nonexistent',
                documentType: 'PASSPORT',
                fileName: 'test.pdf',
            }, 'user-1')).rejects.toThrow('Service request not found');
        });
    });
    describe('findByApplication', () => {
        it('should return documents for an application', async () => {
            mock_db_1.mockPrisma.visaDocument.findMany.mockResolvedValue([
                { id: 'doc-1', visaApplicationId: 'visa-1', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date() },
            ]);
            const docs = await service.findByApplication('visa-1');
            expect(docs).toHaveLength(1);
            expect(docs[0].documentType).toBe('PASSPORT');
        });
    });
    describe('findById', () => {
        it('should return document by id', async () => {
            mock_db_1.mockPrisma.visaDocument.findUnique.mockResolvedValue({
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
            mock_db_1.mockPrisma.visaDocument.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent')).rejects.toThrow('Visa document not found');
        });
    });
    describe('delete', () => {
        it('should delete document and log audit', async () => {
            mock_db_1.mockPrisma.visaDocument.delete.mockResolvedValue({
                id: 'doc-1',
                visaApplicationId: 'visa-1',
                documentType: 'PASSPORT',
                fileName: 'passport.pdf',
                createdAt: new Date(),
            });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.delete('doc-1', 'user-1');
            expect(mock_db_1.mockPrisma.visaDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: 'DELETE', entity: 'VisaDocument' }),
            }));
        });
        it('should throw NotFoundError when deleting non-existent document', async () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.9.0' });
            mock_db_1.mockPrisma.visaDocument.delete.mockRejectedValue(prismaError);
            await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow('Visa document not found');
        });
    });
});
