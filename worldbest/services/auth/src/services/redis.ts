import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redis.url,
        password: config.redis.password,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries');
              return false;
            }
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.client.on('error', (error) => {
        logger.error('Redis error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to set session:', error);
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      logger.error('Failed to delete session:', error);
    }
  }

  // Rate limiting
  async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(windowMs / 1000));
      const results = await multi.exec();
      return results?.[0] as number || 0;
    } catch (error) {
      logger.error('Failed to increment rate limit:', error);
      return 0;
    }
  }

  async getRateLimit(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      const count = await this.client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Failed to get rate limit:', error);
      return 0;
    }
  }

  // Account lockout
  async setAccountLockout(userId: string, attempts: number, lockoutTime?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const key = `lockout:${userId}`;
      const data = { attempts, lockedUntil: lockoutTime };
      if (lockoutTime) {
        const ttl = Math.ceil((lockoutTime - Date.now()) / 1000);
        await this.client.setEx(key, ttl, JSON.stringify(data));
      } else {
        await this.client.set(key, JSON.stringify(data));
      }
    } catch (error) {
      logger.error('Failed to set account lockout:', error);
    }
  }

  async getAccountLockout(userId: string): Promise<{ attempts: number; lockedUntil?: number } | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(`lockout:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get account lockout:', error);
      return null;
    }
  }

  async clearAccountLockout(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`lockout:${userId}`);
    } catch (error) {
      logger.error('Failed to clear account lockout:', error);
    }
  }

  // Token blacklist
  async blacklistToken(tokenId: string, expiresAt: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await this.client.setEx(`blacklist:${tokenId}`, ttl, '1');
      }
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const exists = await this.client.exists(`blacklist:${tokenId}`);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  // Password reset tokens
  async setPasswordResetToken(token: string, userId: string, ttl: number = 3600): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.setEx(`reset:${token}`, ttl, userId);
    } catch (error) {
      logger.error('Failed to set password reset token:', error);
    }
  }

  async getPasswordResetToken(token: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(`reset:${token}`);
    } catch (error) {
      logger.error('Failed to get password reset token:', error);
      return null;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`reset:${token}`);
    } catch (error) {
      logger.error('Failed to delete password reset token:', error);
    }
  }

  // Email verification tokens
  async setEmailVerificationToken(token: string, userId: string, ttl: number = 86400): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.setEx(`verify:${token}`, ttl, userId);
    } catch (error) {
      logger.error('Failed to set email verification token:', error);
    }
  }

  async getEmailVerificationToken(token: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(`verify:${token}`);
    } catch (error) {
      logger.error('Failed to get email verification token:', error);
      return null;
    }
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`verify:${token}`);
    } catch (error) {
      logger.error('Failed to delete email verification token:', error);
    }
  }

  // Cache management
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Failed to set cache:', error);
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cache:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to delete cache:', error);
    }
  }

  // Health check
  isHealthy(): boolean {
    return this.isConnected;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }
}

// Create singleton instance
export const redisService = new RedisService();

// Initialize connection
redisService.connect().catch((error) => {
  logger.error('Failed to initialize Redis connection:', error);
});

// Export client for express-rate-limit-redis
export const redisClient = redisService.getClient();