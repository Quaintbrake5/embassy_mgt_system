"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const db_config_1 = require("./config/db.config");
const PORT = process.env.PORT || 3010;
async function startServer() {
    try {
        // Test database connection
        await db_config_1.prisma.$connect();
        console.log('Database connected successfully!');
        const server = server_1.default.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api/v1`);
            console.log(`Health check at http://localhost:${PORT}/health`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                console.log('HTTP server closed');
                await db_config_1.prisma.$disconnect();
                console.log('Database disconnected');
                process.exit(0);
            });
            // Force close after 10 seconds
            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
