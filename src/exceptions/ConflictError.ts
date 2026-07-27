import { AppError } from './AppError';

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly isOperational = true;

  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}