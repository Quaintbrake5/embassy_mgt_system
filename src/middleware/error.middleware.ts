import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions';
import { Prisma } from '../generated/prisma/client';
import logger from '../config/logger.config';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId: req.correlationId,
    userId: req.user?.userId,
  });

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, res);
    return;
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
      },
    });
    return;
  }

  // Handle custom AppErrors
  if (error instanceof AppError) {
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

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (error.code) {
    case 'P2002':
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      logger.warn('Unique constraint violation', { target, code: error.code });
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
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
export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};