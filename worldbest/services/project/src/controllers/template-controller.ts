import { Request, Response } from 'express';
import { z } from 'zod';
import { 
  TemplateService,
  ProjectTemplate,
  SearchFilters,
  SearchOptions
} from '../services/template-service';
import { validateRequest } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/auth';

// Validation schemas
const searchTemplatesSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    tags: z.string().optional(),
    genre: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    isOfficial: z.coerce.boolean().optional(),
    isPublic: z.coerce.boolean().optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    createdBy: z.string().optional(),
    limit: z.coerce.number().min(1).max(50).default(20),
    offset: z.coerce.number().min(0).default(0),
    sortBy: z.enum(['relevance', 'popularity', 'rating', 'newest', 'alphabetical']).default('relevance'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
});

const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    category: z.string().min(1),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).default([]),
    structure: z.object({
      chapters: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        order: z.number(),
        estimatedWordCount: z.number().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sections: z.array(z.object({
          title: z.string(),
          content: z.string().optional(),
          order: z.number(),
          type: z.enum(['prose', 'dialogue', 'action', 'description', 'notes'])
        })).optional()
      })).default([]),
      characters: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
        attributes: z.object({
          age: z.string().optional(),
          occupation: z.string().optional(),
          personality: z.array(z.string()).optional(),
          background: z.string().optional(),
          goals: z.string().optional(),
          conflicts: z.string().optional()
        }).default({}),
        relationships: z.array(z.object({
          characterName: z.string(),
          relationship: z.string(),
          description: z.string().optional()
        })).default([])
      })).default([]),
      worldbuilding: z.array(z.object({
        name: z.string(),
        type: z.enum(['location', 'culture', 'technology', 'magic', 'politics', 'history', 'other']),
        description: z.string().optional(),
        details: z.record(z.any()).default({}),
        connections: z.array(z.object({
          elementName: z.string(),
          connectionType: z.string(),
          description: z.string().optional()
        })).default([])
      })).default([]),
      plotlines: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(['main', 'subplot', 'character-arc', 'romance', 'mystery']),
        structure: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          order: z.number(),
          estimatedChapters: z.array(z.number()).optional()
        })).default([])
      })).default([]),
      settings: z.object({
        genre: z.array(z.string()).default([]),
        targetWordCount: z.number().optional(),
        targetAudience: z.string().optional(),
        writingStyle: z.string().optional(),
        pov: z.enum(['first', 'second', 'third-limited', 'third-omniscient', 'multiple']).optional(),
        tense: z.enum(['past', 'present', 'future']).optional(),
        customFields: z.array(z.object({
          name: z.string(),
          type: z.enum(['text', 'number', 'boolean', 'select', 'multiselect']),
          options: z.array(z.string()).optional(),
          required: z.boolean().optional()
        })).optional()
      }).default({})
    }),
    metadata: z.object({
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      estimatedCompletionTime: z.string().optional(),
      prerequisites: z.array(z.string()).optional(),
      features: z.array(z.string()).default([]),
      inspiration: z.string().optional(),
      exampleWorks: z.array(z.string()).optional(),
      tips: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional()
    }),
    isPublic: z.boolean().default(false),
    isOfficial: z.boolean().default(false)
  })
});

const updateTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().cuid()
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    category: z.string().min(1).optional(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).optional(),
    structure: z.any().optional(), // Complex structure, validated separately
    metadata: z.any().optional(),  // Complex metadata, validated separately
    isPublic: z.boolean().optional(),
    isOfficial: z.boolean().optional()
  })
});

const createProjectFromTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().cuid()
  }),
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    customizations: z.record(z.any()).optional()
  })
});

const rateTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().cuid()
  }),
  body: z.object({
    rating: z.number().min(1).max(5),
    review: z.string().optional()
  })
});

