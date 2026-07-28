"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDecisionResponseDto = exports.CreateVisaDecisionDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_DECISIONS = Object.values(enums_1.DecisionType);
class CreateVisaDecisionDto {
    static validate(data) {
        const errors = [];
        if (!data.decision || typeof data.decision !== 'string') {
            errors.push('Decision is required');
        }
        else if (!VALID_DECISIONS.includes(data.decision)) {
            errors.push(`Decision must be one of: ${VALID_DECISIONS.join(', ')}`);
        }
        if (data.remarks !== undefined && typeof data.remarks !== 'string') {
            errors.push('Remarks must be a string');
        }
        if (data.rationale !== undefined && typeof data.rationale !== 'string') {
            errors.push('Rationale must be a string');
        }
        if (data.secondaryOfficerId !== undefined && data.secondaryOfficerId !== null) {
            if (typeof data.secondaryOfficerId !== 'string' || !validator_1.default.isUUID(data.secondaryOfficerId)) {
                errors.push('Secondary officer ID must be a valid UUID');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateVisaDecisionDto();
        dto.decision = data.decision?.trim();
        dto.remarks = data.remarks?.trim();
        dto.rationale = data.rationale?.trim();
        dto.secondaryOfficerId = data.secondaryOfficerId?.trim();
        return dto;
    }
}
exports.CreateVisaDecisionDto = CreateVisaDecisionDto;
class VisaDecisionResponseDto {
}
exports.VisaDecisionResponseDto = VisaDecisionResponseDto;
