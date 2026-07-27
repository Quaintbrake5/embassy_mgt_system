"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = void 0;
const AppError_1 = require("./AppError");
class AuthorizationError extends AppError_1.AppError {
    constructor(message = 'Forbidden: Insufficient permissions', details) {
        super(message, 403, details);
        this.statusCode = 403;
        this.isOperational = true;
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
exports.AuthorizationError = AuthorizationError;
