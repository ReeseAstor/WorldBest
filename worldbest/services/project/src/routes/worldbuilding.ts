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

// Helper function to verify project access
const verifyProjectAccess = async (projectId: string, userId: string) => {
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
  return project;
};

// ==================== LOCATIONS ====================

// GET /locations - List locations for a project
router.get(
  '/locations',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, page = 1, limit = 20, search } = req.query;

      await verifyProjectAccess(projectId as string, userId);

      const where: any = {
        projectId: projectId as string,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { region: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where,
          include: {
            _count: {
              select: {
                scenes: true,
                locationCultures: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.location.count({ where }),
      ]);

      res.json({
        data: locations,
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

// POST /locations - Create new location
router.post(
  '/locations',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('region').optional().isString().trim(),
    body('description').optional().isString().trim(),
    body('timePeriod').optional().isString().trim(),
    body('terrain').optional().isString().trim(),
    body('climate').optional().isString().trim(),
    body('flora').optional().isArray(),
    body('fauna').optional().isArray(),
    body('resources').optional().isArray(),
    body('hazards').optional().isArray(),
    body('atmosphere').optional().isString().trim(),
    body('significance').optional().isString().trim(),
    body('images').optional().isArray(),
    body('mapX').optional().isFloat(),
    body('mapY').optional().isFloat(),
    body('mapZ').optional().isFloat(),
    body('mapId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, ...locationData } = req.body;

      await verifyProjectAccess(projectId, userId);

      const location = await prisma.location.create({
        data: {
          projectId,
          ...locationData,
        },
        include: {
          _count: {
            select: {
              scenes: true,
              locationCultures: true,
            },
          },
        },
      });

      logger.info('Location created', {
        locationId: location.id,
        projectId,
        userId,
        name: location.name,
      });

      res.status(201).json({ data: location });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CULTURES ====================

// GET /cultures - List cultures for a project
router.get(
  '/cultures',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, page = 1, limit = 20, search } = req.query;

      await verifyProjectAccess(projectId as string, userId);

      const where: any = {
        projectId: projectId as string,
      };

      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' };
      }

      const [cultures, total] = await Promise.all([
        prisma.culture.findMany({
          where,
          include: {
            language: {
              select: {
                id: true,
                name: true,
              },
            },
            economy: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                locations: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.culture.count({ where }),
      ]);

      res.json({
        data: cultures,
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

// POST /cultures - Create new culture
router.post(
  '/cultures',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('languageId').optional().isString().trim(),
    body('economyId').optional().isString().trim(),
    body('norms').optional().isArray(),
    body('rituals').optional().isArray(),
    body('government').optional().isString().trim(),
    body('religion').optional().isString().trim(),
    body('values').optional().isArray(),
    body('taboos').optional().isArray(),
    body('socialClasses').optional().isObject(),
    body('socialMobility').optional().isString().trim(),
    body('leadership').optional().isString().trim(),
    body('familyStructure').optional().isString().trim(),
    body('history').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, ...cultureData } = req.body;

      await verifyProjectAccess(projectId, userId);

      const culture = await prisma.culture.create({
        data: {
          projectId,
          ...cultureData,
        },
        include: {
          language: true,
          economy: true,
          _count: {
            select: {
              locations: true,
            },
          },
        },
      });

      logger.info('Culture created', {
        cultureId: culture.id,
        projectId,
        userId,
        name: culture.name,
      });

      res.status(201).json({ data: culture });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== LANGUAGES ====================

// GET /languages - List languages for a project
router.get(
  '/languages',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, page = 1, limit = 20, search } = req.query;

      await verifyProjectAccess(projectId as string, userId);

      const where: any = {
        projectId: projectId as string,
      };

      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' };
      }

      const [languages, total] = await Promise.all([
        prisma.language.findMany({
          where,
          include: {
            _count: {
              select: {
                cultures: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.language.count({ where }),
      ]);

      res.json({
        data: languages,
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

// POST /languages - Create new language
router.post(
  '/languages',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('script').optional().isString().trim(),
    body('phonetics').optional().isString().trim(),
    body('grammarRules').optional().isArray(),
    body('commonPhrases').optional().isArray(),
    body('namingConventions').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, ...languageData } = req.body;

      await verifyProjectAccess(projectId, userId);

      const language = await prisma.language.create({
        data: {
          projectId,
          ...languageData,
        },
        include: {
          _count: {
            select: {
              cultures: true,
            },
          },
        },
      });

      logger.info('Language created', {
        languageId: language.id,
        projectId,
        userId,
        name: language.name,
      });

      res.status(201).json({ data: language });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== TIMELINES ====================

// GET /timelines - List timelines for a project
router.get(
  '/timelines',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, page = 1, limit = 20, search } = req.query;

      await verifyProjectAccess(projectId as string, userId);

      const where: any = {
        projectId: projectId as string,
      };

      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' };
      }

      const [timelines, total] = await Promise.all([
        prisma.timeline.findMany({
          where,
          include: {
            _count: {
              select: {
                events: true,
                eras: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.timeline.count({ where }),
      ]);

      res.json({
        data: timelines,
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

// POST /timelines - Create new timeline
router.post(
  '/timelines',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, name } = req.body;

      await verifyProjectAccess(projectId, userId);

      const timeline = await prisma.timeline.create({
        data: {
          projectId,
          name,
        },
        include: {
          _count: {
            select: {
              events: true,
              eras: true,
            },
          },
        },
      });

      logger.info('Timeline created', {
        timelineId: timeline.id,
        projectId,
        userId,
        name: timeline.name,
      });

      res.status(201).json({ data: timeline });
    } catch (error) {
      next(error);
    }
  }
);

export { router as worldbuildingRoutes };