import jwt from 'jsonwebtoken';
import { User } from '@worldbest/database';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { AuthErrorCode } from '@worldbest/shared-types';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'temp';
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'default-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload: Omit<TokenPayload, 'type'> = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(
        { ...payload, type: 'access' },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry }
      );

      const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiry }
      );

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new AppError('Failed to generate tokens', 500, AuthErrorCode.TOKEN_GENERATION_FAILED);
    }
  }

  async generateTempToken(userId: string): Promise<string> {
    try {
      const tempToken = jwt.sign(
        { userId, type: 'temp' },
        this.accessTokenSecret,
        { expiresIn: '5m' }
      );
      
      // Store temp token in Redis with 5 minute expiry
      await redisClient.setex(`temp_token:${userId}`, 300, tempToken);
      
      return tempToken;
    } catch (error) {
      logger.error('Error generating temp token:', error);
      throw new AppError('Failed to generate temp token', 500, AuthErrorCode.TOKEN_GENERATION_FAILED);
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AppError('Token has been revoked', 401, AuthErrorCode.TOKEN_REVOKED);
      }

      const payload = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      
      if (payload.type !== 'access') {
        throw new AppError('Invalid token type', 401, AuthErrorCode.INVALID_TOKEN);
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401, AuthErrorCode.TOKEN_EXPIRED);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, AuthErrorCode.INVALID_TOKEN);
      }
      throw error;
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as TokenPayload;
      
      if (payload.type !== 'refresh') {
        throw new AppError('Invalid token type', 401, AuthErrorCode.INVALID_TOKEN);
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401, AuthErrorCode.TOKEN_EXPIRED);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401, AuthErrorCode.INVALID_TOKEN);
      }
      throw error;
    }
  }

  async verifyTempToken(token: string): Promise<{ userId: string }> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as any;
      
      if (payload.type !== 'temp') {
        throw new AppError('Invalid token type', 401, AuthErrorCode.INVALID_TOKEN);
      }

      // Check if temp token exists in Redis
      const storedToken = await redisClient.get(`temp_token:${payload.userId}`);
      if (storedToken !== token) {
        throw new AppError('Invalid temp token', 401, AuthErrorCode.INVALID_TOKEN);
      }

      // Delete temp token after verification
      await redisClient.del(`temp_token:${payload.userId}`);

      return { userId: payload.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Temp token expired', 401, AuthErrorCode.TOKEN_EXPIRED);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid temp token', 401, AuthErrorCode.INVALID_TOKEN);
      }
      throw error;
    }
  }

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const key = `refresh_tokens:${userId}`;
      // Store refresh token with expiry (7 days)
      await redisClient.sadd(key, token);
      await redisClient.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    }
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      const key = `refresh_tokens:${userId}`;
      const exists = await redisClient.sismember(key, token);
      return exists === 1;
    } catch (error) {
      logger.error('Error validating refresh token:', error);
      return false;
    }
  }

  async revokeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const key = `refresh_tokens:${userId}`;
      await redisClient.srem(key, token);
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    try {
      const key = `refresh_tokens:${userId}`;
      await redisClient.del(key);
    } catch (error) {
      logger.error('Error revoking all refresh tokens:', error);
      throw error;
    }
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      // Decode token to get expiry
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return;
      }

      // Calculate TTL
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) {
        return; // Token already expired
      }

      // Store in blacklist with TTL
      await redisClient.setex(`blacklist:${token}`, ttl, '1');
    } catch (error) {
      logger.error('Error blacklisting token:', error);
      throw error;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(`blacklist:${token}`);
      return exists === 1;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false;
    }
  }
}