import { PrismaClient } from '@worldbest/database';
import { CronJob } from 'cron';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AnalyticsService {
  private prisma: PrismaClient;
  private cronJobs: CronJob[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  startBackgroundJobs() {
    // Daily analytics aggregation
    const dailyAggregation = new CronJob('0 1 * * *', async () => {
      await this.aggregateDailyAnalytics();
    });
    dailyAggregation.start();
    this.cronJobs.push(dailyAggregation);

    // Hourly real-time analytics
    if (config.analytics.enableRealTime) {
      const hourlyAggregation = new CronJob('0 * * * *', async () => {
        await this.aggregateHourlyAnalytics();
      });
      hourlyAggregation.start();
      this.cronJobs.push(hourlyAggregation);
    }

    // Weekly reports generation
    const weeklyReports = new CronJob('0 2 * * 1', async () => {
      await this.generateWeeklyReports();
    });
    weeklyReports.start();
    this.cronJobs.push(weeklyReports);

    // Data cleanup
    const dataCleanup = new CronJob('0 3 * * 0', async () => {
      await this.cleanupOldData();
    });
    dataCleanup.start();
    this.cronJobs.push(dataCleanup);

    logger.info('Analytics background jobs started');
  }

  stopBackgroundJobs() {
    this.cronJobs.forEach(job => job.stop());
    logger.info('Analytics background jobs stopped');
  }

  async trackEvent(
    userId: string,
    eventType: string,
    data: any,
    metadata?: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: eventType,
          resourceType: 'analytics_event',
          resourceId: `event_${Date.now()}`,
          changes: data,
          metadata,
        },
      });

      logger.info('Event tracked', {
        userId,
        eventType,
        dataKeys: Object.keys(data),
      });
    } catch (error) {
      logger.error('Error tracking event:', error);
    }
  }

  async trackAIUsage(
    userId: string,
    projectId: string,
    persona: string,
    intent: string,
    tokens: number,
    cost: number
  ) {
    try {
      await this.trackEvent(userId, 'ai_generation', {
        projectId,
        persona,
        intent,
        tokens,
        cost,
      });

      // Update user's AI usage statistics
      await this.updateUserAIUsage(userId, tokens, cost);
    } catch (error) {
      logger.error('Error tracking AI usage:', error);
    }
  }

  async trackWritingProgress(
    userId: string,
    projectId: string,
    wordCount: number,
    sceneId?: string,
    chapterId?: string
  ) {
    try {
      await this.trackEvent(userId, 'writing_progress', {
        projectId,
        wordCount,
        sceneId,
        chapterId,
      });

      // Update project statistics
      await this.updateProjectStats(projectId, wordCount);
    } catch (error) {
      logger.error('Error tracking writing progress:', error);
    }
  }

  async trackExport(
    userId: string,
    projectId: string,
    format: string,
    fileSize: number
  ) {
    try {
      await this.trackEvent(userId, 'export_generated', {
        projectId,
        format,
        fileSize,
      });
    } catch (error) {
      logger.error('Error tracking export:', error);
    }
  }

  async trackCollaboration(
    userId: string,
    projectId: string,
    action: string,
    collaboratorId?: string
  ) {
    try {
      await this.trackEvent(userId, 'collaboration', {
        projectId,
        action,
        collaboratorId,
      });
    } catch (error) {
      logger.error('Error tracking collaboration:', error);
    }
  }

  private async updateUserAIUsage(userId: string, tokens: number, cost: number) {
    try {
      // This would typically update a user statistics table
      // For now, we'll just log it
      logger.info('User AI usage updated', {
        userId,
        tokens,
        cost,
      });
    } catch (error) {
      logger.error('Error updating user AI usage:', error);
    }
  }

  private async updateProjectStats(projectId: string, wordCount: number) {
    try {
      // This would typically update project statistics
      // For now, we'll just log it
      logger.info('Project stats updated', {
        projectId,
        wordCount,
      });
    } catch (error) {
      logger.error('Error updating project stats:', error);
    }
  }

  private async aggregateDailyAnalytics() {
    try {
      logger.info('Starting daily analytics aggregation');
      
      // Aggregate user activity
      const userActivity = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
      });

      // Aggregate AI usage
      const aiUsage = await this.prisma.aIGeneration.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: {
          id: true,
        },
      });

      // Aggregate writing progress
      const writingProgress = await this.prisma.textVersion.groupBy({
        by: ['authorId'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          wordCount: true,
        },
        _count: {
          id: true,
        },
      });

      logger.info('Daily analytics aggregation completed', {
        userActivity: userActivity.length,
        aiUsage: aiUsage.length,
        writingProgress: writingProgress.length,
      });
    } catch (error) {
      logger.error('Error in daily analytics aggregation:', error);
    }
  }

  private async aggregateHourlyAnalytics() {
    try {
      logger.info('Starting hourly analytics aggregation');
      
      // Real-time metrics would be aggregated here
      // This could include active users, current AI usage, etc.
      
      logger.info('Hourly analytics aggregation completed');
    } catch (error) {
      logger.error('Error in hourly analytics aggregation:', error);
    }
  }

  private async generateWeeklyReports() {
    try {
      logger.info('Starting weekly reports generation');
      
      // Generate weekly reports for users
      const users = await this.prisma.user.findMany({
        where: {
          subscriptions: {
            some: {
              status: 'active',
            },
          },
        },
        include: {
          subscriptions: true,
        },
      });

      for (const user of users) {
        await this.generateUserWeeklyReport(user.id);
      }

      logger.info('Weekly reports generation completed', {
        usersProcessed: users.length,
      });
    } catch (error) {
      logger.error('Error in weekly reports generation:', error);
    }
  }

  private async generateUserWeeklyReport(userId: string) {
    try {
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get user's weekly activity
      const activity = await this.prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: weekStart,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Get AI usage
      const aiUsage = await this.prisma.aIGeneration.findMany({
        where: {
          userId,
          createdAt: {
            gte: weekStart,
          },
        },
      });

      // Get writing progress
      const writingProgress = await this.prisma.textVersion.findMany({
        where: {
          authorId: userId,
          createdAt: {
            gte: weekStart,
          },
        },
      });

      const report = {
        userId,
        weekStart,
        weekEnd: new Date(),
        activityCount: activity.length,
        aiGenerations: aiUsage.length,
        totalAITokens: aiUsage.reduce((sum, gen) => sum + gen.totalTokens, 0),
        totalAICost: aiUsage.reduce((sum, gen) => sum + gen.estimatedCost, 0),
        wordsWritten: writingProgress.reduce((sum, version) => sum + version.wordCount, 0),
        scenesCreated: writingProgress.length,
      };

      // Store or send the report
      logger.info('Weekly report generated', report);
    } catch (error) {
      logger.error('Error generating user weekly report:', error);
    }
  }

  private async cleanupOldData() {
    try {
      const cutoffDate = new Date(Date.now() - config.analytics.retentionDays * 24 * 60 * 60 * 1000);
      
      // Clean up old audit logs
      const deletedAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      // Clean up old AI generations
      const deletedAIGenerations = await this.prisma.aIGeneration.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info('Data cleanup completed', {
        deletedAuditLogs: deletedAuditLogs.count,
        deletedAIGenerations: deletedAIGenerations.count,
        cutoffDate,
      });
    } catch (error) {
      logger.error('Error in data cleanup:', error);
    }
  }
}