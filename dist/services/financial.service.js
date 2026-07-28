"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialService = void 0;
const exceptions_1 = require("../exceptions");
class FinancialService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordTransaction(dto, userId) {
        if (dto.serviceRequestId) {
            const serviceRequest = await this.prisma.serviceRequest.findUnique({
                where: { id: dto.serviceRequestId },
            });
            if (!serviceRequest) {
                throw new exceptions_1.NotFoundError('Service request not found');
            }
        }
        if (dto.visaApplicationId) {
            const visaApplication = await this.prisma.visaApplication.findUnique({
                where: { id: dto.visaApplicationId },
            });
            if (!visaApplication) {
                throw new exceptions_1.NotFoundError('Visa application not found');
            }
        }
        const payer = await this.prisma.user.findUnique({ where: { userid: dto.userId } });
        if (!payer) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        const payment = await this.prisma.payment.create({
            data: {
                serviceRequestId: dto.serviceRequestId || null,
                visaApplicationId: dto.visaApplicationId || null,
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency,
                status: 'PENDING',
                paymentMethod: dto.paymentMethod || null,
                transactionId: dto.transactionId || null,
            },
            include: FinancialService.PAYMENT_INCLUDE,
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                entity: 'Payment',
                entityId: payment.id,
                description: `Recorded payment of ${dto.amount} ${dto.currency} for user ${dto.userId}`,
                metaData: { newValues: { amount: dto.amount, currency: dto.currency, userId: dto.userId } },
            },
        });
        return this.toResponse(payment);
    }
    async findTransactions(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: FinancialService.PAYMENT_INCLUDE,
            }),
            this.prisma.payment.count(),
        ]);
        return {
            data: data.map((p) => this.toResponse(p)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findTransactionById(id) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: FinancialService.PAYMENT_INCLUDE,
        });
        if (!payment) {
            throw new exceptions_1.NotFoundError('Payment not found');
        }
        return this.toResponse(payment);
    }
    async getDailyReconciliation(date, userId) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        const payments = await this.prisma.payment.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });
        const totalCollections = payments
            .filter((p) => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const paymentsByStatus = {};
        for (const p of payments) {
            paymentsByStatus[p.status] = (paymentsByStatus[p.status] || 0) + 1;
        }
        const discrepancyCount = payments.filter((p) => p.status === 'FAILED').length;
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'RECONCILE',
                entity: 'Payment',
                entityId: date,
                description: `Daily reconciliation for ${date}`,
                metaData: { date, totalTransactions: payments.length, discrepancyCount },
            },
        });
        return {
            date,
            totalCollections,
            totalTransactions: payments.length,
            paymentsByStatus,
            discrepancyCount,
        };
    }
    async getMonthlyReport(year, month, userId) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const payments = await this.prisma.payment.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                serviceRequest: {
                    select: {
                        serviceType: { select: { name: true, category: true } },
                    },
                },
            },
        });
        const totalCollections = payments
            .filter((p) => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const byService = {};
        const byCurrency = {};
        const byOfficer = {};
        for (const p of payments) {
            const serviceName = p.serviceRequest?.serviceType?.name || 'UNKNOWN';
            if (!byService[serviceName])
                byService[serviceName] = { count: 0, total: 0 };
            byService[serviceName].count++;
            if (p.status === 'COMPLETED')
                byService[serviceName].total += Number(p.amount);
            if (!byCurrency[p.currency])
                byCurrency[p.currency] = { count: 0, total: 0 };
            byCurrency[p.currency].count++;
            if (p.status === 'COMPLETED')
                byCurrency[p.currency].total += Number(p.amount);
            if (!byOfficer[p.userId])
                byOfficer[p.userId] = { count: 0, total: 0 };
            byOfficer[p.userId].count++;
            if (p.status === 'COMPLETED')
                byOfficer[p.userId].total += Number(p.amount);
        }
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'REPORT',
                entity: 'Payment',
                entityId: `${year}-${month}`,
                description: `Monthly report for ${year}/${month}`,
                metaData: { year, month, totalTransactions: payments.length, totalCollections },
            },
        });
        return {
            month,
            year,
            totalCollections,
            totalTransactions: payments.length,
            byService,
            byCurrency,
            byOfficer,
        };
    }
    toResponse(payment) {
        return {
            id: payment.id,
            serviceRequestId: payment.serviceRequestId || undefined,
            visaApplicationId: payment.visaApplicationId || undefined,
            userId: payment.userId,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod || undefined,
            transactionId: payment.transactionId || undefined,
            paidAt: payment.paidAt || undefined,
            createdAt: payment.createdAt,
        };
    }
}
exports.FinancialService = FinancialService;
FinancialService.PAYMENT_INCLUDE = {
    serviceRequest: { select: { id: true, referenceNumber: true, status: true } },
    visaApplication: { select: { id: true, applicationNumber: true, status: true } },
    user: { select: { userid: true, firstName: true, lastName: true, email: true } },
};
