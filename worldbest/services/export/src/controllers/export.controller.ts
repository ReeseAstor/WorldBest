import { ExportService } from '../services/export.service.js';
import { ExportFormat, ExportOptions, ExportRequest, ExportStatus, ExportJob } from '../types/export.types.js';
import { Request, Response } from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import { Redis } from 'ioredis';

export class ExportController {
  private exportService: ExportService;
  private exportQueue: Queue.Queue;
  private progressCache: Redis;

  constructor() {
    this.exportService = new ExportService();
    
    // Initialize Redis for progress tracking
    this.progressCache = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize Bull queue for async processing
    this.exportQueue = new Queue('export processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: 'exponential',
      },
    });

    this.setupQueueProcessor();
  }

  // Validation middleware
  static validateExportRequest = [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('format').isIn(Object.values(ExportFormat)).withMessage('Valid format is required'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.title').optional().isString().isLength({ max: 200 }),
    body('options.author').optional().isString().isLength({ max: 100 }),
    body('options.language').optional().isString().isLength({ max: 10 }),
    body('options.pageSize').optional().isIn(['A4', 'Letter', 'Legal']),
    body('options.fontSize').optional().isInt({ min: 8, max: 72 }),
    body('options.theme').optional().isIn(['light', 'dark', 'sepia']),
  ];

  static validateBatchExportRequest = [
    body('projectIds').isArray({ min: 1, max: 50 }).withMessage('1-50 project IDs required'),
    body('projectIds.*').isUUID().withMessage('All project IDs must be valid UUIDs'),
    body('format').isIn(Object.values(ExportFormat)).withMessage('Valid format is required'),
    body('options').optional().isObject().withMessage('Options must be an object'),
  ];

  static validateRequestId = [
    param('requestId').isUUID().withMessage('Valid request ID is required'),
  ];

  // Export a single project
  async exportProject(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { projectId, format, options = {} } = req.body;
      const userId = req.user?.id; // Assuming auth middleware sets req.user

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Create export request
      const requestId = uuidv4();
      const exportRequest: ExportRequest = {
        id: requestId,
        userId,
        projectId,
        format,
        options,
        status: ExportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store request in database (would typically use Prisma/database)
      await this.storeExportRequest(exportRequest);

      // Add job to queue for async processing
      await this.exportQueue.add('process-export', {
        requestId,
        userId,
        projectId,
        format,
        options
      }, {
        priority: options.priority || 0,
        delay: 0
      });

      res.status(202).json({
        success: true,
        data: {
          requestId,
          status: ExportStatus.PENDING,
          message: 'Export request queued for processing'
        }
      });

    } catch (error) {
      console.error('Export project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Export multiple projects as a batch
  async batchExport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { projectIds, format, options = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const requestId = uuidv4();

      // Add batch job to queue
      await this.exportQueue.add('process-batch-export', {
        requestId,
        userId,
        projectIds,
        format,
        options
      }, {
        priority: (options.priority || 0) + 10, // Higher priority for batch
        delay: 0
      });

      res.status(202).json({
        success: true,
        data: {
          requestId,
          status: ExportStatus.PENDING,
          projectCount: projectIds.length,
          message: 'Batch export request queued for processing'
        }
      });

    } catch (error) {
      console.error('Batch export error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get export status and progress
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { requestId } = req.params;
      const userId = req.user?.id;

      // Get request from database
      const exportRequest = await this.getExportRequest(requestId);
      
      if (!exportRequest) {
        res.status(404).json({
          success: false,
          error: 'Export request not found'
        });
        return;
      }

      // Check authorization
      if (exportRequest.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Get progress from cache
      const progressKey = `export:progress:${requestId}`;
      const progressData = await this.progressCache.get(progressKey);
      const progress = progressData ? JSON.parse(progressData) : { progress: 0, stage: 'pending' };

      res.json({
        success: true,
        data: {
          requestId: exportRequest.id,
          status: exportRequest.status,
          progress: progress.progress,
          stage: progress.stage,
          message: progress.message,
          createdAt: exportRequest.createdAt,
          completedAt: exportRequest.completedAt,
          downloadUrl: exportRequest.downloadUrl,
          fileSize: exportRequest.fileSize,
          expiresAt: exportRequest.expiresAt
        }
      });

    } catch (error) {
      console.error('Get export status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Download exported file
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      const exportRequest = await this.getExportRequest(requestId);
      
      if (!exportRequest || exportRequest.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Export not found'
        });
        return;
      }

      if (exportRequest.status !== ExportStatus.COMPLETED || !exportRequest.filePath) {
        res.status(400).json({
          success: false,
          error: 'Export not ready for download'
        });
        return;
      }

      // Check if file has expired
      if (exportRequest.expiresAt && exportRequest.expiresAt < new Date()) {
        res.status(410).json({
          success: false,
          error: 'Export file has expired'
        });
        return;
      }

      // Stream the file
      const fileStream = await this.exportService.getFileStream(exportRequest.filePath);
      const filename = `${exportRequest.id}.${this.getFileExtension(exportRequest.format)}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getMimeType(exportRequest.format));
      
      if (exportRequest.fileSize) {
        res.setHeader('Content-Length', exportRequest.fileSize.toString());
      }

      fileStream.pipe(res);

    } catch (error) {
      console.error('Download export error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Preview export (limited content)
  async previewExport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { projectId, format, options = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get project content (would typically fetch from database)
      const projectContent = await this.getProjectContent(projectId, userId);
      
      if (!projectContent) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Generate preview
      const result = await this.exportService.previewExport(projectContent, format, options);

      res.json({
        success: true,
        data: {
          previewUrl: `/api/export/preview/${result.previewPath}`,
          pages: result.pages,
          format
        }
      });

    } catch (error) {
      console.error('Preview export error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get user's export history
  async getExportHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const format = req.query.format as ExportFormat;
      const status = req.query.status as ExportStatus;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const history = await this.getExportHistory(userId, { page, limit, format, status });

      res.json({
        success: true,
        data: {
          exports: history.items,
          pagination: {
            page,
            limit,
            total: history.total,
            pages: Math.ceil(history.total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get export history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Cancel export request
  async cancelExport(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      const exportRequest = await this.getExportRequest(requestId);
      
      if (!exportRequest || exportRequest.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Export request not found'
        });
        return;
      }

      if (exportRequest.status === ExportStatus.COMPLETED) {
        res.status(400).json({
          success: false,
          error: 'Cannot cancel completed export'
        });
        return;
      }

      // Update status
      await this.updateExportStatus(requestId, ExportStatus.CANCELLED);

      // Remove from queue if still pending
      const jobs = await this.exportQueue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => j.data.requestId === requestId);
      if (job) {
        await job.remove();
      }

      res.json({
        success: true,
        data: { message: 'Export request cancelled' }
      });

    } catch (error) {
      console.error('Cancel export error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Setup queue processor
  private setupQueueProcessor(): void {
    this.exportQueue.process('process-export', 3, async (job) => {
      const { requestId, userId, projectId, format, options } = job.data;
      
      try {
        await this.updateProgress(requestId, 0, 'Starting export...');
        await this.updateExportStatus(requestId, ExportStatus.PROCESSING);

        // Get project content
        await this.updateProgress(requestId, 10, 'Loading project content...');
        const projectContent = await this.getProjectContent(projectId, userId);
        
        if (!projectContent) {
          throw new Error('Project not found');
        }

        // Validate content
        await this.updateProgress(requestId, 20, 'Validating content...');
        const validation = await this.exportService.validateContent(projectContent);
        
        if (!validation.isValid) {
          throw new Error(`Content validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
        }

        // Generate export
        await this.updateProgress(requestId, 30, 'Generating export...');
        const result = await this.exportService.exportProject(projectContent, format, options);

        // Update request with file info
        await this.updateProgress(requestId, 90, 'Finalizing...');
        await this.updateExportRequest(requestId, {
          status: ExportStatus.COMPLETED,
          filePath: result.filePath,
          fileSize: result.fileSize,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          downloadUrl: `/api/export/download/${requestId}`
        });

        await this.updateProgress(requestId, 100, 'Export completed');

        // Send notification (would integrate with notification service)
        // await this.notificationService.sendExportNotification(userId, requestId, 'completed');

      } catch (error) {
        console.error('Export processing error:', error);
        await this.updateExportStatus(requestId, ExportStatus.FAILED);
        await this.updateProgress(requestId, 0, `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    });

    this.exportQueue.process('process-batch-export', 1, async (job) => {
      const { requestId, userId, projectIds, format, options } = job.data;
      
      try {
        await this.updateProgress(requestId, 0, 'Starting batch export...');
        
        const projects = [];
        for (const projectId of projectIds) {
          const content = await this.getProjectContent(projectId, userId);
          if (content) {
            projects.push(content);
          }
        }

        const result = await this.exportService.batchExport(projects, format, options);

        await this.updateExportRequest(requestId, {
          status: ExportStatus.COMPLETED,
          filePath: result.archivePath,
          fileSize: result.fileSize,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          downloadUrl: `/api/export/download/${requestId}`,
          metadata: { results: result.results }
        });

        await this.updateProgress(requestId, 100, 'Batch export completed');

      } catch (error) {
        console.error('Batch export processing error:', error);
        await this.updateExportStatus(requestId, ExportStatus.FAILED);
        throw error;
      }
    });
  }

  // Helper methods (would typically be in a separate service/repository layer)
  private async storeExportRequest(request: ExportRequest): Promise<void> {
    // Store in database using Prisma or similar
    console.log('Storing export request:', request.id);
  }

  private async getExportRequest(requestId: string): Promise<ExportRequest | null> {
    // Get from database
    return null;
  }

  private async updateExportRequest(requestId: string, updates: Partial<ExportRequest>): Promise<void> {
    // Update in database
    console.log('Updating export request:', requestId, updates);
  }

  private async updateExportStatus(requestId: string, status: ExportStatus): Promise<void> {
    await this.updateExportRequest(requestId, { status, updatedAt: new Date() });
  }

  private async updateProgress(requestId: string, progress: number, message?: string): Promise<void> {
    const progressKey = `export:progress:${requestId}`;
    const progressData = {
      progress,
      stage: this.getStageFromProgress(progress),
      message,
      updatedAt: new Date().toISOString()
    };
    
    await this.progressCache.setex(progressKey, 3600, JSON.stringify(progressData)); // 1 hour TTL
  }

  private async getProjectContent(projectId: string, userId: string): Promise<any> {
    // Get project content from database
    return null;
  }

  private getStageFromProgress(progress: number): string {
    if (progress === 0) return 'pending';
    if (progress < 20) return 'initializing';
    if (progress < 40) return 'processing';
    if (progress < 80) return 'generating';
    if (progress < 100) return 'finalizing';
    return 'completed';
  }

  private getFileExtension(format: ExportFormat): string {
    const extensions = {
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.EPUB]: 'epub',
      [ExportFormat.DOCX]: 'docx',
      [ExportFormat.HTML]: 'html',
      [ExportFormat.JSON]: 'json',
      [ExportFormat.MARKDOWN]: 'md',
      [ExportFormat.TXT]: 'txt'
    };
    return extensions[format] || 'bin';
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes = {
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.EPUB]: 'application/epub+zip',
      [ExportFormat.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [ExportFormat.HTML]: 'text/html',
      [ExportFormat.JSON]: 'application/json',
      [ExportFormat.MARKDOWN]: 'text/markdown',
      [ExportFormat.TXT]: 'text/plain'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}