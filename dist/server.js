"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const db_config_1 = require("./config/db.config");
const audit_middleware_1 = require("./middleware/audit.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    console.log('REQUEST:', req.method, req.path);
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'Embassy Management System API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/v1',
        health: '/health',
    });
});
// Test route
app.get('/test', (req, res) => {
    res.json({ test: true });
});
// API routes
app.use('/api/v1', routes_1.default);
// Global middleware
app.use(audit_middleware_1.auditMiddleware);
// Error handling
app.use(error_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    await db_config_1.prisma.$disconnect();
    process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
exports.default = app;
