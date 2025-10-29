import crypto from 'crypto';
import { Request } from 'express';
import { redisService } from './redis';
import { jwtService } from './jwt';
import { logger, logSecurity } from '../utils/logger';
import { config } from '../config';
import { prisma } from '@worldbest/database';

export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  ip: string;
  platform?: string;
  browser?: string;
  version?: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceFingerprint: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  deviceInfo: DeviceInfo;
}

export interface RefreshTokenData {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  tokenFamily: string;
  issuedAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

export class SessionService {
  private readonly sessionPrefix = 'session:';
  private readonly refreshTokenPrefix = 'refresh_token:';
  private readonly devicePrefix = 'device:';
  private readonly sessionTTL = 7 * 24 * 60 * 60; // 7 days
  private readonly refreshTokenTTL = 30 * 24 * 60 * 60; // 30 days

  /**
   * Generate device fingerprint from request
   */
  generateDeviceFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
      // Add more fingerprinting components as needed
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req: Request, fingerprint: string): Omit<DeviceInfo, 'trusted' | 'firstSeen' | 'lastSeen'> {
    const userAgent = req.headers['user-agent'] || '';
    
    // Simple user agent parsing (in production, consider using a library like ua-parser-js)
    const platformMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i);
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    const versionMatch = userAgent.match(/Chrome\/([0-9.]+)|Firefox\/([0-9.]+)|Safari\/([0-9.]+)/i);

