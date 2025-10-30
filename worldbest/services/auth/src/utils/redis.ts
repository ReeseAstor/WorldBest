import Redis from 'ioredis';
import { logger } from './logger';

export let redisClient: Redis;

export async function initializeRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    // Test connection
    await redisClient.ping();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
});