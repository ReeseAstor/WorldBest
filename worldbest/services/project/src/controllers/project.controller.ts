import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { CollaborationService } from '../services/collaboration.service';
import { ExportService } from '../services/export.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export class ProjectController {
  private projectService: ProjectService;
  private collaborationService: CollaborationService;
  private exportService: ExportService;

  constructor() {
    this.projectService = new ProjectService();
    this.collaborationService = new CollaborationService();
    this.exportService = new ExportService();
  }

  listProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 10, genre, search } = req.query;

      const projects = await this.projectService.listProjects(userId, {
        page: Number(page),
        limit: Number(limit),
        genre: genre as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: projects.data,
        pagination: projects.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const project = await this.projectService.getProject(id, userId);

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  };

  createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const projectData = req.body;

      const project = await this.projectService.createProject(userId, projectData);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const updates = req.body;

      const project = await this.projectService.updateProject(id, userId, updates);

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await this.projectService.deleteProject(id, userId);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  archiveProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await this.projectService.archiveProject(id, userId);

      res.json({
        success: true,
        message: 'Project archived successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  restoreProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await this.projectService.restoreProject(id, userId);

      res.json({
        success: true,
        message: 'Project restored successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getCollaborators = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const collaborators = await this.collaborationService.getCollaborators(id, userId);

      res.json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      next(error);
    }
  };

  addCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = (req as any).user.id;
      const { id } = req.params;
      const { userId, role, permissions } = req.body;

      const collaborator = await this.collaborationService.addCollaborator(
        id,
        requesterId,
        userId,
        role,
        permissions
      );

      res.status(201).json({
        success: true,
        data: collaborator,
        message: 'Collaborator added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = (req as any).user.id;
      const { id, userId } = req.params;
      const { role, permissions } = req.body;

      const collaborator = await this.collaborationService.updateCollaborator(
        id,
        requesterId,
        userId,
        { role, permissions }
      );

      res.json({
        success: true,
        data: collaborator,
        message: 'Collaborator updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  removeCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = (req as any).user.id;
      const { id, userId } = req.params;

      await this.collaborationService.removeCollaborator(id, requesterId, userId);

      res.json({
        success: true,
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const stats = await this.projectService.getProjectStats(id, userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  exportProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const options = req.body;

      const exportJob = await this.exportService.createExportJob(id, userId, options);

      res.status(202).json({
        success: true,
        data: {
          jobId: exportJob.id,
          status: exportJob.status,
          message: 'Export job created. You will be notified when it\'s ready.',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  duplicateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { title } = req.body;

      const duplicatedProject = await this.projectService.duplicateProject(id, userId, title);

      res.status(201).json({
        success: true,
        data: duplicatedProject,
        message: 'Project duplicated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}