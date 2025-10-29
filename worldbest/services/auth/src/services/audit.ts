import { Request } from 'express';
import { prisma } from '@worldbest/database';
import { redisService } from './redis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  
  // Account events
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_DELETED = 'account_deleted',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  EMAIL_VERIFIED = 'email_verified',
  
  // MFA events
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_CODE_GENERATED = 'mfa_code_generated',
  MFA_CODE_VERIFIED = 'mfa_code_verified',
  MFA_CODE_FAILED = 'mfa_code_failed',
  BACKUP_CODE_USED = 'backup_code_used',
  
  // OAuth events
  OAUTH_ACCOUNT_LINKED = 'oauth_account_linked',
  OAUTH_ACCOUNT_UNLINKED = 'oauth_account_unlinked',
  OAUTH_LOGIN = 'oauth_login',
  
  // Permission events
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  PERMISSION_DENIED = 'permission_denied',
  
  // Session events
  SESSION_CREATED = 'session_created',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_REVOKED = 'session_revoked',
  DEVICE_TRUSTED = 'device_trusted',
  DEVICE_UNTRUSTED = 'device_untrusted',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_REUSE_DETECTED = 'token_reuse_detected',
  IP_BLOCKED = 'ip_blocked',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  
  // Data events
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  
  // Admin events
  ADMIN_ACTION = 'admin_action',
  SYSTEM_CONFIG_CHANGE = 'system_config_change',
  BULK_OPERATION = 'bulk_operation',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  risk_score?: number;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  deviceFingerprint?: string;
}

export interface SuspiciousActivity {
  type: string;
  score: number;
  description: string;
  indicators: string[];
  recommendation: string;
}

export class AuditService {
  private readonly auditPrefix = 'audit:';
  private readonly suspiciousActivityPrefix = 'suspicious:';
  private readonly auditRetentionDays = 365; // 1 year
  
  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    details: Record<string, any>,
    req?: Request,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const eventId = crypto.randomUUID();
      const timestamp = new Date();
      
      const auditEvent: AuditEvent = {
        id: eventId,
        eventType,
        severity,
        userId,
        sessionId,
        ip: req?.ip || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown',
        timestamp,
        details,
        deviceFingerprint: req ? this.generateDeviceFingerprint(req) : undefined,
      };

      // Add risk scoring
      auditEvent.risk_score = this.calculateRiskScore(auditEvent);

      // Store in database for long-term retention
      await prisma.auditLog.create({
        data: {
          id: eventId,
          eventType,
          severity,
          userId,
          sessionId,
          ip: auditEvent.ip,
          userAgent: auditEvent.userAgent,
          timestamp,
          details: JSON.stringify(details),
          riskScore: auditEvent.risk_score,
          deviceFingerprint: auditEvent.deviceFingerprint,
        },
      });

      // Store in Redis for real-time analysis
      await redisService.set(
        `${this.auditPrefix}${eventId}`,
        JSON.stringify(auditEvent),
        24 * 60 * 60 // 24 hours
      );

      // Check for suspicious activity patterns
      if (userId) {
        await this.analyzeSuspiciousActivity(userId, auditEvent);
      }

      // Log to application logger based on severity
      const logData = {
        eventId,
        eventType,
        severity,
        userId,
        ip: auditEvent.ip,
        riskScore: auditEvent.risk_score,
      };

