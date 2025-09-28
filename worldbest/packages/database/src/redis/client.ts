import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis | null = null;
  private static pubClient: Redis | null = null;
  private static subClient: Redis | null = null;

  static getInstance(): Redis {
    if (!this.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some(e => err.message.includes(e));
        },
        lazyConnect: true,
      });

      this.instance.on('error', (error) => {
        console.error('Redis error:', error);
      });

      this.instance.on('connect', () => {
        console.log('Redis connected successfully');
      });
    }

    return this.instance;
  }

  static async connect(): Promise<void> {
    const client = this.getInstance();
    await client.connect();
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }
    if (this.subClient) {
      await this.subClient.quit();
      this.subClient = null;
    }
  }

  // Session management
  static async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    const client = this.getInstance();
    await client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const client = this.getInstance();
    const data = await client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const client = this.getInstance();
    await client.del(`session:${sessionId}`);
  }

  static async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    const client = this.getInstance();
    await client.expire(`session:${sessionId}`, ttl);
  }

  // Cache management
  static async setCache(key: string, data: any, ttl?: number): Promise<void> {
    const client = this.getInstance();
    const serialized = JSON.stringify(data);
    
    if (ttl) {
      await client.setex(`cache:${key}`, ttl, serialized);
    } else {
      await client.set(`cache:${key}`, serialized);
    }
  }

  static async getCache(key: string): Promise<any | null> {
    const client = this.getInstance();
    const data = await client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  static async deleteCache(key: string): Promise<void> {
    const client = this.getInstance();
    await client.del(`cache:${key}`);
  }

  static async invalidateCachePattern(pattern: string): Promise<void> {
    const client = this.getInstance();
    const keys = await client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  // Rate limiting
  static async checkRateLimit(
    identifier: string,
    limit: number,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const client = this.getInstance();
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Remove old entries
    await client.zremrangebyscore(key, '-inf', windowStart);

    // Count current entries
    const count = await client.zcard(key);

    if (count < limit) {
      // Add new entry
      await client.zadd(key, now, `${now}-${Math.random()}`);
      await client.expire(key, window);

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: now + window * 1000
      };
    }

    // Get the oldest entry to determine reset time
    const oldestEntries = await client.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldestEntries.length > 1 
      ? parseInt(oldestEntries[1]) + window * 1000 
      : now + window * 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }

  // Queue management
  static async pushToQueue(queue: string, data: any): Promise<void> {
    const client = this.getInstance();
    await client.rpush(`queue:${queue}`, JSON.stringify(data));
  }

  static async popFromQueue(queue: string, timeout: number = 0): Promise<any | null> {
    const client = this.getInstance();
    const result = timeout > 0
      ? await client.blpop(`queue:${queue}`, timeout)
      : await client.lpop(`queue:${queue}`);
    
    if (result) {
      const data = Array.isArray(result) ? result[1] : result;
      return JSON.parse(data);
    }
    return null;
  }

  static async getQueueLength(queue: string): Promise<number> {
    const client = this.getInstance();
    return client.llen(`queue:${queue}`);
  }

  // Pub/Sub for real-time features
  static getPubClient(): Redis {
    if (!this.pubClient) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.pubClient = new Redis(redisUrl);
    }
    return this.pubClient;
  }

  static getSubClient(): Redis {
    if (!this.subClient) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.subClient = new Redis(redisUrl);
    }
    return this.subClient;
  }

  static async publish(channel: string, message: any): Promise<void> {
    const pubClient = this.getPubClient();
    await pubClient.publish(channel, JSON.stringify(message));
  }

  static async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    const subClient = this.getSubClient();
    
    await subClient.subscribe(channel);
    
    subClient.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    });
  }

  static async unsubscribe(channel: string): Promise<void> {
    const subClient = this.getSubClient();
    await subClient.unsubscribe(channel);
  }

  // Distributed locks
  static async acquireLock(
    resource: string,
    ttl: number = 10000
  ): Promise<string | null> {
    const client = this.getInstance();
    const lockId = `${Date.now()}-${Math.random()}`;
    const key = `lock:${resource}`;

    const result = await client.set(
      key,
      lockId,
      'PX',
      ttl,
      'NX'
    );

    return result === 'OK' ? lockId : null;
  }

  static async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const client = this.getInstance();
    const key = `lock:${resource}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await client.eval(script, 1, key, lockId);
    return result === 1;
  }

  static async extendLock(
    resource: string,
    lockId: string,
    ttl: number = 10000
  ): Promise<boolean> {
    const client = this.getInstance();
    const key = `lock:${resource}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await client.eval(script, 1, key, lockId, ttl);
    return result === 1;
  }

  // Analytics and counters
  static async incrementCounter(key: string, amount: number = 1): Promise<number> {
    const client = this.getInstance();
    return client.incrby(`counter:${key}`, amount);
  }

  static async getCounter(key: string): Promise<number> {
    const client = this.getInstance();
    const value = await client.get(`counter:${key}`);
    return value ? parseInt(value, 10) : 0;
  }

  static async recordMetric(
    metric: string,
    value: number,
    timestamp: number = Date.now()
  ): Promise<void> {
    const client = this.getInstance();
    await client.zadd(`metrics:${metric}`, timestamp, `${value}:${timestamp}`);
    
    // Keep only last 24 hours of metrics
    const cutoff = timestamp - 24 * 60 * 60 * 1000;
    await client.zremrangebyscore(`metrics:${metric}`, '-inf', cutoff);
  }

  static async getMetrics(
    metric: string,
    start: number,
    end: number = Date.now()
  ): Promise<Array<{ value: number; timestamp: number }>> {
    const client = this.getInstance();
    const results = await client.zrangebyscore(
      `metrics:${metric}`,
      start,
      end,
      'WITHSCORES'
    );

    const metrics: Array<{ value: number; timestamp: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      const [value] = results[i].split(':');
      metrics.push({
        value: parseFloat(value),
        timestamp: parseFloat(results[i + 1])
      });
    }

    return metrics;
  }
}

// Export singleton instance
export const redis = RedisClient.getInstance();