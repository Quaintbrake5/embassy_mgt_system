"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_config_1 = require("./config/redis.config");
const uuid_1 = require("uuid");
require("dotenv/config");
const audit_middleware_1 = require("./middleware/audit.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const requestLogger_middleware_1 = require("./middleware/requestLogger.middleware");
const metrics_middleware_1 = require("./middleware/metrics.middleware");
const metrics_config_1 = require("./config/metrics.config");
const routes_1 = __importDefault(require("./routes"));
const db_config_1 = require("./config/db.config");
const audit_service_1 = require("./services/audit.service");
const logger_config_1 = __importDefault(require("./config/logger.config"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_config_1 = __importDefault(require("./config/swagger.config"));
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
const isDevelopment = process.env.NODE_ENV === 'development';
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            'upgrade-insecure-requests': isDevelopment ? null : [],
        },
    },
}));
function createRedisStore(prefix) {
    if (redis_config_1.redisClient.status === 'ready') {
        logger_config_1.default.info('Rate-limit using Redis store', { prefix });
        return new rate_limit_redis_1.RedisStore({
            sendCommand: (command, ...args) => redis_config_1.redisClient.call(command, ...args),
            prefix,
        });
    }
    if (redis_config_1.redisClient.status === 'connecting') {
        logger_config_1.default.info('Rate-limit Redis store pending (cold start)', { prefix });
    }
    else if (redis_config_1.redisClient.status === 'reconnecting' || redis_config_1.redisClient.status === 'close') {
        logger_config_1.default.warn('Rate-limit falling back to in-memory store because Redis is unavailable. In production, this means rate limiting is per-process, not global.', { prefix });
    }
    return undefined;
}
if (redis_config_1.redisClient.status !== 'ready') {
    redis_config_1.redisClient.once('ready', () => {
        logger_config_1.default.info('Rate-limit Redis store now available (cold start)');
    });
}
function rateLimitHandler(req, res) {
    const retryAfter = Math.ceil((req.rateLimit?.resetTime
        ? (new Date(req.rateLimit.resetTime).getTime() - Date.now()) / 1000
        : 60));
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter,
        },
    });
}
const generalRedisStore = createRedisStore('rl:general:');
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    ...(generalRedisStore ? { store: generalRedisStore } : {}),
    handler: rateLimitHandler,
});
app.use(generalLimiter);
app.use((req, _res, next) => {
    const correlationId = (0, uuid_1.v4)();
    req.correlationId = correlationId;
    _res.locals.correlationId = correlationId;
    _res.setHeader('X-Correlation-ID', correlationId);
    next();
});
app.use(requestLogger_middleware_1.requestLogger);
app.use(metrics_middleware_1.metricsMiddleware);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const authRedisStore = createRedisStore('rl:auth:');
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    ...(authRedisStore ? { store: authRedisStore } : {}),
    handler: rateLimitHandler,
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'embassy-mgt-system',
    });
});
if (process.env.METRICS_ENABLED !== 'false') {
    app.get('/metrics', async (_req, res) => {
        try {
            res.setHeader('Content-Type', metrics_config_1.register.contentType);
            const metrics = await metrics_config_1.register.metrics();
            res.send(metrics);
        }
        catch (err) {
            logger_config_1.default.error('Failed to generate metrics', { error: err });
            res.status(500).json({ success: false, error: { code: 'METRICS_ERROR', message: 'Failed to generate metrics' } });
        }
    });
}
app.get('/', (_req, res) => {
    res.json({
        name: 'Embassy Management System API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api-docs',
        health: '/health',
    });
});
if (process.env.ENABLE_SWAGGER === 'true') {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_config_1.default, {
        customSiteTitle: 'EMS API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
    }));
}
app.use('/api/v1/auth', authLimiter);
app.use(audit_middleware_1.auditMiddleware);
app.use('/api/v1', routes_1.default);
app.use(error_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555', 10);
const auditService = new audit_service_1.AuditService(db_config_1.prisma);
const cleanupTimer = setInterval(async () => {
    try {
        const deleted = await auditService.purgeOldLogs(retentionDays);
        if (deleted > 0) {
            logger_config_1.default.info(`Purged ${deleted} audit log(s) older than ${retentionDays} days`);
        }
    }
    catch (err) {
        logger_config_1.default.error('Audit retention cleanup failed', { error: err });
    }
}, RETENTION_INTERVAL_MS);
if (process.env.NODE_ENV !== 'test') {
    cleanupTimer.unref();
}
exports.default = app;
