import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { ExportManager } from '../services/export-manager';
import { ExportFormat } from '../types';
import { logger } from '../utils/logger';

const router = Router();
const exportManager = new ExportManager();

// POST /exports - Create new export job
router.post(
  '/',
  [
    body('projectId').isString().notEmpty(),
    body('format').isIn(['epub', 'pdf', 'docx', 'markdown', 'html', 'json', 'txt']),
    body('options').optional().isObject(),
    body('filename').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, format, options = {}, filename } = req.body;

      const result = await exportManager.createExportJob(req.user.id, {
        projectId,
        format: format as ExportFormat,
        options: {
          ...options,
          filename,
        },
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating export job', { error, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_CREATE_ERROR',
          message: 'Failed to create export job',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// GET /exports - List export jobs
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await exportManager.listExportJobs(req.user.id, limit, offset);

      res.json({
        success: true,
        data: {
          jobs: result.jobs,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Error listing export jobs', { error, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_LIST_ERROR',
          message: 'Failed to list export jobs',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// GET /exports/:id - Get export job status
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const job = await exportManager.getExportJob(req.params.id, req.user.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'EXPORT_NOT_FOUND',
            message: 'Export job not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      logger.error('Error fetching export job', { 
        error, 
        jobId: req.params.id, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_FETCH_ERROR',
          message: 'Failed to fetch export job',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// DELETE /exports/:id - Cancel export job
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = await exportManager.cancelExportJob(req.params.id, req.user.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'EXPORT_NOT_FOUND',
            message: 'Export job not found or cannot be canceled',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        message: 'Export job canceled successfully',
      });
    } catch (error) {
      logger.error('Error canceling export job', { 
        error, 
        jobId: req.params.id, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_CANCEL_ERROR',
          message: 'Failed to cancel export job',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// GET /exports/:id/download - Download export file
router.get(
  '/:id/download',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const job = await exportManager.getExportJob(req.params.id, req.user.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'EXPORT_NOT_FOUND',
            message: 'Export job not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (job.status !== 'completed' || !job.fileUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXPORT_NOT_READY',
            message: 'Export is not ready for download',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Redirect to file URL (for local storage) or proxy the download
      if (job.fileUrl.startsWith('http')) {
        res.redirect(job.fileUrl);
      } else {
        // For local files, serve directly
        res.download(job.fileUrl);
      }
    } catch (error) {
      logger.error('Error downloading export file', { 
        error, 
        jobId: req.params.id, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_DOWNLOAD_ERROR',
          message: 'Failed to download export file',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export { router as exportRoutes };