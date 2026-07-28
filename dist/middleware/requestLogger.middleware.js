"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_config_1 = __importDefault(require("../config/logger.config"));
const SENSITIVE_QUERY_PARAMS = ['token', 'password', 'secret', 'key', 'access_token', 'refresh_token', 'api_key'];
function sanitizeQuery(url) {
    try {
        const urlObj = new URL(url, 'http://localhost');
        SENSITIVE_QUERY_PARAMS.forEach(param => {
            if (urlObj.searchParams.has(param)) {
                urlObj.searchParams.set(param, '[REDACTED]');
            }
        });
        return urlObj.pathname + urlObj.search;
    }
    catch {
        return url;
    }
}
function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const rawUrl = req.originalUrl || req.url;
        const sanitizedUrl = sanitizeQuery(rawUrl);
        const logData = {
            method: req.method,
            url: sanitizedUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
            contentLength: res.getHeader('content-length') || 0,
            correlationId: req.correlationId || res.locals.correlationId || '-',
            userAgent: req.get('user-agent') || '-',
            remoteAddr: req.ip || req.socket.remoteAddress || '-',
            userId: req.user?.userId,
        };
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger_config_1.default.log(level, `${req.method} ${sanitizedUrl} ${res.statusCode}`, logData);
    });
    next();
}
