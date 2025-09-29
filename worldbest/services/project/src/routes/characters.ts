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

// GET /characters - List characters for a project
router.get(
  '/',
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

      // Verify user has access to project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId as string,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw createError('Project not found', 404);
      }

      const where: any = {
        projectId: projectId as string,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { aliases: { has: search as string } },
        ];
      }

      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where,
          include: {
            _count: {
              select: {
                relationships: true,
                secrets: true,
                povScenes: true,
                sceneAppearances: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.character.count({ where }),
      ]);

      res.json({
        data: characters,
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

// GET /characters/:id - Get character details
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const characterId = req.params.id;

      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          project: {
            ownerId: userId,
            deletedAt: null,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          relationships: {
            include: {
              relatedChar: {
                select: {
                  id: true,
                  name: true,
                  aliases: true,
                },
              },
            },
          },
          secrets: {
            select: {
              id: true,
              content: true,
              impactLevel: true,
              revealChapterId: true,
            },
          },
          _count: {
            select: {
              relationships: true,
              secrets: true,
              povScenes: true,
              sceneAppearances: true,
            },
          },
        },
      });

      if (!character) {
        throw createError('Character not found', 404);
      }

      res.json({ data: character });
    } catch (error) {
      next(error);
    }
  }
);

// POST /characters - Create new character
router.post(
  '/',
  [
    body('projectId').isString().notEmpty(),
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('aliases').optional().isArray(),
    body('age').optional().isInt({ min: 0, max: 1000 }),
    body('gender').optional().isString().trim(),
    body('orientation').optional().isString().trim(),
    body('mbti').optional().isString().trim(),
    body('height').optional().isString().trim(),
    body('build').optional().isString().trim(),
    body('hair').optional().isString().trim(),
    body('eyes').optional().isString().trim(),
    body('distinguishingFeatures').optional().isArray(),
    body('clothingStyle').optional().isString().trim(),
    body('appearanceDesc').optional().isString().trim(),
    body('coreTraits').optional().isArray(),
    body('quirks').optional().isArray(),
    body('fears').optional().isArray(),
    body('desires').optional().isArray(),
    body('values').optional().isArray(),
    body('flaws').optional().isArray(),
    body('strengths').optional().isArray(),
    body('weaknesses').optional().isArray(),
    body('backstory').optional().isString().trim(),
    body('vocabularyLevel').optional().isString().trim(),
    body('speechPatterns').optional().isArray(),
    body('catchphrases').optional().isArray(),
    body('dialect').optional().isString().trim(),
    body('formality').optional().isString().trim(),
    body('arcStart').optional().isString().trim(),
    body('arcCatalyst').optional().isString().trim(),
    body('arcJourney').optional().isArray(),
    body('arcClimax').optional().isString().trim(),
    body('arcResolution').optional().isString().trim(),
    body('images').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { projectId, ...characterData } = req.body;

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

      const character = await prisma.character.create({
        data: {
          projectId,
          ...characterData,
        },
        include: {
          _count: {
            select: {
              relationships: true,
              secrets: true,
              povScenes: true,
              sceneAppearances: true,
            },
          },
        },
      });

      logger.info('Character created', {
        characterId: character.id,
        projectId,
        userId,
        name: character.name,
      });

      res.status(201).json({ data: character });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /characters/:id - Update character
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('aliases').optional().isArray(),
    body('age').optional().isInt({ min: 0, max: 1000 }),
    body('gender').optional().isString().trim(),
    body('orientation').optional().isString().trim(),
    body('mbti').optional().isString().trim(),
    body('height').optional().isString().trim(),
    body('build').optional().isString().trim(),
    body('hair').optional().isString().trim(),
    body('eyes').optional().isString().trim(),
    body('distinguishingFeatures').optional().isArray(),
    body('clothingStyle').optional().isString().trim(),
    body('appearanceDesc').optional().isString().trim(),
    body('coreTraits').optional().isArray(),
    body('quirks').optional().isArray(),
    body('fears').optional().isArray(),
    body('desires').optional().isArray(),
    body('values').optional().isArray(),
    body('flaws').optional().isArray(),
    body('strengths').optional().isArray(),
    body('weaknesses').optional().isArray(),
    body('backstory').optional().isString().trim(),
    body('vocabularyLevel').optional().isString().trim(),
    body('speechPatterns').optional().isArray(),
    body('catchphrases').optional().isArray(),
    body('dialect').optional().isString().trim(),
    body('formality').optional().isString().trim(),
    body('arcStart').optional().isString().trim(),
    body('arcCatalyst').optional().isString().trim(),
    body('arcJourney').optional().isArray(),
    body('arcClimax').optional().isString().trim(),
    body('arcResolution').optional().isString().trim(),
    body('images').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const characterId = req.params.id;
      const updateData = req.body;

      // Check if character exists and user has access
      const existingCharacter = await prisma.character.findFirst({
        where: {
          id: characterId,
          project: {
            ownerId: userId,
            deletedAt: null,
          },
        },
      });

      if (!existingCharacter) {
        throw createError('Character not found', 404);
      }

      const character = await prisma.character.update({
        where: { id: characterId },
        data: updateData,
        include: {
          _count: {
            select: {
              relationships: true,
              secrets: true,
              povScenes: true,
              sceneAppearances: true,
            },
          },
        },
      });

      logger.info('Character updated', {
        characterId,
        userId,
        changes: Object.keys(updateData),
      });

      res.json({ data: character });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /characters/:id - Delete character
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const characterId = req.params.id;

      // Check if character exists and user has access
      const existingCharacter = await prisma.character.findFirst({
        where: {
          id: characterId,
          project: {
            ownerId: userId,
            deletedAt: null,
          },
        },
      });

      if (!existingCharacter) {
        throw createError('Character not found', 404);
      }

      await prisma.character.delete({
        where: { id: characterId },
      });

      logger.info('Character deleted', {
        characterId,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as characterRoutes };