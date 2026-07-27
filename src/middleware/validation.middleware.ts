import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../exceptions';

/**
 * Validation middleware factory
 * Validates request body against DTO validation rules
 */
export const validate = (dtoClass: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize input
      const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.body) : req.body;

      // Validate
      const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];

      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      // Attach sanitized data to request
      req.body = sanitized;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Query parameter validation
 */
export const validateQuery = (dtoClass: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.query) : req.query;
      const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];

      if (errors.length > 0) {
        throw new ValidationError('Query validation failed', errors);
      }

      req.query = sanitized;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Params validation
 */
export const validateParams = (dtoClass: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const sanitized = dtoClass.sanitize ? dtoClass.sanitize(req.params) : req.params;
      const errors = dtoClass.validate ? dtoClass.validate(sanitized) : [];

      if (errors.length > 0) {
        throw new ValidationError('Params validation failed', errors);
      }

      req.params = sanitized;
      next();
    } catch (error) {
      next(error);
    }
  };
};