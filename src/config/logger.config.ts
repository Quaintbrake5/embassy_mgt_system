import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path.join(__dirname, 'logs');
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isTest ? 'silent' : logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'embassy-mgt-system' },
  transports: [],
});

if (isTest) {
  logger.add(new winston.transports.Console({ silent: true }));
} else {
  logger.add(new winston.transports.Console({
    format: isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
            const corr = correlationId ? ` [${correlationId}]` : '';
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}${corr}: ${message}${metaStr}`;
          }),
        ),
  }));

  try {
    logger.add(new winston.transports.File({
      dirname: logDir,
      filename: 'error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }));

    logger.add(new winston.transports.File({
      dirname: logDir,
      filename: 'combined.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 10,
    }));
  } catch (err) {
    const message = `Failed to initialize file transports, falling back to console only: ${err instanceof Error ? err.message : String(err)}`;
    logger.warn(message);
    process.emitWarning(message);
  }
}

export default logger;