class TemplateController {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Search templates with advanced filtering
   */
  async searchTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        q = '',
        category,
        subcategory,
        tags,
        genre,
        difficulty,
        isOfficial,
        isPublic,
        minRating,
        createdBy,
        limit,
        offset,
        sortBy,
        sortOrder
      } = req.query as any;

      // Parse array parameters
      const tagsArray = tags ? tags.split(',') : undefined;
      const genreArray = genre ? genre.split(',') : undefined;

      const filters: SearchFilters = {
        category,
        subcategory,
        tags: tagsArray,
        genre: genreArray,
        difficulty,
        isOfficial,
        isPublic,
        minRating,
        createdBy
      };

      const options: SearchOptions = {
        limit,
        offset,
        sortBy,
        sortOrder
      };

      const result = await this.templateService.searchTemplates(q, filters, options);

      res.json({
        success: true,
        data: {
          templates: result.templates,
          pagination: {
            total: result.total,
            limit,
            offset,
            hasMore: result.hasMore
          },
          facets: result.facets
        }
      });
    } catch (error) {
      console.error('Error searching templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search templates'
      });
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await this.templateService.getTemplate(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template'
      });
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      const userId = req.user.id;

      const template = await this.templateService.createTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      });
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const template = await this.templateService.updateTemplate(templateId, updates, userId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template,
        message: 'Template updated successfully'
      });
    } catch (error) {
      console.error('Error updating template:', error);
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template'
      });
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const userId = req.user.id;

      const success = await this.templateService.deleteTemplate(templateId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template'
      });
    }
  }

  /**
   * Create a project from a template
   */
  async createProjectFromTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const projectData = req.body;
      const userId = req.user.id;

      const result = await this.templateService.createProjectFromTemplate(
        templateId,
        projectData,
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Project created from template successfully'
      });
    } catch (error) {
      console.error('Error creating project from template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project from template'
      });
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await this.templateService.getTemplateCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting template categories:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template categories'
      });
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const templates = await this.templateService.getPopularTemplates(Number(limit));

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting popular templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get popular templates'
      });
    }
  }

  /**
   * Get recommended templates for current user
   */
  async getRecommendedTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = 5 } = req.query;
      const userId = req.user.id;

      const templates = await this.templateService.getRecommendedTemplates(
        userId,
        Number(limit)
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting recommended templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommended templates'
      });
    }
  }

  /**
   * Rate a template
   */
  async rateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      await this.templateService.rateTemplate(templateId, userId, rating, review);

      res.json({
        success: true,
        message: 'Template rated successfully'
      });
    } catch (error) {
      console.error('Error rating template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rate template'
      });
    }
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const result = await this.templateService.searchTemplates(
        '',
        { createdBy: userId },
        { limit: Number(limit), offset: Number(offset), sortBy: 'newest' }
      );

      res.json({
        success: true,
        data: {
          templates: result.templates,
          pagination: {
            total: result.total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: result.hasMore
          }
        }
      });
    } catch (error) {
      console.error('Error getting user templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user templates'
      });
    }
  }
}

// Create and configure the controller
const templateController = new TemplateController();

// Export individual methods with validation middleware
export const searchTemplates = [
  validateRequest(searchTemplatesSchema),
  templateController.searchTemplates.bind(templateController)
];

export const getTemplate = [
  templateController.getTemplate.bind(templateController)
];

export const createTemplate = [
  validateRequest(createTemplateSchema),
  templateController.createTemplate.bind(templateController)
];

export const updateTemplate = [
  validateRequest(updateTemplateSchema),
  templateController.updateTemplate.bind(templateController)
];

export const deleteTemplate = [
  templateController.deleteTemplate.bind(templateController)
];

export const createProjectFromTemplate = [
  validateRequest(createProjectFromTemplateSchema),
  templateController.createProjectFromTemplate.bind(templateController)
];

export const getTemplateCategories = [
  templateController.getTemplateCategories.bind(templateController)
];

export const getPopularTemplates = [
  templateController.getPopularTemplates.bind(templateController)
];

export const getRecommendedTemplates = [
  templateController.getRecommendedTemplates.bind(templateController)
];

export const rateTemplate = [
  validateRequest(rateTemplateSchema),
  templateController.rateTemplate.bind(templateController)
];

export const getUserTemplates = [
  templateController.getUserTemplates.bind(templateController)
];

export default templateController;