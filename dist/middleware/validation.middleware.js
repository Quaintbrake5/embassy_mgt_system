"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validate = void 0;
const exceptions_1 = require("../exceptions");
/**
 * Validation middleware factory
 * Validates request body against DTO validation rules
 */
const validate = (dtoClass) => {
    return (req, res, next) => {
        try {
            // Sanitize input
            const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.body) : req.body;
            // Validate
            const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];
            if (errors.length > 0) {
                throw new exceptions_1.ValidationError('Validation failed', errors);
            }
            // Attach sanitized data to request
            req.body = sanitized;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
/**
 * Query parameter validation
 */
const validateQuery = (dtoClass) => {
    return (req, res, next) => {
        try {
            const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.query) : req.query;
            const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];
            if (errors.length > 0) {
                throw new exceptions_1.ValidationError('Query validation failed', errors);
            }
            req.query = sanitized;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Params validation
 */
const validateParams = (dtoClass) => {
    return (req, res, next) => {
        try {
            const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.params) : req.params;
            const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];
            if (errors.length > 0) {
                throw new exceptions_1.ValidationError('Params validation failed', errors);
            }
            req.params = sanitized;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateParams = validateParams;
