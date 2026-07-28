"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyController = void 0;
const emergency_dto_1 = require("../dto/emergency.dto");
const exceptions_1 = require("../exceptions");
const validator_1 = __importDefault(require("validator"));
class EmergencyController {
    constructor(emergencyService) {
        this.createCase = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = emergency_dto_1.CreateEmergencyCaseDto.sanitize(req.body);
                const errors = emergency_dto_1.CreateEmergencyCaseDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.emergencyService.createCase(dto, userId);
                res.status(201).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.emergencyService.findAll(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const result = await this.emergencyService.findById(id);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateStatus = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const id = req.params.id;
                const result = await this.emergencyService.updateStatus(id, req.body.status, userId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getEvacuationList = async (req, res, next) => {
            try {
                const embassyId = req.query.embassyId;
                if (!embassyId) {
                    throw new exceptions_1.ValidationError('Embassy ID is required');
                }
                if (!validator_1.default.isUUID(embassyId)) {
                    throw new exceptions_1.ValidationError('Embassy ID must be a valid UUID');
                }
                const result = await this.emergencyService.getEvacuationList(embassyId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.broadcastAlert = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = emergency_dto_1.AlertBroadcastDto.sanitize(req.body);
                const errors = emergency_dto_1.AlertBroadcastDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                await this.emergencyService.broadcastAlert(dto, userId);
                res.status(201).json({ success: true, message: 'Alert broadcasted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.emergencyService = emergencyService;
    }
}
exports.EmergencyController = EmergencyController;
