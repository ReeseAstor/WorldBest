import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// GET /reports/weekly - Get weekly report
router.get(
  '/weekly',
  [
    query('week').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const weekParam = req.query.week as string;

      // Calculate week start and end
      let weekStart: Date;
      if (weekParam) {
        weekStart = new Date(weekParam);
      } else {
        weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
      }
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get user's weekly activity
      const activity = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Get AI usage
      const aiUsage = await prisma.aIGeneration.findMany({
        where: {
          userId,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get writing progress
      const writingProgress = await prisma.textVersion.findMany({
        where: {
          authorId: userId,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          scene: {
            include: {
              chapter: {
                include: {
                  book: {
                    include: {
                      project: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get exports
      const exports = await prisma.exportJob.findMany({
        where: {
          userId,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate statistics
      const totalWords = writingProgress.reduce((sum, version) => sum + version.wordCount, 0);
      const totalAITokens = aiUsage.reduce((sum, gen) => sum + gen.totalTokens, 0);
      const totalAICost = aiUsage.reduce((sum, gen) => sum + gen.estimatedCost, 0);
      const totalExports = exports.filter(exp => exp.status === 'completed').length;

      // Group by day
      const dailyStats = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayWords = writingProgress
          .filter(version => version.createdAt.toISOString().split('T')[0] === dateStr)
          .reduce((sum, version) => sum + version.wordCount, 0);
        
        const dayAITokens = aiUsage
          .filter(gen => gen.createdAt.toISOString().split('T')[0] === dateStr)
          .reduce((sum, gen) => sum + gen.totalTokens, 0);
        
        const dayAICost = aiUsage
          .filter(gen => gen.createdAt.toISOString().split('T')[0] === dateStr)
          .reduce((sum, gen) => sum + gen.estimatedCost, 0);

        dailyStats.push({
          date: dateStr,
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          words: dayWords,
          aiTokens: dayAITokens,
          aiCost: dayAICost,
        });
      }

      // Get top projects by word count
      const projectStats = new Map();
      writingProgress.forEach(version => {
        const projectId = version.scene.chapter.book.project.id;
        const projectTitle = version.scene.chapter.book.project.title;
        
        if (!projectStats.has(projectId)) {
          projectStats.set(projectId, {
            id: projectId,
            title: projectTitle,
            words: 0,
            scenes: 0,
          });
        }
        
        const stats = projectStats.get(projectId);
        stats.words += version.wordCount;
        stats.scenes += 1;
      });

      const topProjects = Array.from(projectStats.values())
        .sort((a, b) => b.words - a.words)
        .slice(0, 5);

      res.json({
        data: {
          period: {
            start: weekStart,
            end: weekEnd,
          },
          summary: {
            totalWords,
            totalAITokens,
            totalAICost,
            totalExports,
            totalScenes: writingProgress.length,
            totalAIGenerations: aiUsage.length,
          },
          dailyStats,
          topProjects,
          recentActivity: {
            aiUsage: aiUsage.slice(0, 10),
            writingProgress: writingProgress.slice(0, 10),
            exports: exports.slice(0, 10),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /reports/monthly - Get monthly report
router.get(
  '/monthly',
  [
    query('month').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const monthParam = req.query.month as string;

      // Calculate month start and end
      let monthStart: Date;
      if (monthParam) {
        monthStart = new Date(monthParam);
      } else {
        monthStart = new Date();
        monthStart.setDate(1); // First day of current month
      }
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of the month
      monthEnd.setHours(23, 59, 59, 999);

      // Get user's monthly activity
      const activity = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Get AI usage
      const aiUsage = await prisma.aIGeneration.findMany({
        where: {
          userId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get writing progress
      const writingProgress = await prisma.textVersion.findMany({
        where: {
          authorId: userId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          scene: {
            include: {
              chapter: {
                include: {
                  book: {
                    include: {
                      project: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get exports
      const exports = await prisma.exportJob.findMany({
        where: {
          userId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate statistics
      const totalWords = writingProgress.reduce((sum, version) => sum + version.wordCount, 0);
      const totalAITokens = aiUsage.reduce((sum, gen) => sum + gen.totalTokens, 0);
      const totalAICost = aiUsage.reduce((sum, gen) => sum + gen.estimatedCost, 0);
      const totalExports = exports.filter(exp => exp.status === 'completed').length;

      // Group by week
      const weeklyStats = [];
      const weeksInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      for (let i = 0; i < weeksInMonth; i++) {
        const weekStart = new Date(monthStart);
        weekStart.setDate(weekStart.getDate() + i * 7);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekWords = writingProgress
          .filter(version => version.createdAt >= weekStart && version.createdAt <= weekEnd)
          .reduce((sum, version) => sum + version.wordCount, 0);
        
        const weekAITokens = aiUsage
          .filter(gen => gen.createdAt >= weekStart && gen.createdAt <= weekEnd)
          .reduce((sum, gen) => sum + gen.totalTokens, 0);
        
        const weekAICost = aiUsage
          .filter(gen => gen.createdAt >= weekStart && gen.createdAt <= weekEnd)
          .reduce((sum, gen) => sum + gen.estimatedCost, 0);

        weeklyStats.push({
          week: i + 1,
          start: weekStart,
          end: weekEnd,
          words: weekWords,
          aiTokens: weekAITokens,
          aiCost: weekAICost,
        });
      }

      // Get top projects by word count
      const projectStats = new Map();
      writingProgress.forEach(version => {
        const projectId = version.scene.chapter.book.project.id;
        const projectTitle = version.scene.chapter.book.project.title;
        
        if (!projectStats.has(projectId)) {
          projectStats.set(projectId, {
            id: projectId,
            title: projectTitle,
            words: 0,
            scenes: 0,
          });
        }
        
        const stats = projectStats.get(projectId);
        stats.words += version.wordCount;
        stats.scenes += 1;
      });

      const topProjects = Array.from(projectStats.values())
        .sort((a, b) => b.words - a.words)
        .slice(0, 10);

      res.json({
        data: {
          period: {
            start: monthStart,
            end: monthEnd,
          },
          summary: {
            totalWords,
            totalAITokens,
            totalAICost,
            totalExports,
            totalScenes: writingProgress.length,
            totalAIGenerations: aiUsage.length,
          },
          weeklyStats,
          topProjects,
          recentActivity: {
            aiUsage: aiUsage.slice(0, 20),
            writingProgress: writingProgress.slice(0, 20),
            exports: exports.slice(0, 20),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as reportsRoutes };