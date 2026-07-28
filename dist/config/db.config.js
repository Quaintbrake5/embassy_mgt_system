"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const logger_config_1 = __importDefault(require("./logger.config"));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const createPrismaClient = () => {
    const envAllowsInsecure = process.env.NODE_ENV === 'development';
    const useSSL = process.env.DATABASE_SSL !== 'false' && !envAllowsInsecure || databaseUrl.includes('sslmode=require');
    if (!useSSL && !envAllowsInsecure) {
        logger_config_1.default.warn('Connecting to PostgreSQL without SSL. Set DATABASE_SSL=true to confirm.');
    }
    const adapter = useSSL
        ? new adapter_pg_1.PrismaPg({
            connectionString: `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`,
        })
        : new adapter_pg_1.PrismaPg({
            connectionString: databaseUrl,
        });
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
};
exports.prisma = global.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