      switch (severity) {
        case AuditSeverity.CRITICAL:
          logger.error('Critical audit event', logData);
          break;
        case AuditSeverity.HIGH:
          logger.warn('High severity audit event', logData);
          break;
        case AuditSeverity.MEDIUM:
          logger.info('Medium severity audit event', logData);
          break;
        case AuditSeverity.LOW:
        default:
          logger.debug('Audit event logged', logData);
          break;
      }
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid disrupting main flow
    }
  }

  /**
   * Get audit events for a user
   */
  async getUserAuditEvents(
    userId: string,
    eventTypes?: AuditEventType[],
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const whereClause: any = { userId };
      
      if (eventTypes && eventTypes.length > 0) {
        whereClause.eventType = { in: eventTypes };
      }

      const auditLogs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return auditLogs.map(log => ({
        id: log.id,
        eventType: log.eventType as AuditEventType,
        severity: log.severity as AuditSeverity,
        userId: log.userId || undefined,
        sessionId: log.sessionId || undefined,
        ip: log.ip,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        details: JSON.parse(log.details),
        risk_score: log.riskScore || undefined,
        deviceFingerprint: log.deviceFingerprint || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get user audit events:', error);
      return [];
    }
  }

  /**
   * Analyze suspicious activity patterns
   */
  private async analyzeSuspiciousActivity(userId: string, event: AuditEvent): Promise<void> {
    try {
      const suspiciousActivities: SuspiciousActivity[] = [];

      // Check for multiple failed login attempts
      if (event.eventType === AuditEventType.LOGIN_FAILED) {
        const failedAttempts = await this.getRecentEventCount(
          userId,
          AuditEventType.LOGIN_FAILED,
          15 * 60 * 1000 // 15 minutes
        );

        if (failedAttempts >= 5) {
          suspiciousActivities.push({
            type: 'brute_force_attempt',
            score: Math.min(failedAttempts * 20, 100),
            description: `${failedAttempts} failed login attempts in 15 minutes`,
            indicators: ['repeated_failed_logins', 'short_time_window'],
            recommendation: 'Consider implementing account lockout or CAPTCHA',
          });
        }
      }

      // Check for login from new location/device
      if (event.eventType === AuditEventType.LOGIN_SUCCESS && event.deviceFingerprint) {
        const isNewDevice = await this.isNewDevice(userId, event.deviceFingerprint);
        if (isNewDevice) {
          suspiciousActivities.push({
            type: 'new_device_login',
            score: 60,
            description: 'Login from previously unseen device',
            indicators: ['new_device', 'different_fingerprint'],
            recommendation: 'Send security notification to user',
          });
        }
      }

      // Check for unusual time-based patterns
      const isUnusualTime = await this.isUnusualLoginTime(userId, event.timestamp);
      if (isUnusualTime && event.eventType === AuditEventType.LOGIN_SUCCESS) {
        suspiciousActivities.push({
          type: 'unusual_time_login',
          score: 40,
          description: 'Login at unusual time compared to historical pattern',
          indicators: ['unusual_time_pattern'],
          recommendation: 'Monitor for additional suspicious activity',
        });
      }

      // Check for rapid permission changes
      if ([
        AuditEventType.ROLE_ASSIGNED,
        AuditEventType.PERMISSION_GRANTED,
        AuditEventType.PERMISSION_REVOKED
      ].includes(event.eventType)) {
        const permissionChanges = await this.getRecentEventCount(
          userId,
          [AuditEventType.ROLE_ASSIGNED, AuditEventType.PERMISSION_GRANTED, AuditEventType.PERMISSION_REVOKED],
          60 * 60 * 1000 // 1 hour
        );

        if (permissionChanges >= 3) {
          suspiciousActivities.push({
            type: 'rapid_permission_changes',
            score: 80,
            description: `${permissionChanges} permission changes in 1 hour`,
            indicators: ['rapid_changes', 'privilege_escalation_risk'],
            recommendation: 'Review permission changes and validate legitimacy',
          });
        }
      }

      // Store and alert on suspicious activities
      for (const activity of suspiciousActivities) {
        await this.storeSuspiciousActivity(userId, activity, event);
        
        // Trigger alerts for high-risk activities
        if (activity.score >= 80) {
          await this.triggerSecurityAlert(userId, activity, event);
        }
      }
    } catch (error) {
      logger.error('Failed to analyze suspicious activity:', error);
    }
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: AuditEvent): number {
    let score = 0;

    // Base scores by event type
    const eventRiskScores: Record<AuditEventType, number> = {
      [AuditEventType.LOGIN_FAILED]: 20,
      [AuditEventType.PASSWORD_CHANGE]: 30,
      [AuditEventType.MFA_DISABLED]: 70,
      [AuditEventType.PERMISSION_GRANTED]: 40,
      [AuditEventType.ROLE_ASSIGNED]: 50,
      [AuditEventType.ACCOUNT_DELETED]: 90,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: 80,
      [AuditEventType.BRUTE_FORCE_DETECTED]: 90,
      [AuditEventType.TOKEN_REUSE_DETECTED]: 85,
      // Add more as needed
    } as any;

    score += eventRiskScores[event.eventType] || 10;

    // Adjust based on severity
    switch (event.severity) {
      case AuditSeverity.CRITICAL:
        score += 40;
        break;
      case AuditSeverity.HIGH:
        score += 25;
        break;
      case AuditSeverity.MEDIUM:
        score += 10;
        break;
      case AuditSeverity.LOW:
        score += 0;
        break;
    }

    // Adjust for time (higher risk for unusual hours)
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Get recent event count for analysis
   */
  private async getRecentEventCount(
    userId: string,
    eventTypes: AuditEventType | AuditEventType[],
    timeWindowMs: number
  ): Promise<number> {
    try {
      const since = new Date(Date.now() - timeWindowMs);
      const eventTypeArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

      const count = await prisma.auditLog.count({
        where: {
          userId,
          eventType: { in: eventTypeArray },
          timestamp: { gte: since },
        },
      });

      return count;
    } catch (error) {
      logger.error('Failed to get recent event count:', error);
      return 0;
    }
  }

  /**
   * Check if device is new for user
   */
  private async isNewDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      const existingEvent = await prisma.auditLog.findFirst({
        where: {
          userId,
          deviceFingerprint,
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
      });

      return !existingEvent;
    } catch (error) {
      logger.error('Failed to check if device is new:', error);
      return false;
    }
  }

  /**
   * Check if login time is unusual for user
   */
  private async isUnusualLoginTime(userId: string, timestamp: Date): Promise<boolean> {
    try {
      // Get user's login history to determine normal patterns
      const recentLogins = await prisma.auditLog.findMany({
        where: {
          userId,
          eventType: AuditEventType.LOGIN_SUCCESS,
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
        select: { timestamp: true },
      });

      if (recentLogins.length < 5) {
        return false; // Not enough data to determine pattern
      }

      const currentHour = timestamp.getHours();
      const historicalHours = recentLogins.map(login => login.timestamp.getHours());
      
      // Simple heuristic: if current hour is outside the typical range
      const minHour = Math.min(...historicalHours);
      const maxHour = Math.max(...historicalHours);
      
      return currentHour < minHour - 2 || currentHour > maxHour + 2;
    } catch (error) {
      logger.error('Failed to check unusual login time:', error);
      return false;
    }
  }

  /**
   * Store suspicious activity
   */
  private async storeSuspiciousActivity(
    userId: string,
    activity: SuspiciousActivity,
    triggerEvent: AuditEvent
  ): Promise<void> {
    try {
      const activityId = crypto.randomUUID();
      
      await redisService.set(
        `${this.suspiciousActivityPrefix}${activityId}`,
        JSON.stringify({
          id: activityId,
          userId,
          activity,
          triggerEvent: triggerEvent.id,
          timestamp: new Date(),
        }),
        7 * 24 * 60 * 60 // 7 days
      );

      logger.warn('Suspicious activity detected', {
        userId,
        activityType: activity.type,
        score: activity.score,
        description: activity.description,
      });
    } catch (error) {
      logger.error('Failed to store suspicious activity:', error);
    }
  }

  /**
   * Trigger security alert for high-risk activities
   */
  private async triggerSecurityAlert(
    userId: string,
    activity: SuspiciousActivity,
    triggerEvent: AuditEvent
  ): Promise<void> {
    try {
      // Log critical security event
      await this.logEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditSeverity.CRITICAL,
        {
          suspiciousActivityType: activity.type,
          score: activity.score,
          description: activity.description,
          indicators: activity.indicators,
          recommendation: activity.recommendation,
          triggerEventId: triggerEvent.id,
        },
        undefined,
        userId
      );

      // In a real implementation, you would:
      // - Send notifications to security team
      // - Alert the user via email/SMS
      // - Potentially trigger automatic protective measures
      
      logger.error('Security alert triggered', {
        userId,
        activity: activity.type,
        score: activity.score,
        recommendation: activity.recommendation,
      });
    } catch (error) {
      logger.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.auditRetentionDays * 24 * 60 * 60 * 1000);
      
      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      logger.info('Old audit logs cleaned up', {
        deletedCount: result.count,
        cutoffDate,
      });
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
    }
  }
}

export const auditService = new AuditService();