    return {
      fingerprint,
      userAgent,
      ip: req.ip || '',
      platform: platformMatch ? platformMatch[1] : undefined,
      browser: browserMatch ? browserMatch[1] : undefined,
      version: versionMatch ? versionMatch[1] || versionMatch[2] || versionMatch[3] : undefined,
    };
  }

  /**
   * Create new session with device fingerprinting
   */
  async createSession(userId: string, req: Request): Promise<{
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceTrusted: boolean;
  }> {
    try {
      const sessionId = crypto.randomUUID();
      const deviceFingerprint = this.generateDeviceFingerprint(req);
      const tokenFamily = crypto.randomUUID();

      // Generate tokens
      const accessToken = await jwtService.generateAccessToken(userId, sessionId);
      const refreshToken = await jwtService.generateRefreshToken(userId, sessionId, tokenFamily);

      // Check if device is known and trusted
      const existingDevice = await this.getDeviceInfo(userId, deviceFingerprint);
      let deviceTrusted = false;

      if (existingDevice) {
        deviceTrusted = existingDevice.trusted;
        // Update last seen
        existingDevice.lastSeen = new Date();
        await this.updateDeviceInfo(userId, existingDevice);
      } else {
        // New device - create device record
        const deviceInfo: DeviceInfo = {
          ...this.extractDeviceInfo(req, deviceFingerprint),
          trusted: false, // New devices are not trusted by default
          firstSeen: new Date(),
          lastSeen: new Date(),
        };

        await this.saveDeviceInfo(userId, deviceInfo);
        
        // Log new device login for security monitoring
        logSecurity('New device login detected', {
          userId,
          deviceFingerprint,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      // Create session
      const expiresAt = new Date(Date.now() + this.sessionTTL * 1000);
      const sessionInfo: SessionInfo = {
        id: sessionId,
        userId,
        deviceFingerprint,
        accessToken,
        refreshToken,
        expiresAt,
        lastActivity: new Date(),
        isActive: true,
        deviceInfo: existingDevice || await this.getDeviceInfo(userId, deviceFingerprint)!,
      };

      // Store session in Redis
      await redisService.set(
        `${this.sessionPrefix}${sessionId}`,
        JSON.stringify(sessionInfo),
        this.sessionTTL
      );

      // Store refresh token data
      const refreshTokenData: RefreshTokenData = {
        sessionId,
        userId,
        deviceFingerprint,
        tokenFamily,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTokenTTL * 1000),
        revoked: false,
      };

      await redisService.set(
        `${this.refreshTokenPrefix}${refreshToken}`,
        JSON.stringify(refreshTokenData),
        this.refreshTokenTTL
      );

      logger.info('Session created', {
        userId,
        sessionId,
        deviceFingerprint,
        deviceTrusted,
        ip: req.ip,
      });

      return {
        sessionId,
        accessToken,
        refreshToken,
        expiresAt,
        deviceTrusted,
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Refresh access token with token rotation
   */
  async refreshSession(refreshToken: string, req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    try {
      // Get refresh token data
      const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;
      const refreshTokenDataStr = await redisService.get(refreshTokenKey);

      if (!refreshTokenDataStr) {
        throw new Error('Invalid refresh token');
      }

      const refreshTokenData: RefreshTokenData = JSON.parse(refreshTokenDataStr);

      if (refreshTokenData.revoked) {
        logSecurity('Attempted use of revoked refresh token', {
          userId: refreshTokenData.userId,
          sessionId: refreshTokenData.sessionId,
          ip: req.ip,
        });
        throw new Error('Refresh token has been revoked');
      }

      if (new Date() > refreshTokenData.expiresAt) {
        throw new Error('Refresh token expired');
      }

      // Verify device fingerprint hasn't changed significantly
      const currentFingerprint = this.generateDeviceFingerprint(req);
      if (currentFingerprint !== refreshTokenData.deviceFingerprint) {
        logSecurity('Device fingerprint mismatch during token refresh', {
          userId: refreshTokenData.userId,
          expectedFingerprint: refreshTokenData.deviceFingerprint,
          actualFingerprint: currentFingerprint,
          ip: req.ip,
        });
        // You might want to revoke the token family here for security
        await this.revokeTokenFamily(refreshTokenData.tokenFamily);
        throw new Error('Device fingerprint mismatch');
      }

      // Generate new tokens (token rotation)
      const newAccessToken = await jwtService.generateAccessToken(
        refreshTokenData.userId,
        refreshTokenData.sessionId
      );
      const newRefreshToken = await jwtService.generateRefreshToken(
        refreshTokenData.userId,
        refreshTokenData.sessionId,
        refreshTokenData.tokenFamily
      );

      // Revoke old refresh token
      await redisService.del(refreshTokenKey);

      // Store new refresh token
      const newRefreshTokenData: RefreshTokenData = {
        ...refreshTokenData,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTokenTTL * 1000),
        revoked: false,
      };

      await redisService.set(
        `${this.refreshTokenPrefix}${newRefreshToken}`,
        JSON.stringify(newRefreshTokenData),
        this.refreshTokenTTL
      );

      // Update session activity
      await this.updateSessionActivity(refreshTokenData.sessionId);

      logger.info('Token refreshed', {
        userId: refreshTokenData.userId,
        sessionId: refreshTokenData.sessionId,
        ip: req.ip,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + jwtService.getAccessTokenTTL() * 1000),
      };
    } catch (error) {
      logger.error('Error refreshing session:', error);
      throw error;
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    try {
      const sessionKey = `${this.sessionPrefix}${sessionId}`;
      const sessionDataStr = await redisService.get(sessionKey);

      if (sessionDataStr) {
        const sessionData: SessionInfo = JSON.parse(sessionDataStr);
        
        // Revoke refresh token
        await this.revokeRefreshToken(sessionData.refreshToken, reason);
        
        // Remove session
        await redisService.del(sessionKey);

        logger.info('Session revoked', {
          sessionId,
          userId: sessionData.userId,
          reason,
        });
      }
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      for (const session of sessions) {
        if (session.id !== excludeSessionId) {
          await this.revokeSession(session.id, 'All sessions revoked');
        }
      }

      logger.info('All user sessions revoked', {
        userId,
        excludedSession: excludeSessionId,
        revokedCount: sessions.length - (excludeSessionId ? 1 : 0),
      });
    } catch (error) {
      logger.error('Error revoking all user sessions:', error);
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      // This is a simplified implementation
      // In a production system, you might want to maintain an index of user sessions
      return [];
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Trust device
   */
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo(userId, deviceFingerprint);
      if (deviceInfo) {
        deviceInfo.trusted = true;
        await this.updateDeviceInfo(userId, deviceInfo);
        
        logger.info('Device trusted', {
          userId,
          deviceFingerprint,
        });
      }
    } catch (error) {
      logger.error('Error trusting device:', error);
      throw error;
    }
  }

  /**
   * Untrust device
   */
  async untrustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo(userId, deviceFingerprint);
      if (deviceInfo) {
        deviceInfo.trusted = false;
        await this.updateDeviceInfo(userId, deviceInfo);
        
        logger.info('Device untrusted', {
          userId,
          deviceFingerprint,
        });
      }
    } catch (error) {
      logger.error('Error untrusting device:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getDeviceInfo(userId: string, fingerprint: string): Promise<DeviceInfo | null> {
    try {
      const deviceKey = `${this.devicePrefix}${userId}:${fingerprint}`;
      const deviceDataStr = await redisService.get(deviceKey);
      return deviceDataStr ? JSON.parse(deviceDataStr) : null;
    } catch (error) {
      logger.error('Error getting device info:', error);
      return null;
    }
  }

  private async saveDeviceInfo(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    try {
      const deviceKey = `${this.devicePrefix}${userId}:${deviceInfo.fingerprint}`;
      await redisService.set(deviceKey, JSON.stringify(deviceInfo), this.refreshTokenTTL);
    } catch (error) {
      logger.error('Error saving device info:', error);
    }
  }

  private async updateDeviceInfo(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    await this.saveDeviceInfo(userId, deviceInfo);
  }

  private async revokeRefreshToken(refreshToken: string, reason?: string): Promise<void> {
    try {
      const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;
      const refreshTokenDataStr = await redisService.get(refreshTokenKey);

      if (refreshTokenDataStr) {
        const refreshTokenData: RefreshTokenData = JSON.parse(refreshTokenDataStr);
        refreshTokenData.revoked = true;
        refreshTokenData.revokedAt = new Date();
        refreshTokenData.revokedReason = reason;

        await redisService.set(
          refreshTokenKey,
          JSON.stringify(refreshTokenData),
          this.refreshTokenTTL
        );
      }
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
    }
  }

  private async revokeTokenFamily(tokenFamily: string): Promise<void> {
    // Implementation would need to track token families and revoke all tokens in the family
    logger.info('Token family revoked', { tokenFamily });
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const sessionKey = `${this.sessionPrefix}${sessionId}`;
      const sessionDataStr = await redisService.get(sessionKey);

      if (sessionDataStr) {
        const sessionData: SessionInfo = JSON.parse(sessionDataStr);
        sessionData.lastActivity = new Date();

        await redisService.set(sessionKey, JSON.stringify(sessionData), this.sessionTTL);
      }
    } catch (error) {
      logger.error('Error updating session activity:', error);
    }
  }
}

export const sessionService = new SessionService();