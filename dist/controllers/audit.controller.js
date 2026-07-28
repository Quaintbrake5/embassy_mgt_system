"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
class AuditController {
    constructor(auditService) {
        this.getLogs = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const userId = req.query.userId;
                const entity = req.query.entity;
                const action = req.query.action;
                const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
                const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
                const result = await this.auditService.findAll({
                    userId, entity, action, startDate, endDate, page, limit,
                });
                res.json({
                    success: true,
                    data: result.data,
                    meta: result.meta,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getLogById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const log = await this.auditService.findById(id);
                res.json({
                    success: true,
                    data: log,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.exportLogs = async (req, res, next) => {
            try {
                const entity = req.query.entity;
                const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
                const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
                const logs = await this.auditService.exportLogs({ startDate, endDate, entity });
                res.json({
                    success: true,
                    data: logs,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.auditService = auditService;
    }
}
exports.AuditController = AuditController;
