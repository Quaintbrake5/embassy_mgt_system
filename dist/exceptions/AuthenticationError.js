"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = void 0;
const AppError_1 = require("./AppError");
class AuthenticationError extends AppError_1.AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
        this.statusCode = 401;
        this.isOperational = true;
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
exports.AuthenticationError = AuthenticationError;
