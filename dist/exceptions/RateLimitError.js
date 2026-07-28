"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = void 0;
const AppError_1 = require("./AppError");
class RateLimitError extends AppError_1.AppError {
    constructor(message = 'Too many requests, please try again later') {
        super(message, 429);
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
exports.RateLimitError = RateLimitError;
