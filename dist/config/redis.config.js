"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
require("dotenv/config");
const logger_config_1 = __importDefault(require("./logger.config"));
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
function createClient() {
    const client = new ioredis_1.default(REDIS_URL, {
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        retryStrategy(times) {
            if (times > 3)
                return null;
            return Math.min(times * 200, 2000);
        },
    });
    client.on('error', (err) => {
        logger_config_1.default.warn('Redis error', { message: err.message });
    });
    client.on('connect', () => {
        logger_config_1.default.info('Redis connected');
    });
    client.on('close', () => {
        logger_config_1.default.warn('Redis connection closed');
    });
    return client;
}
exports.redisClient = global.__redisClient || createClient();
if (process.env.NODE_ENV !== 'production') {
    global.__redisClient = exports.redisClient;
}
