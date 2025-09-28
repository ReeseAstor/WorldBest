import Redis from 'ioredis';
import { config } from './config';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }

    const ttl = await this.client.ttl(key);
    const remaining = Math.max(0, limit - current);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: current <= limit,
      remaining,
      resetTime,
    };
  }

  // Caching
  async setCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`cache:${key}`, ttl, JSON.stringify(data));
  }

  async getCache(key: string): Promise<any | null> {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  // User data
  async setUserData(userId: string, data: any, ttl: number = 1800): Promise<void> {
    await this.client.setex(`user:${userId}`, ttl, JSON.stringify(data));
  }

  async getUserData(userId: string): Promise<any | null> {
    const data = await this.client.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserData(userId: string): Promise<void> {
    await this.client.del(`user:${userId}`);
  }

  // Project data
  async setProjectData(projectId: string, data: any, ttl: number = 1800): Promise<void> {
    await this.client.setex(`project:${projectId}`, ttl, JSON.stringify(data));
  }

  async getProjectData(projectId: string): Promise<any | null> {
    const data = await this.client.get(`project:${projectId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteProjectData(projectId: string): Promise<void> {
    await this.client.del(`project:${projectId}`);
  }

  // AI generation cache
  async setAIGenerationCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`ai:${key}`, ttl, JSON.stringify(data));
  }

  async getAIGenerationCache(key: string): Promise<any | null> {
    const data = await this.client.get(`ai:${key}`);
    return data ? JSON.parse(data) : null;
  }

  // Pub/Sub for real-time features
  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        console.error('Error parsing Redis message:', error);
      }
    });
  }

  // Health check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // Get info
  async getInfo(): Promise<string> {
    return await this.client.info();
  }
}

export const RedisClient = new RedisClient();