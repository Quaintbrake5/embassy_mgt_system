"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDocumentService = void 0;
const client_1 = require("../generated/prisma/client");
const exceptions_1 = require("../exceptions");
class VisaDocumentService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        if (dto.visaApplicationId) {
            const app = await this.prisma.visaApplication.findUnique({ where: { id: dto.visaApplicationId } });
            if (!app)
                throw new exceptions_1.NotFoundError('Visa application not found');
        }
        if (dto.serviceRequestId) {
            const req = await this.prisma.serviceRequest.findUnique({ where: { id: dto.serviceRequestId } });
            if (!req)
                throw new exceptions_1.NotFoundError('Service request not found');
        }
        const document = await this.prisma.visaDocument.create({
            data: {
                visaApplicationId: dto.visaApplicationId,
                serviceRequestId: dto.serviceRequestId,
                documentType: dto.documentType,
                fileName: dto.fileName,
                fileHash: dto.fileHash,
                fileUrl: dto.fileUrl,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                entity: 'VisaDocument',
                entityId: document.id,
                description: `Created visa document ${dto.fileName}`,
                metaData: { newValues: { documentType: dto.documentType, fileName: dto.fileName } },
            },
        });
        return this.toResponse(document);
    }
    async findByApplication(visaApplicationId) {
        const documents = await this.prisma.visaDocument.findMany({
            where: { visaApplicationId },
            orderBy: { uploadedAt: 'desc' },
        });
        return documents.map((doc) => this.toResponse(doc));
    }
    async findById(documentId) {
        const document = await this.prisma.visaDocument.findUnique({
            where: { id: documentId },
        });
        if (!document) {
            throw new exceptions_1.NotFoundError('Visa document not found');
        }
        return this.toResponse(document);
    }
    async delete(documentId, userId) {
        let document;
        try {
            document = await this.prisma.visaDocument.delete({
                where: { id: documentId },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new exceptions_1.NotFoundError('Visa document not found');
            }
            throw error;
        }
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE',
                entity: 'VisaDocument',
                entityId: document.id,
                description: `Deleted visa document ${document.fileName}`,
                metaData: { deletedValues: { documentType: document.documentType, fileName: document.fileName } },
            },
        });
    }
    toResponse(document) {
        return {
            id: document.id,
            visaApplicationId: document.visaApplicationId,
            serviceRequestId: document.serviceRequestId,
            documentType: document.documentType,
            fileName: document.fileName,
            fileHash: document.fileHash,
            fileUrl: document.fileUrl,
            uploadedAt: document.uploadedAt,
            createdAt: document.createdAt,
        };
    }
}
exports.VisaDocumentService = VisaDocumentService;
