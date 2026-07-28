import app from './server';
import { prisma } from './config/db.config';
import logger from './config/logger.config';

const PORT = process.env.PORT || 3010;

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { port: PORT });
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();