import { PrismaClient, Prisma } from '../generated/prisma/client';
import { CreateVisaDocumentDto, VisaDocumentResponseDto } from '../dto/visa-document.dto';
import { NotFoundError } from '../exceptions';

export interface IVisaDocumentService {
  create(dto: CreateVisaDocumentDto, userId: string): Promise<VisaDocumentResponseDto>;
  findByApplication(visaApplicationId: string): Promise<VisaDocumentResponseDto[]>;
  findById(documentId: string): Promise<VisaDocumentResponseDto>;
  delete(documentId: string, userId: string): Promise<void>;
}

export class VisaDocumentService implements IVisaDocumentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateVisaDocumentDto, userId: string): Promise<VisaDocumentResponseDto> {
    if (dto.visaApplicationId) {
      const app = await this.prisma.visaApplication.findUnique({ where: { id: dto.visaApplicationId } });
      if (!app) throw new NotFoundError('Visa application not found');
    }

    if (dto.serviceRequestId) {
      const req = await this.prisma.serviceRequest.findUnique({ where: { id: dto.serviceRequestId } });
      if (!req) throw new NotFoundError('Service request not found');
    }

    const document = await this.prisma.visaDocument.create({
      data: {
        visaApplicationId: dto.visaApplicationId,
        serviceRequestId: dto.serviceRequestId,
        documentType: dto.documentType as any,
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

  async findByApplication(visaApplicationId: string): Promise<VisaDocumentResponseDto[]> {
    const documents = await this.prisma.visaDocument.findMany({
      where: { visaApplicationId },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents.map((doc) => this.toResponse(doc));
  }

  async findById(documentId: string): Promise<VisaDocumentResponseDto> {
    const document = await this.prisma.visaDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Visa document not found');
    }

    return this.toResponse(document);
  }

  async delete(documentId: string, userId: string): Promise<void> {
    let document;
    try {
      document = await this.prisma.visaDocument.delete({
        where: { id: documentId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Visa document not found');
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

  private toResponse(document: any): VisaDocumentResponseDto {
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