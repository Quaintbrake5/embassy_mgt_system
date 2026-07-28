"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalizationController = void 0;
const legalization_dto_1 = require("../dto/legalization.dto");
const exceptions_1 = require("../exceptions");
class LegalizationController {
    constructor(legalizationService) {
        this.create = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = legalization_dto_1.CreateLegalizationDto.sanitize(req.body);
                const errors = legalization_dto_1.CreateLegalizationDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.legalizationService.create(dto, userId);
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
                const result = await this.legalizationService.findAll(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const result = await this.legalizationService.findById(id);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.process = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const id = req.params.id;
                const dto = legalization_dto_1.ProcessLegalizationDto.sanitize(req.body);
                const errors = legalization_dto_1.ProcessLegalizationDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.legalizationService.process(id, dto, userId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.legalizationService = legalizationService;
    }
}
exports.LegalizationController = LegalizationController;
