import { PrismaClient } from '@worldbest/database';
import { logger } from '../utils/logger';

export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async validateUserCredentials(email: string, password: string) {
    // Implementation handled in controller
    // This service can be extended with additional auth logic
    return true;
  }

  async createSession(userId: string, deviceInfo?: any) {
    try {
      const session = await this.prisma.session.create({
        data: {
          userId,
          deviceInfo: deviceInfo || {},
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async invalidateSession(sessionId: string) {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { 
          isValid: false,
          invalidatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error invalidating session:', error);
      throw error;
    }
  }

  async invalidateAllUserSessions(userId: string) {
    try {
      await this.prisma.session.updateMany({
        where: { 
          userId,
          isValid: true,
        },
        data: { 
          isValid: false,
          invalidatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error invalidating user sessions:', error);
      throw error;
    }
  }

  async getActiveSessions(userId: string) {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          userId,
          isValid: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return sessions;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  async logAuthEvent(userId: string, eventType: string, metadata?: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: eventType,
          metadata: metadata || {},
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
      });
    } catch (error) {
      logger.error('Error logging auth event:', error);
      // Don't throw - audit logging shouldn't break auth flow
    }
  }
}