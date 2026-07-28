"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDocumentController = void 0;
const visa_document_dto_1 = require("../dto/visa-document.dto");
const exceptions_1 = require("../exceptions");
class VisaDocumentController {
    constructor(visaDocumentService) {
        this.create = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const dto = visa_document_dto_1.CreateVisaDocumentDto.sanitize(req.body);
                const errors = visa_document_dto_1.CreateVisaDocumentDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const document = await this.visaDocumentService.create(dto, userId);
                res.status(201).json({ success: true, data: document });
            }
            catch (error) {
                next(error);
            }
        };
        this.findByApplication = async (req, res, next) => {
            try {
                const visaApplicationId = req.params.visaApplicationId;
                const documents = await this.visaDocumentService.findByApplication(visaApplicationId);
                res.json({ success: true, data: documents });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const document = await this.visaDocumentService.findById(req.params.id);
                res.json({ success: true, data: document });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                await this.visaDocumentService.delete(req.params.id, userId);
                res.json({ success: true, message: 'Visa document deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.visaDocumentService = visaDocumentService;
    }
}
exports.VisaDocumentController = VisaDocumentController;
