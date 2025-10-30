import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ProjectController } from '../controllers/project.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const projectController = new ProjectController();

// Validation rules
const createProjectValidation = [
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('synopsis').optional().isLength({ max: 2000 }),
  body('genre').isIn(['fantasy', 'sci-fi', 'mystery', 'romance', 'thriller', 'horror', 'literary', 'historical', 'other']),
  body('targetAudience').optional().isIn(['children', 'young-adult', 'adult']),
  body('contentRating').optional().isIn(['G', 'PG', 'PG-13', 'R', 'NC-17']),
];

const updateProjectValidation = [
  body('title').optional().isLength({ min: 1, max: 200 }).trim(),
  body('synopsis').optional().isLength({ max: 2000 }),
  body('genre').optional().isIn(['fantasy', 'sci-fi', 'mystery', 'romance', 'thriller', 'horror', 'literary', 'historical', 'other']),
  body('targetAudience').optional().isIn(['children', 'young-adult', 'adult']),
  body('contentRating').optional().isIn(['G', 'PG', 'PG-13', 'R', 'NC-17']),
];

// List projects (with pagination and filters)
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('genre').optional().isString(),
    query('search').optional().isString(),
  ],
  validateRequest,
  projectController.listProjects
);

// Get single project
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.getProject
);

// Create project
router.post(
  '/',
  authenticate,
  createProjectValidation,
  validateRequest,
  projectController.createProject
);

// Update project
router.put(
  '/:id',
  authenticate,
  [param('id').isUUID(), ...updateProjectValidation],
  validateRequest,
  projectController.updateProject
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.deleteProject
);

// Archive/Restore project
router.post(
  '/:id/archive',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.archiveProject
);

router.post(
  '/:id/restore',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.restoreProject
);

// Project collaboration
router.get(
  '/:id/collaborators',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.getCollaborators
);

router.post(
  '/:id/collaborators',
  authenticate,
  [
    param('id').isUUID(),
    body('userId').isUUID(),
    body('role').isIn(['viewer', 'editor', 'admin']),
    body('permissions').optional().isArray(),
  ],
  validateRequest,
  projectController.addCollaborator
);

router.put(
  '/:id/collaborators/:userId',
  authenticate,
  [
    param('id').isUUID(),
    param('userId').isUUID(),
    body('role').optional().isIn(['viewer', 'editor', 'admin']),
    body('permissions').optional().isArray(),
  ],
  validateRequest,
  projectController.updateCollaborator
);

router.delete(
  '/:id/collaborators/:userId',
  authenticate,
  [
    param('id').isUUID(),
    param('userId').isUUID(),
  ],
  validateRequest,
  projectController.removeCollaborator
);

// Project statistics
router.get(
  '/:id/stats',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  projectController.getProjectStats
);

// Project export
router.post(
  '/:id/export',
  authenticate,
  [
    param('id').isUUID(),
    body('format').isIn(['json', 'markdown', 'docx', 'pdf', 'epub']),
    body('includeWorldbuilding').optional().isBoolean(),
    body('includeCharacters').optional().isBoolean(),
    body('includeLocations').optional().isBoolean(),
  ],
  validateRequest,
  projectController.exportProject
);

// Project duplication
router.post(
  '/:id/duplicate',
  authenticate,
  [
    param('id').isUUID(),
    body('title').isLength({ min: 1, max: 200 }).trim(),
  ],
  validateRequest,
  projectController.duplicateProject
);

export { router as projectRouter };