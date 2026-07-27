import { PrismaClient } from '../generated/prisma/client';
import { CheckStatus, UrgencyLevel } from '../generated/prisma/enums';
import { VettingResultDto, VerificationCheckResponseDto } from '../dto/vetting.dto';
import { NotFoundError } from '../exceptions';

const RISK_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface IVettingService {
  runVetting(applicationId: string, officerId?: string): Promise<VettingResultDto>;
  getVettingResults(applicationId: string): Promise<VettingResultDto>;
  updateCheckStatus(checkId: string, status: string, checkedBy: string): Promise<VerificationCheckResponseDto>;
}

export class VettingService implements IVettingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async runVetting(applicationId: string, officerId?: string): Promise<VettingResultDto> {
    const application = await this.prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: { select: { userid: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!application) {
      throw new NotFoundError('Visa application not found');
    }

    const user = application.user;

    const watchlistMatches = await this.prisma.watchlistEntry.findMany({
      where: {
        isActive: true,
        OR: [
          { fullName: { contains: user.firstName, mode: 'insensitive' } },
          { fullName: { contains: user.lastName, mode: 'insensitive' } },
        ],
      },
    });

    const checks: VerificationCheckResponseDto[] = [];
    let highestRisk = 0;

    if (watchlistMatches.length > 0) {
      const createdChecks = await Promise.all(
        watchlistMatches.map((entry) => {
          const riskScore = RISK_ORDER[entry.riskLevel] || 0;
          if (riskScore > highestRisk) highestRisk = riskScore;

          return this.prisma.verificationCheck.create({
            data: {
              visaApplicationId: applicationId,
              checkType: 'WATCHLIST',
              result: {
                matched: true,
                watchlistEntryId: entry.id,
                fullName: entry.fullName,
                reason: entry.reason,
                riskLevel: entry.riskLevel,
              },
              status: 'FLAGGED',
              checkedBy: officerId,
              checkedAt: new Date(),
            },
          });
        })
      );

      checks.push(...createdChecks.map((c) => this.toCheckResponse(c)));
    } else {
      const check = await this.prisma.verificationCheck.create({
        data: {
          visaApplicationId: applicationId,
          checkType: 'WATCHLIST',
          result: { matched: false },
          status: 'CLEARED',
          checkedBy: officerId,
          checkedAt: new Date(),
        },
      });

      checks.push(this.toCheckResponse(check));
    }

    const riskLevelMap: Record<number, string> = {
      4: 'CRITICAL',
      3: 'HIGH',
      2: 'MEDIUM',
      1: 'LOW',
    };

    const overallRisk = riskLevelMap[highestRisk] || 'LOW';

    return {
      applicationId,
      checks,
      overallRisk,
    };
  }

  async getVettingResults(applicationId: string): Promise<VettingResultDto> {
    const checks = await this.prisma.verificationCheck.findMany({
      where: { visaApplicationId: applicationId },
      orderBy: { createdAt: 'desc' },
    });

    let highestRisk = 0;

    for (const check of checks) {
      if (check.status === 'FLAGGED' && check.result && typeof check.result === 'object' && 'riskLevel' in (check.result as any)) {
        const riskScore = RISK_ORDER[(check.result as any).riskLevel] || 0;
        if (riskScore > highestRisk) highestRisk = riskScore;
      }
    }

    const riskLevelMap: Record<number, string> = {
      4: 'CRITICAL',
      3: 'HIGH',
      2: 'MEDIUM',
      1: 'LOW',
    };

    const overallRisk = riskLevelMap[highestRisk] || (checks.length === 0 ? 'LOW' : 'MEDIUM');

    return {
      applicationId,
      checks: checks.map((c) => this.toCheckResponse(c)),
      overallRisk,
    };
  }

  async updateCheckStatus(checkId: string, status: string, checkedBy: string): Promise<VerificationCheckResponseDto> {
    const existing = await this.prisma.verificationCheck.findUnique({
      where: { id: checkId },
    });

    if (!existing) {
      throw new NotFoundError('Verification check not found');
    }

    const check = await this.prisma.verificationCheck.update({
      where: { id: checkId },
      data: {
        status: status as any,
        checkedBy,
        checkedAt: new Date(),
      },
    });

    return this.toCheckResponse(check);
  }

  private toCheckResponse(check: any): VerificationCheckResponseDto {
    return {
      id: check.id,
      checkType: check.checkType,
      result: check.result,
      status: check.status,
      checkedBy: check.checkedBy,
      checkedAt: check.checkedAt,
      createdAt: check.createdAt,
    };
  }
}