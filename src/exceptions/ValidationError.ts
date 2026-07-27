import { AppError } from './AppError';

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly isOperational = true;
  public readonly details: any;

  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400);
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}