"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const financial_dto_1 = require("../dto/financial.dto");
const exceptions_1 = require("../exceptions");
class FinancialController {
    constructor(financialService) {
        this.recordTransaction = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = financial_dto_1.RecordTransactionDto.sanitize(req.body);
                const errors = financial_dto_1.RecordTransactionDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.financialService.recordTransaction(dto, userId);
                res.status(201).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.findTransactions = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.financialService.findTransactions(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findTransactionById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const result = await this.financialService.findTransactionById(id);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getDailyReconciliation = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const date = req.query.date || new Date().toISOString().split('T')[0];
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
                    throw new exceptions_1.ValidationError('Date must be a valid date in YYYY-MM-DD format');
                }
                const result = await this.financialService.getDailyReconciliation(date, userId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getMonthlyReport = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const year = parseInt(req.query.year) || new Date().getFullYear();
                const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
                const result = await this.financialService.getMonthlyReport(year, month, userId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.financialService = financialService;
    }
}
exports.FinancialController = FinancialController;
