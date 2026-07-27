import { AppError } from './AppError';

export class AuthorizationError extends AppError {
  public readonly statusCode = 403;
  public readonly isOperational = true;

  constructor(message: string = 'Forbidden: Insufficient permissions', details?: any) {
    super(message, 403, details);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}