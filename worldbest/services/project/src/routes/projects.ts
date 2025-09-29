import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
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

// GET /projects - List user's projects
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('genre').optional().isString().trim(),
    query('status').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const search = req.query.search;
      const genre = req.query.genre;
      const status = req.query.status;

      const where: any = {
        ownerId: userId,
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { synopsis: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (genre) {
        where.genre = genre;
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            _count: {
              select: {
                books: true,
                characters: true,
                locations: true,
              },
            },
            styleProfile: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        data: projects,
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

// GET /projects/:id - Get project details
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: null,
        },
        include: {
          books: {
            include: {
              _count: {
                select: {
                  chapters: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          characters: {
            take: 10,
            orderBy: { name: 'asc' },
          },
          locations: {
            take: 10,
            orderBy: { name: 'asc' },
          },
          styleProfile: true,
          _count: {
            select: {
              books: true,
              characters: true,
              locations: true,
              cultures: true,
              languages: true,
              economies: true,
              timelines: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found', 404);
      }

      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

// POST /projects - Create new project
router.post(
  '/',
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('synopsis').optional().isString().trim().isLength({ max: 2000 }),
    body('genre').isString().trim().isLength({ min: 1, max: 100 }),
    body('defaultLanguage').optional().isString().trim(),
    body('timePeriod').optional().isString().trim(),
    body('targetAudience').optional().isString().trim(),
    body('contentRating').optional().isString().trim(),
    body('styleProfileId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const {
        title,
        synopsis,
        genre,
        defaultLanguage = 'en-US',
        timePeriod,
        targetAudience,
        contentRating = 'PG-13',
        styleProfileId,
      } = req.body;

      const project = await prisma.project.create({
        data: {
          ownerId: userId,
          title,
          synopsis,
          genre,
          defaultLanguage,
          timePeriod,
          targetAudience,
          contentRating,
          styleProfileId,
        },
        include: {
          styleProfile: true,
          _count: {
            select: {
              books: true,
              characters: true,
              locations: true,
            },
          },
        },
      });

      logger.info('Project created', {
        projectId: project.id,
        userId,
        title,
      });

      res.status(201).json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /projects/:id - Update project
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
    body('synopsis').optional().isString().trim().isLength({ max: 2000 }),
    body('genre').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('defaultLanguage').optional().isString().trim(),
    body('timePeriod').optional().isString().trim(),
    body('targetAudience').optional().isString().trim(),
    body('contentRating').optional().isString().trim(),
    body('styleProfileId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id;
      const updateData = req.body;

      // Check if project exists and user owns it
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!existingProject) {
        throw createError('Project not found', 404);
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
        include: {
          styleProfile: true,
          _count: {
            select: {
              books: true,
              characters: true,
              locations: true,
            },
          },
        },
      });

      logger.info('Project updated', {
        projectId,
        userId,
        changes: Object.keys(updateData),
      });

      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /projects/:id - Soft delete project
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id;

      // Check if project exists and user owns it
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!existingProject) {
        throw createError('Project not found', 404);
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      });

      logger.info('Project deleted', {
        projectId,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as projectRoutes };