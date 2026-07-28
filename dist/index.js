"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const db_config_1 = require("./config/db.config");
const logger_config_1 = __importDefault(require("./config/logger.config"));
const PORT = process.env.PORT || 3010;
async function startServer() {
    try {
        await db_config_1.prisma.$connect();
        logger_config_1.default.info('Database connected successfully');
        const server = server_1.default.listen(PORT, () => {
            logger_config_1.default.info(`Server running on port ${PORT}`, { port: PORT });
        });
        const shutdown = async (signal) => {
            logger_config_1.default.info(`Received ${signal}, shutting down gracefully`);
            server.close(async () => {
                logger_config_1.default.info('HTTP server closed');
                await db_config_1.prisma.$disconnect();
                logger_config_1.default.info('Database disconnected');
                process.exit(0);
            });
            setTimeout(() => {
                logger_config_1.default.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_config_1.default.error('Failed to start server', { error });
        process.exit(1);
    }
}
startServer();
