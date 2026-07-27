"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = exports.errorMiddleware = void 0;
const exceptions_1 = require("../exceptions");
const client_1 = require("../generated/prisma/client");
/**
 * Global error handling middleware
 */
const errorMiddleware = (error, req, res, next) => {
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
    });
    // Handle Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(error, res);
        return;
    }
    // Handle Prisma validation errors
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid data provided',
                details: error.message,
            },
        });
        return;
    }
    // Handle custom AppErrors
    if (error instanceof exceptions_1.AppError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.constructor.name.replace('Error', '').toUpperCase(),
                message: error.message,
                details: error.details,
            },
        });
        return;
    }
    // Handle unexpected errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: isDevelopment ? error.message : 'An unexpected error occurred',
            ...(isDevelopment && { stack: error.stack }),
        },
    });
};
exports.errorMiddleware = errorMiddleware;
/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error, res) {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const target = error.meta?.target?.join(', ') || 'field';
            res.status(409).json({
                success: false,
                error: {
                    code: 'CONFLICT',
                    message: `${target} already exists`,
                },
            });
            break;
        case 'P2003':
            // Foreign key constraint violation
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REFERENCE',
                    message: 'Referenced record does not exist',
                },
            });
            break;
        case 'P2025':
            // Record not found
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Record not found',
                },
            });
            break;
        default:
            res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'A database error occurred',
                },
            });
    }
}
/**
 * 404 Not Found middleware
 */
const notFoundMiddleware = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
};
exports.notFoundMiddleware = notFoundMiddleware;
