import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// LOCATIONS

// GET /worldbuilding/locations - List locations for a project
router.get(
  '/locations',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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
      });

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const where: any = {
        projectId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { region: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            locationCultures: {
              include: {
                culture: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                scenes: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.location.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          locations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching locations', { error, userId: req.user.id });
      throw createError('Failed to fetch locations', 500, 'LOCATION_FETCH_ERROR');
    }
  }
);

// POST /worldbuilding/locations - Create new location
router.post(
  '/locations',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('region').optional().isString(),
    body('description').optional().isString(),
    body('timePeriod').optional().isString(),
    body('terrain').optional().isString(),
    body('climate').optional().isString(),
    body('flora').optional().isArray(),
    body('fauna').optional().isArray(),
    body('resources').optional().isArray(),
    body('hazards').optional().isArray(),
    body('atmosphere').optional().isString(),
    body('significance').optional().isString(),
    body('images').optional().isArray(),
    body('mapX').optional().isFloat(),
    body('mapY').optional().isFloat(),
    body('mapZ').optional().isFloat(),
    body('mapId').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, ...locationData } = req.body;

      // Verify user has edit access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const location = await prisma.location.create({
        data: {
          projectId,
          ...locationData,
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

      logger.info('Location created', { locationId: location.id, projectId, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: location,
      });
    } catch (error) {
      logger.error('Error creating location', { error, userId: req.user.id });
      throw createError('Failed to create location', 500, 'LOCATION_CREATE_ERROR');
    }
  }
);

// CULTURES

// GET /worldbuilding/cultures - List cultures for a project
router.get(
  '/cultures',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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
      });

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const where: any = {
        projectId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { government: { contains: search, mode: 'insensitive' } },
          { religion: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [cultures, total] = await Promise.all([
        prisma.culture.findMany({
          where,
          skip: offset,
          take: limit,
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
                type: true,
              },
            },
            locations: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.culture.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          cultures,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching cultures', { error, userId: req.user.id });
      throw createError('Failed to fetch cultures', 500, 'CULTURE_FETCH_ERROR');
    }
  }
);

// POST /worldbuilding/cultures - Create new culture
router.post(
  '/cultures',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('languageId').optional().isString(),
    body('economyId').optional().isString(),
    body('norms').optional().isArray(),
    body('rituals').optional().isArray(),
    body('government').optional().isString(),
    body('religion').optional().isString(),
    body('values').optional().isArray(),
    body('taboos').optional().isArray(),
    body('socialClasses').optional().isArray(),
    body('socialMobility').optional().isIn(['rigid', 'limited', 'fluid']),
    body('leadership').optional().isString(),
    body('familyStructure').optional().isString(),
    body('history').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, ...cultureData } = req.body;

      // Verify user has edit access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const culture = await prisma.culture.create({
        data: {
          projectId,
          ...cultureData,
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
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
              type: true,
            },
          },
        },
      });

      logger.info('Culture created', { cultureId: culture.id, projectId, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: culture,
      });
    } catch (error) {
      logger.error('Error creating culture', { error, userId: req.user.id });
      throw createError('Failed to create culture', 500, 'CULTURE_CREATE_ERROR');
    }
  }
);

// LANGUAGES

// GET /worldbuilding/languages - List languages for a project
router.get(
  '/languages',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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
      });

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const where: any = {
        projectId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { script: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [languages, total] = await Promise.all([
        prisma.language.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            cultures: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.language.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          languages,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching languages', { error, userId: req.user.id });
      throw createError('Failed to fetch languages', 500, 'LANGUAGE_FETCH_ERROR');
    }
  }
);

// POST /worldbuilding/languages - Create new language
router.post(
  '/languages',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('script').optional().isString(),
    body('phonetics').optional().isString(),
    body('grammarRules').optional().isArray(),
    body('commonPhrases').optional().isArray(),
    body('namingConventions').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, ...languageData } = req.body;

      // Verify user has edit access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const language = await prisma.language.create({
        data: {
          projectId,
          ...languageData,
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

      logger.info('Language created', { languageId: language.id, projectId, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: language,
      });
    } catch (error) {
      logger.error('Error creating language', { error, userId: req.user.id });
      throw createError('Failed to create language', 500, 'LANGUAGE_CREATE_ERROR');
    }
  }
);

// ECONOMIES

// GET /worldbuilding/economies - List economies for a project
router.get(
  '/economies',
  [
    query('projectId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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
      });

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const where: any = {
        projectId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
          { currencyName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [economies, total] = await Promise.all([
        prisma.economy.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            cultures: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.economy.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          economies,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching economies', { error, userId: req.user.id });
      throw createError('Failed to fetch economies', 500, 'ECONOMY_FETCH_ERROR');
    }
  }
);

// POST /worldbuilding/economies - Create new economy
router.post(
  '/economies',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('type').isIn(['barter', 'currency', 'mixed', 'gift', 'command', 'market']),
    body('currencyName').optional().isString(),
    body('currencySymbol').optional().isString(),
    body('denominations').optional().isArray(),
    body('majorIndustries').optional().isArray(),
    body('tradeRoutes').optional().isArray(),
    body('wealthDistribution').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, ...economyData } = req.body;

      // Verify user has edit access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      if (!project) {
        throw createError('Project not found or insufficient permissions', 404, 'PROJECT_NOT_FOUND');
      }

      const economy = await prisma.economy.create({
        data: {
          projectId,
          ...economyData,
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

      logger.info('Economy created', { economyId: economy.id, projectId, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: economy,
      });
    } catch (error) {
      logger.error('Error creating economy', { error, userId: req.user.id });
      throw createError('Failed to create economy', 500, 'ECONOMY_CREATE_ERROR');
    }
  }
);

export { router as worldbuildingRoutes };