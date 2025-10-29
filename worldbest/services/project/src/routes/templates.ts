import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  searchTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createProjectFromTemplate,
  getTemplateCategories,
  getPopularTemplates,
  getRecommendedTemplates,
  rateTemplate,
  getUserTemplates
} from '../controllers/template-controller';

const router = Router();

// All template routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/templates/search
 * @desc    Search templates with advanced filtering
 * @access  Private
 * @query   q?, category?, subcategory?, tags?, genre?, difficulty?, isOfficial?, isPublic?, minRating?, createdBy?, limit?, offset?, sortBy?, sortOrder?
 */
router.get('/search', searchTemplates);

/**
 * @route   GET /api/templates/categories
 * @desc    Get template categories and subcategories
 * @access  Private
 */
router.get('/categories', getTemplateCategories);

/**
 * @route   GET /api/templates/popular
 * @desc    Get popular templates
 * @access  Private
 * @query   limit?
 */
router.get('/popular', getPopularTemplates);

/**
 * @route   GET /api/templates/recommended
 * @desc    Get recommended templates for current user
 * @access  Private
 * @query   limit?
 */
router.get('/recommended', getRecommendedTemplates);

/**
 * @route   GET /api/templates/mine
 * @desc    Get current user's templates
 * @access  Private
 * @query   limit?, offset?
 */
router.get('/mine', getUserTemplates);

/**
 * @route   GET /api/templates/:templateId
 * @desc    Get a specific template by ID
 * @access  Private
 * @params  templateId - Template ID
 */
router.get('/:templateId', getTemplate);

/**
 * @route   POST /api/templates
 * @desc    Create a new template
 * @access  Private
 * @body    {name, description, category, subcategory?, tags?, structure, metadata, isPublic?, isOfficial?}
 */
router.post('/', createTemplate);

/**
 * @route   PUT /api/templates/:templateId
 * @desc    Update an existing template
 * @access  Private
 * @params  templateId - Template ID
 * @body    {name?, description?, category?, subcategory?, tags?, structure?, metadata?, isPublic?, isOfficial?}
 */
router.put('/:templateId', updateTemplate);

/**
 * @route   DELETE /api/templates/:templateId
 * @desc    Delete a template
 * @access  Private
 * @params  templateId - Template ID
 */
router.delete('/:templateId', deleteTemplate);

/**
 * @route   POST /api/templates/:templateId/create-project
 * @desc    Create a project from a template
 * @access  Private
 * @params  templateId - Template ID
 * @body    {title, description?, customizations?}
 */
router.post('/:templateId/create-project', createProjectFromTemplate);

/**
 * @route   POST /api/templates/:templateId/rate
 * @desc    Rate a template
 * @access  Private
 * @params  templateId - Template ID
 * @body    {rating, review?}
 */
router.post('/:templateId/rate', rateTemplate);

export default router;