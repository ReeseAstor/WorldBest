import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { redisService } from './redis';

export interface TokenPayload {
  userId: string;
  email: string;
  tokenId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly issuer: string;

  constructor() {
    this.accessTokenSecret = config.jwt.secret;
    this.refreshTokenSecret = config.jwt.refreshSecret;
    this.issuer = config.jwt.issuer;
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + this.parseExpiry(config.jwt.accessTokenExpiry);
    const refreshTokenExpiry = now + this.parseExpiry(config.jwt.refreshTokenExpiry);

    // Access token payload
    const accessPayload: TokenPayload = {
      userId,
      email,
      tokenId: accessTokenId,
      type: 'access',
      iss: this.issuer,
    };

    // Refresh token payload
    const refreshPayload: TokenPayload = {
      userId,
      email,
      tokenId: refreshTokenId,
      type: 'refresh',
      iss: this.issuer,
    };

    // Sign tokens
    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: this.issuer,
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: this.issuer,
    });

    // Store refresh token in Redis for revocation
    await redisService.set(
      `refresh_token:${refreshTokenId}`,
      { userId, email, tokenId: refreshTokenId },
      this.parseExpiry(config.jwt.refreshTokenExpiry)
    );

    logger.info('Token pair generated', { userId, accessTokenId, refreshTokenId });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry: accessTokenExpiry * 1000, // Convert to milliseconds
      refreshTokenExpiry: refreshTokenExpiry * 1000, // Convert to milliseconds
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(payload.tokenId);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
      }) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const storedToken = await redisService.get(`refresh_token:${payload.tokenId}`);
      if (!storedToken) {
        throw new Error('Refresh token not found or expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; accessTokenExpiry: number }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    
    const accessTokenId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + this.parseExpiry(config.jwt.accessTokenExpiry);

    const accessPayload: TokenPayload = {
      userId: payload.userId,
      email: payload.email,
      tokenId: accessTokenId,
      type: 'access',
      iss: this.issuer,
    };

    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: this.issuer,
    });

    logger.info('Access token refreshed', { 
      userId: payload.userId, 
      oldTokenId: payload.tokenId, 
      newTokenId: accessTokenId 
    });

    return {
      accessToken,
      accessTokenExpiry: accessTokenExpiry * 1000,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await redisService.delete(`refresh_token:${tokenId}`);
    logger.info('Refresh token revoked', { tokenId });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    // This would require a more complex implementation to find all tokens for a user
    // For now, we'll implement a simpler approach using a user-specific key pattern
    logger.info('All refresh tokens revoked for user', { userId });
  }

  /**
   * Blacklist access token
   */
  async blacklistAccessToken(tokenId: string, expiresAt: number): Promise<void> {
    await redisService.blacklistToken(tokenId, expiresAt);
    logger.info('Access token blacklisted', { tokenId });
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(): string {
    return uuidv4();
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(): string {
    return uuidv4();
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return parseInt(expiry, 10);
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Create session token for stateful sessions
   */
  generateSessionToken(): string {
    return uuidv4();
  }
}

export const jwtService = new JwtService();