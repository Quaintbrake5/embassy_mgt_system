"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path_1.default.join(__dirname, 'logs');
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';
const logger = winston_1.default.createLogger({
    level: isTest ? 'silent' : logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'embassy-mgt-system' },
    transports: [],
});
if (isTest) {
    logger.add(new winston_1.default.transports.Console({ silent: true }));
}
else {
    logger.add(new winston_1.default.transports.Console({
        format: isProduction
            ? winston_1.default.format.json()
            : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
                const corr = correlationId ? ` [${correlationId}]` : '';
                const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}${corr}: ${message}${metaStr}`;
            })),
    }));
    try {
        logger.add(new winston_1.default.transports.File({
            dirname: logDir,
            filename: 'error.log',
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
        }));
        logger.add(new winston_1.default.transports.File({
            dirname: logDir,
            filename: 'combined.log',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
        }));
    }
    catch (err) {
        const message = `Failed to initialize file transports, falling back to console only: ${err instanceof Error ? err.message : String(err)}`;
        logger.warn(message);
        process.emitWarning(message);
    }
}
exports.default = logger;
