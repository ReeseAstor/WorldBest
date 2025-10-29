import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { projectService } from '../services/project-service';
import { logger } from '../utils/logger';

export class ProjectController {
  /**
   * Create a new project
   */
  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { title, description, genre, type, settings } = req.body;

      const project = await projectService.createProject({
        title,
        description,
        genre,
        type,
        settings,
        ownerId: userId,
      });

      logger.info('Project created', {
        projectId: project.id,
        userId,
        title: project.title,
      });

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      next(error);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const project = await projectService.getProjectById(projectId, userId);

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have access to it.',
        });
      }

      res.json(project);
    } catch (error) {
      logger.error('Error getting project:', error);
      next(error);
    }
  }

  /**
   * Get user's projects with pagination and filtering
   */
  async getUserProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        page = 1,
        limit = 20,
        search,
        genre,
        type,
        status,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = req.query;

      const filters = {
        search: search as string,
        genre: genre as string,
        type: type as string,
        status: status as string,
      };

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 items per page
      };

      const sorting = {
        field: sortBy as string,
        order: sortOrder as 'asc' | 'desc',
      };

      const result = await projectService.getUserProjects(userId, filters, pagination, sorting);

      res.json(result);
    } catch (error) {
      logger.error('Error getting user projects:', error);
      next(error);
    }
  }

  /**
   * Update project
   */
  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { projectId } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const updatedProject = await projectService.updateProject(projectId, userId, updateData);

      if (!updatedProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have permission to update it.',
        });
      }

      logger.info('Project updated', {
        projectId,
        userId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        message: 'Project updated successfully',
        project: updatedProject,
      });
    } catch (error) {
      logger.error('Error updating project:', error);
      next(error);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const { permanent = false } = req.query;

      const result = await projectService.deleteProject(
        projectId,
        userId,
        permanent === 'true'
      );

      if (!result) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have permission to delete it.',
        });
      }

      logger.info('Project deleted', {
        projectId,
        userId,
        permanent: permanent === 'true',
      });

      res.json({
        message: permanent === 'true'
          ? 'Project permanently deleted'
          : 'Project moved to trash',
      });
    } catch (error) {
      logger.error('Error deleting project:', error);
      next(error);
    }
  }

  /**
   * Restore project from trash
   */
  async restoreProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const restoredProject = await projectService.restoreProject(projectId, userId);

      if (!restoredProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist in trash or you do not have permission to restore it.',
        });
      }

      logger.info('Project restored', {
        projectId,
        userId,
      });

      res.json({
        message: 'Project restored successfully',
        project: restoredProject,
      });
    } catch (error) {
      logger.error('Error restoring project:', error);
      next(error);
    }
  }

  /**
   * Duplicate project
   */
  async duplicateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const { title, includeContent = true } = req.body;

      const duplicatedProject = await projectService.duplicateProject(
        projectId,
        userId,
        title,
        includeContent
      );

      if (!duplicatedProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have access to it.',
        });
      }

      logger.info('Project duplicated', {
        originalProjectId: projectId,
        newProjectId: duplicatedProject.id,
        userId,
      });

      res.status(201).json({
        message: 'Project duplicated successfully',
        project: duplicatedProject,
      });
    } catch (error) {
      logger.error('Error duplicating project:', error);
      next(error);
    }
  }

  /**
   * Archive/Unarchive project
   */
  async toggleArchiveProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const project = await projectService.toggleArchiveProject(projectId, userId);

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have permission to modify it.',
        });
      }

      logger.info('Project archive status toggled', {
        projectId,
        userId,
        archived: project.archivedAt !== null,
      });

      res.json({
        message: project.archivedAt
          ? 'Project archived successfully'
          : 'Project unarchived successfully',
        project,
      });
    } catch (error) {
      logger.error('Error toggling project archive status:', error);
      next(error);
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const stats = await projectService.getProjectStatistics(projectId, userId);

      if (!stats) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have access to it.',
        });
      }

      res.json(stats);
    } catch (error) {
      logger.error('Error getting project statistics:', error);
      next(error);
    }
  }

  /**
   * Get project collaboration info
   */
  async getProjectCollaborators(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const collaborators = await projectService.getProjectCollaborators(projectId, userId);

      if (!collaborators) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist or you do not have access to it.',
        });
      }

      res.json(collaborators);
    } catch (error) {
      logger.error('Error getting project collaborators:', error);
      next(error);
    }
  }

  /**
   * Add collaborator to project
   */
  async addCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { projectId } = req.params;
      const userId = req.user!.id;
      const { email, role = 'viewer', permissions } = req.body;

      const collaboration = await projectService.addCollaborator(
        projectId,
        userId,
        email,
        role,
        permissions
      );

      if (!collaboration) {
        return res.status(404).json({
          error: 'Project not found or user already collaborating',
          message: 'The requested project does not exist, you do not have permission, or the user is already a collaborator.',
        });
      }

      logger.info('Collaborator added to project', {
        projectId,
        ownerId: userId,
        collaboratorEmail: email,
        role,
      });

      res.status(201).json({
        message: 'Collaborator added successfully',
        collaboration,
      });
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      next(error);
    }
  }

  /**
   * Update collaborator permissions
   */
  async updateCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { projectId, collaboratorId } = req.params;
      const userId = req.user!.id;
      const { role, permissions } = req.body;

      const updatedCollaboration = await projectService.updateCollaborator(
        projectId,
        userId,
        collaboratorId,
        { role, permissions }
      );

      if (!updatedCollaboration) {
        return res.status(404).json({
          error: 'Collaboration not found',
          message: 'The collaboration does not exist or you do not have permission to modify it.',
        });
      }

      logger.info('Collaborator permissions updated', {
        projectId,
        ownerId: userId,
        collaboratorId,
        newRole: role,
      });

      res.json({
        message: 'Collaborator permissions updated successfully',
        collaboration: updatedCollaboration,
      });
    } catch (error) {
      logger.error('Error updating collaborator:', error);
      next(error);
    }
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, collaboratorId } = req.params;
      const userId = req.user!.id;

      const result = await projectService.removeCollaborator(projectId, userId, collaboratorId);

      if (!result) {
        return res.status(404).json({
          error: 'Collaboration not found',
          message: 'The collaboration does not exist or you do not have permission to remove it.',
        });
      }

      logger.info('Collaborator removed from project', {
        projectId,
        ownerId: userId,
        collaboratorId,
      });

      res.json({
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      next(error);
    }
  }
}

export const projectController = new ProjectController();