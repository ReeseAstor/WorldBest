import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { projectController } from '../controllers/projects';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

/**
 * Create new project
 */
router.post('/',
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('genre')
    .optional()
    .isIn(['fantasy', 'science-fiction', 'romance', 'mystery', 'thriller', 'horror', 'literary', 'historical', 'contemporary', 'young-adult', 'children', 'other'])
    .withMessage('Invalid genre'),
  body('type')
    .optional()
    .isIn(['novel', 'short-story', 'screenplay', 'poetry', 'non-fiction', 'other'])
    .withMessage('Invalid project type'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  projectController.createProject
);

/**
 * Get user's projects
 */
router.get('/',
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
  query('genre')
    .optional()
    .isIn(['fantasy', 'science-fiction', 'romance', 'mystery', 'thriller', 'horror', 'literary', 'historical', 'contemporary', 'young-adult', 'children', 'other'])
    .withMessage('Invalid genre filter'),
  query('type')
    .optional()
    .isIn(['novel', 'short-story', 'screenplay', 'poetry', 'non-fiction', 'other'])
    .withMessage('Invalid type filter'),
  query('status')
    .optional()
    .isIn(['draft', 'writing', 'editing', 'completed', 'published', 'archived'])
    .withMessage('Invalid status filter'),
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  projectController.getUserProjects
);

/**
 * Get project by ID
 */
router.get('/:projectId',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  projectController.getProject
);

/**
 * Update project
 */
router.put('/:projectId',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('genre')
    .optional()
    .isIn(['fantasy', 'science-fiction', 'romance', 'mystery', 'thriller', 'horror', 'literary', 'historical', 'contemporary', 'young-adult', 'children', 'other'])
    .withMessage('Invalid genre'),
  body('type')
    .optional()
    .isIn(['novel', 'short-story', 'screenplay', 'poetry', 'non-fiction', 'other'])
    .withMessage('Invalid project type'),
  body('status')
    .optional()
    .isIn(['draft', 'writing', 'editing', 'completed', 'published'])
    .withMessage('Invalid status'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  projectController.updateProject
);

/**
 * Delete project
 */
router.delete('/:projectId',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  query('permanent')
    .optional()
    .isBoolean()
    .withMessage('Permanent must be a boolean'),
  projectController.deleteProject
);

/**
 * Restore project from trash
 */
router.post('/:projectId/restore',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  projectController.restoreProject
);

/**
 * Duplicate project
 */
router.post('/:projectId/duplicate',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('includeContent')
    .optional()
    .isBoolean()
    .withMessage('Include content must be a boolean'),
  projectController.duplicateProject
);

/**
 * Archive/Unarchive project
 */
router.post('/:projectId/archive',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  projectController.toggleArchiveProject
);

/**
 * Get project statistics
 */
router.get('/:projectId/stats',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  projectController.getProjectStats
);

/**
 * Get project collaborators
 */
router.get('/:projectId/collaborators',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  projectController.getProjectCollaborators
);

/**
 * Add collaborator to project
 */
router.post('/:projectId/collaborators',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('role')
    .optional()
    .isIn(['viewer', 'commenter', 'editor', 'admin'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  projectController.addCollaborator
);

/**
 * Update collaborator permissions
 */
router.put('/:projectId/collaborators/:collaboratorId',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  param('collaboratorId')
    .isUUID()
    .withMessage('Invalid collaborator ID'),
  body('role')
    .optional()
    .isIn(['viewer', 'commenter', 'editor', 'admin'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  projectController.updateCollaborator
);

/**
 * Remove collaborator from project
 */
router.delete('/:projectId/collaborators/:collaboratorId',
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  param('collaboratorId')
    .isUUID()
    .withMessage('Invalid collaborator ID'),
  projectController.removeCollaborator
);

export { router as projectRoutes };