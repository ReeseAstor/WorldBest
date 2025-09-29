import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// GET /projects - List user's projects
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('genre').optional().isString(),
    query('status').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const genre = req.query.genre as string;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      const where: any = {
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
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

      if (status) {
        where.status = status;
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            owner: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            books: {
              select: {
                id: true,
                title: true,
                status: true,
                order: true,
              },
            },
            _count: {
              select: {
                characters: true,
                locations: true,
                books: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          projects,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching projects', { error, userId: req.user.id });
      throw createError('Failed to fetch projects', 500, 'PROJECT_FETCH_ERROR');
    }
  }
);

// GET /projects/:id - Get specific project
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                },
              },
            },
          ],
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          books: {
            include: {
              chapters: {
                include: {
                  scenes: {
                    select: {
                      id: true,
                      title: true,
                      updatedAt: true,
                    },
                  },
                },
                orderBy: { number: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
          styleProfile: true,
          _count: {
            select: {
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
        throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching project', { error, projectId: req.params.id, userId: req.user.id });
      throw createError('Failed to fetch project', 500, 'PROJECT_FETCH_ERROR');
    }
  }
);

// POST /projects - Create new project
router.post(
  '/',
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('synopsis').optional().isString().trim().isLength({ max: 2000 }),
    body('genre').isString().trim().isLength({ min: 1, max: 50 }),
    body('defaultLanguage').optional().isString(),
    body('timePeriod').optional().isString(),
    body('targetAudience').optional().isString(),
    body('contentRating').optional().isIn(['G', 'PG', 'PG-13', 'R', 'NC-17']),
    body('visibility').optional().isIn(['private', 'team', 'public']),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        title,
        synopsis,
        genre,
        defaultLanguage = 'en-US',
        timePeriod,
        targetAudience,
        contentRating = 'PG-13',
        visibility = 'private',
      } = req.body;

      const project = await prisma.project.create({
        data: {
          ownerId: req.user.id,
          title,
          synopsis,
          genre,
          defaultLanguage,
          timePeriod,
          targetAudience,
          contentRating,
          visibility,
          // Default AI preferences
          draftModel: 'gpt-4',
          polishModel: 'gpt-4',
          temperatureDraft: 0.7,
          temperaturePolish: 0.3,
          maxTokensPerGen: 2000,
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              characters: true,
              locations: true,
              books: true,
            },
          },
        },
      });

      logger.info('Project created', { projectId: project.id, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error('Error creating project', { error, userId: req.user.id });
      throw createError('Failed to create project', 500, 'PROJECT_CREATE_ERROR');
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
    body('genre').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('defaultLanguage').optional().isString(),
    body('timePeriod').optional().isString(),
    body('targetAudience').optional().isString(),
    body('contentRating').optional().isIn(['G', 'PG', 'PG-13', 'R', 'NC-17']),
    body('visibility').optional().isIn(['private', 'team', 'public']),
    body('draftModel').optional().isString(),
    body('polishModel').optional().isString(),
    body('temperatureDraft').optional().isFloat({ min: 0, max: 2 }),
    body('temperaturePolish').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokensPerGen').optional().isInt({ min: 100, max: 8000 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user owns the project or has edit permissions
      const existingProject = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                  role: { in: ['owner', 'editor'] },
                },
              },
            },
          ],
          deletedAt: null,
        },
      });

      if (!existingProject) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const updateData: any = {};
      const allowedFields = [
        'title', 'synopsis', 'genre', 'defaultLanguage', 'timePeriod',
        'targetAudience', 'contentRating', 'visibility', 'draftModel',
        'polishModel', 'temperatureDraft', 'temperaturePolish', 'maxTokensPerGen'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              characters: true,
              locations: true,
              books: true,
            },
          },
        },
      });

      logger.info('Project updated', { projectId: project.id, userId: req.user.id });

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error updating project', { error, projectId: req.params.id, userId: req.user.id });
      throw createError('Failed to update project', 500, 'PROJECT_UPDATE_ERROR');
    }
  }
);

// DELETE /projects/:id - Delete project (soft delete)
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          ownerId: req.user.id, // Only owner can delete
          deletedAt: null,
        },
      });

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      await prisma.project.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });

      logger.info('Project deleted', { projectId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error deleting project', { error, projectId: req.params.id, userId: req.user.id });
      throw createError('Failed to delete project', 500, 'PROJECT_DELETE_ERROR');
    }
  }
);

export { router as projectRoutes };