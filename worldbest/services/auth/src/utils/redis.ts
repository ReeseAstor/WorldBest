import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redis: Redis;

export async function connectRedis() {
  try {
    redis = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Test the connection
    await redis.ping();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redis) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redis;
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    logger.info('Redis disconnected');
  }
}

// Helper functions for common Redis operations
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = getRedisClient();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async delHash(key: string, field: string): Promise<number> {
    return await this.client.hdel(key, field);
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    return await this.client.incrby(key, amount);
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return await this.client.decrby(key, amount);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
}