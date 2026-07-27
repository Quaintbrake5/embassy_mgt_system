import { PrismaClient } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import {
  CreateVisaApplicationDto,
  VisaApplicationResponseDto,
  PaginatedVisaApplicationsDto,
} from '../dto/visa-application.dto';
import { NotFoundError, ValidationError } from '../exceptions';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'MORE_INFO_REQUESTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'ESCALATED', 'MORE_INFO_REQUESTED'],
  MORE_INFO_REQUESTED: ['SUBMITTED'],
  APPROVED: ['ISSUED'],
  ESCALATED: ['APPROVED', 'REJECTED'],
  REJECTED: [],
  ISSUED: [],
};

export interface IVisaApplicationService {
  create(userId: string, dto: CreateVisaApplicationDto): Promise<VisaApplicationResponseDto>;
  findById(applicationId: string): Promise<VisaApplicationResponseDto>;
  findByApplicationNumber(appNumber: string): Promise<VisaApplicationResponseDto>;
  findAll(params: { userId?: string; embassyId?: string; status?: string; visaType?: string; page?: number; limit?: number }): Promise<PaginatedVisaApplicationsDto>;
  submit(applicationId: string, userId: string): Promise<VisaApplicationResponseDto>;
}

function generateApplicationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(8).toString('hex').toUpperCase();
  return `VA-${timestamp}-${random}`;
}

export class VisaApplicationService implements IVisaApplicationService {
  private prisma: PrismaClient;

  private static readonly VISA_INCLUDE = {
    user: { select: { userid: true, firstName: true, lastName: true, email: true } },
    embassy: { select: { id: true, name: true, code: true, country: true, city: true } },
    documents: { select: { id: true, documentType: true, fileName: true, status: true, uploadedAt: true } },
    decision: { select: { id: true, decisionType: true, reason: true, decidedAt: true } },
    payments: { select: { id: true, amount: true, currency: true, status: true, createdAt: true } },
    verificationChecks: { select: { id: true, checkType: true, status: true, result: true, checkedAt: true } },
  } as const;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(userId: string, dto: CreateVisaApplicationDto): Promise<VisaApplicationResponseDto> {
    const embassy = await this.prisma.embassy.findUnique({ where: { id: dto.embassyId } });

    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const application = await this.prisma.visaApplication.create({
      data: {
        applicationNumber: generateApplicationNumber(),
        userId,
        visaType: dto.visaType as any,
        embassyId: dto.embassyId,
        status: 'DRAFT',
      },
      include: VisaApplicationService.VISA_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'VisaApplication',
        entityId: application.id,
        description: `Created visa application: ${application.applicationNumber}`,
        metaData: { newValues: { applicationNumber: application.applicationNumber, visaType: dto.visaType } },
      },
    });

    await this.runAutomatedVetting(application.id, userId);

    return this.toResponse(application);
  }

  private async runAutomatedVetting(applicationId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!user) return;

    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();

    const watchlistEntries = await this.prisma.watchlistEntry.findMany({
      where: { isActive: true },
    });

    const matches = watchlistEntries.filter((entry) => {
      return entry.fullName.toLowerCase() === fullName;
    });

    for (const entry of matches) {
      await this.prisma.verificationCheck.create({
        data: {
          visaApplicationId: applicationId,
          checkType: 'WATCHLIST',
          status: 'PENDING',
          checkedBy: userId,
          result: { watchlistEntryId: entry.id, reason: entry.reason, riskLevel: entry.riskLevel },
        },
      });
    }
  }

  async findById(applicationId: string): Promise<VisaApplicationResponseDto> {
    const application = await this.prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: VisaApplicationService.VISA_INCLUDE,
    });

    if (!application) {
      throw new NotFoundError('Visa application not found');
    }

    return this.toResponse(application);
  }

  async findByApplicationNumber(appNumber: string): Promise<VisaApplicationResponseDto> {
    const application = await this.prisma.visaApplication.findUnique({
      where: { applicationNumber: appNumber },
      include: VisaApplicationService.VISA_INCLUDE,
    });

    if (!application) {
      throw new NotFoundError('Visa application not found');
    }

    return this.toResponse(application);
  }

  async findAll(params: {
    userId?: string;
    embassyId?: string;
    status?: string;
    visaType?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedVisaApplicationsDto> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.embassyId) where.embassyId = params.embassyId;
    if (params.status) where.status = params.status;
    if (params.visaType) where.visaType = params.visaType;

    const [data, total] = await Promise.all([
      this.prisma.visaApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: VisaApplicationService.VISA_INCLUDE,
      }),
      this.prisma.visaApplication.count({ where }),
    ]);

    return {
      data: data.map((r) => this.toResponse(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async submit(applicationId: string, userId: string): Promise<VisaApplicationResponseDto> {
    const existing = await this.prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!existing) {
      throw new NotFoundError('Visa application not found');
    }

    const allowedNext = VALID_TRANSITIONS[existing.status];
    if (!allowedNext || !allowedNext.includes('SUBMITTED')) {
      throw new ValidationError(
        `Cannot submit application in status ${existing.status}. Only DRAFT applications can be submitted.`
      );
    }

    const application = await this.prisma.visaApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: VisaApplicationService.VISA_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SUBMIT',
        entity: 'VisaApplication',
        entityId: applicationId,
        description: `Submitted visa application: ${application.applicationNumber}`,
        metaData: {
          oldValues: { status: existing.status },
          newValues: { status: 'SUBMITTED' },
        },
      },
    });

    return this.toResponse(application);
  }

  private toResponse(application: any): VisaApplicationResponseDto {
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      userId: application.userId,
      visaType: application.visaType,
      embassyId: application.embassyId,
      status: application.status,
      submittedAt: application.submittedAt,
      decisionAt: application.decisionAt,
      createdAt: application.createdAt,
      updatedAt: application.Updated,
      user: application.user,
      embassy: application.embassy,
      documents: application.documents?.map((d: any) => ({
        id: d.id,
        documentType: d.documentType,
        fileName: d.fileName,
        status: d.status,
        uploadedAt: d.uploadedAt,
      })) || [],
      decision: application.decision
        ? {
            id: application.decision.id,
            decisionType: application.decision.decisionType,
            reason: application.decision.reason,
            decidedAt: application.decision.decidedAt,
          }
        : null,
      payments: application.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount?.toNumber ? p.amount.toNumber() : p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })) || [],
      verificationChecks: application.verificationChecks?.map((v: any) => ({
        id: v.id,
        checkType: v.checkType,
        status: v.status,
        result: v.result,
        checkedAt: v.checkedAt,
      })) || [],
    };
  }
}