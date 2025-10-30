import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// GET /characters - List characters for a project
router.get(
  '/',
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
          { aliases: { hasSome: [search] } },
        ];
      }

      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            relationships: {
              include: {
                relatedChar: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            secrets: true,
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
        }),
        prisma.character.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          characters,
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
      logger.error('Error fetching characters', { error, userId: req.user.id });
      throw createError('Failed to fetch characters', 500, 'CHARACTER_FETCH_ERROR');
    }
  }
);

// GET /characters/:id - Get specific character
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const character = await prisma.character.findFirst({
        where: {
          id: req.params.id,
          project: {
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
          secrets: true,
          povScenes: {
            select: {
              id: true,
              title: true,
              chapter: {
                select: {
                  id: true,
                  title: true,
                  number: true,
                  book: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          sceneAppearances: {
            include: {
              scene: {
                select: {
                  id: true,
                  title: true,
                  chapter: {
                    select: {
                      id: true,
                      title: true,
                      number: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!character) {
        throw createError('Character not found', 404, 'CHARACTER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: character,
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching character', { error, characterId: req.params.id, userId: req.user.id });
      throw createError('Failed to fetch character', 500, 'CHARACTER_FETCH_ERROR');
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
    body('gender').optional().isString(),
    body('orientation').optional().isString(),
    body('mbti').optional().isString(),
    body('height').optional().isString(),
    body('build').optional().isString(),
    body('hair').optional().isString(),
    body('eyes').optional().isString(),
    body('distinguishingFeatures').optional().isArray(),
    body('clothingStyle').optional().isString(),
    body('appearanceDesc').optional().isString(),
    body('coreTraits').optional().isArray(),
    body('quirks').optional().isArray(),
    body('fears').optional().isArray(),
    body('desires').optional().isArray(),
    body('values').optional().isArray(),
    body('flaws').optional().isArray(),
    body('strengths').optional().isArray(),
    body('weaknesses').optional().isArray(),
    body('backstory').optional().isString(),
    body('vocabularyLevel').optional().isIn(['simple', 'moderate', 'complex']),
    body('speechPatterns').optional().isArray(),
    body('catchphrases').optional().isArray(),
    body('dialect').optional().isString(),
    body('formality').optional().isIn(['casual', 'neutral', 'formal']),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, ...characterData } = req.body;

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

      const character = await prisma.character.create({
        data: {
          projectId,
          ...characterData,
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              relationships: true,
              secrets: true,
            },
          },
        },
      });

      logger.info('Character created', { characterId: character.id, projectId, userId: req.user.id });

      res.status(201).json({
        success: true,
        data: character,
      });
    } catch (error) {
      logger.error('Error creating character', { error, userId: req.user.id });
      throw createError('Failed to create character', 500, 'CHARACTER_CREATE_ERROR');
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
    body('gender').optional().isString(),
    body('orientation').optional().isString(),
    body('mbti').optional().isString(),
    // ... other validation rules similar to create
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user has edit permissions
      const existingCharacter = await prisma.character.findFirst({
        where: {
          id: req.params.id,
          project: {
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
        },
      });

      if (!existingCharacter) {
        throw createError('Character not found or insufficient permissions', 404, 'CHARACTER_NOT_FOUND');
      }

      const updateData: any = {};
      const allowedFields = [
        'name', 'aliases', 'age', 'gender', 'orientation', 'mbti',
        'height', 'build', 'hair', 'eyes', 'distinguishingFeatures',
        'clothingStyle', 'appearanceDesc', 'coreTraits', 'quirks',
        'fears', 'desires', 'values', 'flaws', 'strengths', 'weaknesses',
        'backstory', 'vocabularyLevel', 'speechPatterns', 'catchphrases',
        'dialect', 'formality', 'arcStart', 'arcCatalyst', 'arcJourney',
        'arcClimax', 'arcResolution', 'images'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const character = await prisma.character.update({
        where: { id: req.params.id },
        data: updateData,
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
                },
              },
            },
          },
          secrets: true,
        },
      });

      logger.info('Character updated', { characterId: character.id, userId: req.user.id });

      res.json({
        success: true,
        data: character,
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error updating character', { error, characterId: req.params.id, userId: req.user.id });
      throw createError('Failed to update character', 500, 'CHARACTER_UPDATE_ERROR');
    }
  }
);

// DELETE /characters/:id - Delete character
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const character = await prisma.character.findFirst({
        where: {
          id: req.params.id,
          project: {
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
        },
      });

      if (!character) {
        throw createError('Character not found or insufficient permissions', 404, 'CHARACTER_NOT_FOUND');
      }

      await prisma.character.delete({
        where: { id: req.params.id },
      });

      logger.info('Character deleted', { characterId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Character deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error deleting character', { error, characterId: req.params.id, userId: req.user.id });
      throw createError('Failed to delete character', 500, 'CHARACTER_DELETE_ERROR');
    }
  }
);

// POST /characters/:id/relationships - Add relationship
router.post(
  '/:id/relationships',
  [
    param('id').isString().notEmpty(),
    body('relatedCharId').isString().notEmpty(),
    body('relationshipType').isIn(['family', 'romantic', 'friend', 'rival', 'mentor', 'enemy', 'ally', 'neutral']),
    body('description').optional().isString(),
    body('dynamics').optional().isString(),
    body('history').optional().isString(),
    body('tensionPoints').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { relatedCharId, relationshipType, description, dynamics, history, tensionPoints } = req.body;

      // Verify character exists and user has permissions
      const character = await prisma.character.findFirst({
        where: {
          id: req.params.id,
          project: {
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
        },
      });

      if (!character) {
        throw createError('Character not found or insufficient permissions', 404, 'CHARACTER_NOT_FOUND');
      }

      // Verify related character exists in same project
      const relatedCharacter = await prisma.character.findFirst({
        where: {
          id: relatedCharId,
          projectId: character.projectId,
        },
      });

      if (!relatedCharacter) {
        throw createError('Related character not found', 404, 'RELATED_CHARACTER_NOT_FOUND');
      }

      const relationship = await prisma.relationship.create({
        data: {
          characterId: req.params.id,
          relatedCharId,
          relationshipType,
          description,
          dynamics,
          history,
          tensionPoints: tensionPoints || [],
        },
        include: {
          relatedChar: {
            select: {
              id: true,
              name: true,
              aliases: true,
            },
          },
        },
      });

      logger.info('Relationship created', { 
        relationshipId: relationship.id, 
        characterId: req.params.id, 
        relatedCharId,
        userId: req.user.id 
      });

      res.status(201).json({
        success: true,
        data: relationship,
      });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error creating relationship', { error, characterId: req.params.id, userId: req.user.id });
      throw createError('Failed to create relationship', 500, 'RELATIONSHIP_CREATE_ERROR');
    }
  }
);

export { router as characterRoutes };