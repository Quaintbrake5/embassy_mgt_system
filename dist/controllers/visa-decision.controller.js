"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDecisionController = void 0;
const visa_decision_dto_1 = require("../dto/visa-decision.dto");
const exceptions_1 = require("../exceptions");
class VisaDecisionController {
    constructor(visaDecisionService) {
        this.createDecision = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const applicationId = req.params.id;
                const dto = visa_decision_dto_1.CreateVisaDecisionDto.sanitize(req.body);
                const errors = visa_decision_dto_1.CreateVisaDecisionDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const decision = await this.visaDecisionService.createDecision(applicationId, dto, userId);
                res.status(201).json({ success: true, data: decision });
            }
            catch (error) {
                next(error);
            }
        };
        this.getDecision = async (req, res, next) => {
            try {
                const applicationId = req.params.id;
                const decision = await this.visaDecisionService.getDecision(applicationId);
                res.json({ success: true, data: decision });
            }
            catch (error) {
                next(error);
            }
        };
        this.getMyDecisions = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.visaDecisionService.getDecisionsByOfficer(userId, page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.visaDecisionService = visaDecisionService;
    }
}
exports.VisaDecisionController = VisaDecisionController;
