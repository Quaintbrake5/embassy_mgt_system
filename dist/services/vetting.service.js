"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VettingService = void 0;
const exceptions_1 = require("../exceptions");
const RISK_ORDER = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};
class VettingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runVetting(applicationId, officerId) {
        const application = await this.prisma.visaApplication.findUnique({
            where: { id: applicationId },
            include: {
                user: { select: { userid: true, firstName: true, lastName: true, email: true } },
            },
        });
        if (!application) {
            throw new exceptions_1.NotFoundError('Visa application not found');
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
        const checks = [];
        let highestRisk = 0;
        if (watchlistMatches.length > 0) {
            const createdChecks = await Promise.all(watchlistMatches.map((entry) => {
                const riskScore = RISK_ORDER[entry.riskLevel] || 0;
                if (riskScore > highestRisk)
                    highestRisk = riskScore;
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
            }));
            checks.push(...createdChecks.map((c) => this.toCheckResponse(c)));
        }
        else {
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
        const riskLevelMap = {
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
    async getVettingResults(applicationId) {
        const checks = await this.prisma.verificationCheck.findMany({
            where: { visaApplicationId: applicationId },
            orderBy: { createdAt: 'desc' },
        });
        let highestRisk = 0;
        for (const check of checks) {
            if (check.status === 'FLAGGED' && check.result && typeof check.result === 'object' && 'riskLevel' in check.result) {
                const riskScore = RISK_ORDER[check.result.riskLevel] || 0;
                if (riskScore > highestRisk)
                    highestRisk = riskScore;
            }
        }
        const riskLevelMap = {
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
    async updateCheckStatus(checkId, status, checkedBy) {
        const existing = await this.prisma.verificationCheck.findUnique({
            where: { id: checkId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Verification check not found');
        }
        const check = await this.prisma.verificationCheck.update({
            where: { id: checkId },
            data: {
                status: status,
                checkedBy,
                checkedAt: new Date(),
            },
        });
        return this.toCheckResponse(check);
    }
    toCheckResponse(check) {
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
exports.VettingService = VettingService;
