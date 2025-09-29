import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analytics';

const router = Router();
const prisma = PrismaClient.getInstance();
const analyticsService = new AnalyticsService(prisma);

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

// POST /analytics/track - Track an event
router.post(
  '/track',
  [
    body('eventType').isString().notEmpty(),
    body('data').isObject(),
    body('metadata').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { eventType, data, metadata } = req.body;

      await analyticsService.trackEvent(userId, eventType, data, metadata);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /analytics/ai-usage - Track AI usage
router.post(
  '/ai-usage',
  [
    body('projectId').isString().notEmpty(),
    body('persona').isString().notEmpty(),
    body('intent').isString().notEmpty(),
    body('tokens').isInt({ min: 0 }),
    body('cost').isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, persona, intent, tokens, cost } = req.body;

      await analyticsService.trackAIUsage(userId, projectId, persona, intent, tokens, cost);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /analytics/writing-progress - Track writing progress
router.post(
  '/writing-progress',
  [
    body('projectId').isString().notEmpty(),
    body('wordCount').isInt({ min: 0 }),
    body('sceneId').optional().isString(),
    body('chapterId').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, wordCount, sceneId, chapterId } = req.body;

      await analyticsService.trackWritingProgress(userId, projectId, wordCount, sceneId, chapterId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /analytics/export - Track export generation
router.post(
  '/export',
  [
    body('projectId').isString().notEmpty(),
    body('format').isString().notEmpty(),
    body('fileSize').isInt({ min: 0 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, format, fileSize } = req.body;

      await analyticsService.trackExport(userId, projectId, format, fileSize);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /analytics/collaboration - Track collaboration activity
router.post(
  '/collaboration',
  [
    body('projectId').isString().notEmpty(),
    body('action').isString().notEmpty(),
    body('collaboratorId').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, action, collaboratorId } = req.body;

      await analyticsService.trackCollaboration(userId, projectId, action, collaboratorId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET /analytics/dashboard - Get user dashboard data
router.get(
  '/dashboard',
  [
    query('period').optional().isString().isIn(['7d', '30d', '90d', '1y']),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const period = req.query.period || '30d';

      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get user's projects
      const projects = await prisma.project.findMany({
        where: {
          ownerId: userId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              books: true,
              chapters: true,
              scenes: true,
            },
          },
        },
      });

      // Get AI usage
      const aiUsage = await prisma.aIGeneration.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
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
            gte: startDate,
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
            gte: startDate,
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

      // Group by date for charts
      const dailyStats = new Map();
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats.set(dateStr, {
          date: dateStr,
          words: 0,
          aiTokens: 0,
          aiCost: 0,
          exports: 0,
        });
      }

      // Populate daily stats
      writingProgress.forEach(version => {
        const dateStr = version.createdAt.toISOString().split('T')[0];
        const stats = dailyStats.get(dateStr);
        if (stats) {
          stats.words += version.wordCount;
        }
      });

      aiUsage.forEach(gen => {
        const dateStr = gen.createdAt.toISOString().split('T')[0];
        const stats = dailyStats.get(dateStr);
        if (stats) {
          stats.aiTokens += gen.totalTokens;
          stats.aiCost += gen.estimatedCost;
        }
      });

      exports.forEach(exp => {
        if (exp.status === 'completed') {
          const dateStr = exp.createdAt.toISOString().split('T')[0];
          const stats = dailyStats.get(dateStr);
          if (stats) {
            stats.exports += 1;
          }
        }
      });

      const chartData = Array.from(dailyStats.values());

      res.json({
        data: {
          summary: {
            totalProjects: projects.length,
            totalWords,
            totalAITokens,
            totalAICost,
            totalExports,
            period,
          },
          projects,
          chartData,
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

// GET /analytics/project/:id - Get project analytics
router.get(
  '/project/:id',
  [
    param('id').isString().notEmpty(),
    query('period').optional().isString().isIn(['7d', '30d', '90d', '1y']),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id;
      const period = req.query.period || '30d';

      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Verify user has access to project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw createError('Project not found', 404);
      }

      // Get project statistics
      const projectStats = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          books: {
            include: {
              chapters: {
                include: {
                  scenes: {
                    include: {
                      textVersions: {
                        where: {
                          createdAt: {
                            gte: startDate,
                          },
                        },
                        orderBy: {
                          createdAt: 'desc',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              books: true,
              chapters: true,
              scenes: true,
              characters: true,
              locations: true,
            },
          },
        },
      });

      // Get AI usage for this project
      const aiUsage = await prisma.aIGeneration.findMany({
        where: {
          projectId,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate statistics
      const totalWords = projectStats?.books.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => 
          chapterSum + chapter.scenes.reduce((sceneSum, scene) => 
            sceneSum + scene.textVersions.reduce((versionSum, version) => 
              versionSum + version.wordCount, 0
            ), 0
          ), 0
        ), 0
      ) || 0;

      const totalAITokens = aiUsage.reduce((sum, gen) => sum + gen.totalTokens, 0);
      const totalAICost = aiUsage.reduce((sum, gen) => sum + gen.estimatedCost, 0);

      res.json({
        data: {
          project: projectStats,
          summary: {
            totalWords,
            totalAITokens,
            totalAICost,
            period,
          },
          aiUsage,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as analyticsRoutes };