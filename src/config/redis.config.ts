import Redis from 'ioredis';
import 'dotenv/config';
import logger from './logger.config';

/**
 * Redis client singleton.
 *
 * Security Model:
 * - Dev: localhost, no TLS, no password (defaults)
 * - Production: set REDIS_PASSWORD for AUTH, use `rediss://` scheme in REDIS_URL for TLS
 * - Falls back to in-memory stores if Redis is unavailable
 */

declare global {
  var __redisClient: Redis | undefined;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

function createClient(): Redis {
  const client = new Redis(REDIS_URL, {
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  client.on('error', (err) => {
    logger.warn('Redis error', { message: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
}

export const redisClient = global.__redisClient || createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__redisClient = redisClient;
}
