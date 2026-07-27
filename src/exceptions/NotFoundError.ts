import { AppError } from './AppError';

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly isOperational = true;

  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}