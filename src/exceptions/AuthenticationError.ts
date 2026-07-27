import { AppError } from './AppError';

export class AuthenticationError extends AppError {
  public readonly statusCode = 401;
  public readonly isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}