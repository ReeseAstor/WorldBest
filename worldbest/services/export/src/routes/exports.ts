import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { ExportService, ExportOptions } from '../services/exporters';
import { config } from '../config';

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

// GET /exports - List user's export jobs
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString().trim(),
    query('format').optional().isString().trim(),
    query('projectId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const status = req.query.status;
      const format = req.query.format;
      const projectId = req.query.projectId;

      const where: any = {
        userId,
      };

      if (status) {
        where.status = status;
      }

      if (format) {
        where.format = format;
      }

      if (projectId) {
        where.projectId = projectId;
      }

      const [exports, total] = await Promise.all([
        prisma.exportJob.findMany({
          where,
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.exportJob.count({ where }),
      ]);

      res.json({
        data: exports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exports/:id - Get export job details
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const exportId = req.params.id;

      const exportJob = await prisma.exportJob.findFirst({
        where: {
          id: exportId,
          userId,
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!exportJob) {
        throw createError('Export job not found', 404);
      }

      res.json({ data: exportJob });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exports - Create new export job
router.post(
  '/',
  [
    body('format').isString().isIn(Object.keys(config.export.formats)),
    body('projectId').isString().notEmpty(),
    body('bookIds').optional().isArray(),
    body('chapterIds').optional().isArray(),
    body('includeMetadata').optional().isBoolean(),
    body('includeImages').optional().isBoolean(),
    body('redactSensitive').optional().isBoolean(),
    body('customTitle').optional().isString().trim().isLength({ max: 200 }),
    body('customAuthor').optional().isString().trim().isLength({ max: 100 }),
    body('customCover').optional().isString().trim(),
    body('pageSize').optional().isString().isIn(['A4', 'A5', 'Letter']),
    body('fontSize').optional().isInt({ min: 8, max: 24 }),
    body('lineSpacing').optional().isFloat({ min: 1, max: 3 }),
    body('margin').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const options: ExportOptions = req.body;

      // Verify user has access to project
      const project = await prisma.project.findFirst({
        where: {
          id: options.projectId,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw createError('Project not found', 404);
      }

      // Check user's export limits
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Check if user has reached export limit
      const activeSubscription = user.subscriptions[0];
      if (activeSubscription) {
        const exportCount = await prisma.exportJob.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            },
          },
        });

        const maxExports = activeSubscription.plan === 'story_starter' ? 5 : 
                          activeSubscription.plan === 'solo_author' ? 50 : -1; // unlimited

        if (maxExports !== -1 && exportCount >= maxExports) {
          throw createError('Export limit reached for your plan', 403);
        }
      }

      // Create export job
      const result = await ExportService.createExportJob(userId, options);

      logger.info('Export job created', {
        jobId: result.jobId,
        userId,
        projectId: options.projectId,
        format: options.format,
      });

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exports/:id/download - Download export file
router.get(
  '/:id/download',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const exportId = req.params.id;

      const exportJob = await prisma.exportJob.findFirst({
        where: {
          id: exportId,
          userId,
          status: 'completed',
        },
      });

      if (!exportJob) {
        throw createError('Export job not found or not completed', 404);
      }

      if (!exportJob.fileUrl) {
        throw createError('Export file not available', 404);
      }

      // Check if file has expired
      const expiresAt = new Date(exportJob.createdAt);
      expiresAt.setDate(expiresAt.getDate() + config.export.retentionDays);

      if (new Date() > expiresAt) {
        throw createError('Export file has expired', 410);
      }

      // In a real implementation, this would stream the file from storage
      // For now, we'll redirect to the file URL
      res.redirect(exportJob.fileUrl);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /exports/:id - Cancel export job
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const exportId = req.params.id;

      const exportJob = await prisma.exportJob.findFirst({
        where: {
          id: exportId,
          userId,
        },
      });

      if (!exportJob) {
        throw createError('Export job not found', 404);
      }

      if (exportJob.status === 'completed') {
        throw createError('Cannot cancel completed export job', 400);
      }

      await prisma.exportJob.update({
        where: { id: exportId },
        data: {
          status: 'canceled',
        },
      });

      logger.info('Export job canceled', {
        exportId,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// GET /exports/formats - Get available export formats
router.get(
  '/formats',
  async (req, res) => {
    try {
      const formats = Object.entries(config.export.formats)
        .filter(([_, config]) => config.enabled)
        .map(([format, config]) => ({
          format,
          enabled: config.enabled,
          maxChapters: config.maxChapters,
          maxPages: config.maxPages,
          maxSize: config.maxSize,
        }));

      res.json({ data: formats });
    } catch (error) {
      next(error);
    }
  }
);

export { router as exportRoutes };