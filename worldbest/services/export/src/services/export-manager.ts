import { PrismaClient } from '@worldbest/database';
import { ExportFormat, ExportStatus, ExportRequest, ExportResponse, ExportJob, FileOutput } from '../types';
import { DataCollector } from './data-collector';
import { MarkdownExporter } from './exporters/markdown-exporter';
import { PDFExporter } from './exporters/pdf-exporter';
import { EPubExporter } from './exporters/epub-exporter';
import { StorageManager } from './storage-manager';
import { logger } from '../utils/logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class ExportManager {
  private prisma: PrismaClient;
  private dataCollector: DataCollector;
  private storageManager: StorageManager;

  constructor() {
    this.prisma = PrismaClient.getInstance();
    this.dataCollector = new DataCollector();
    this.storageManager = new StorageManager();
  }

  async createExportJob(
    userId: string,
    request: ExportRequest
  ): Promise<ExportResponse> {
    try {
      // Validate format
      if (!config.export.supportedFormats.includes(request.format)) {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_FORMAT',
            message: `Format ${request.format} is not supported`,
          },
        };
      }

      // Check if user has access to project
      const project = await this.prisma.project.findFirst({
        where: {
          id: request.projectId,
          OR: [
            { ownerId: userId },
            {
              collaborators: {
                some: {
                  userId,
                },
              },
            },
          ],
          deletedAt: null,
        },
      });

      if (!project) {
        return {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found or insufficient permissions',
          },
        };
      }

      // Create export job record
      const exportJob = await this.prisma.exportJob.create({
        data: {
          userId,
          projectId: request.projectId,
          format: request.format,
          status: ExportStatus.QUEUED,
          progress: 0,
          options: request.options as any,
          expiresAt: new Date(Date.now() + config.export.retentionDays * 24 * 60 * 60 * 1000),
        },
      });

      // Start processing in background
      this.processExportJob(exportJob.id).catch(error => {
        logger.error('Export job processing failed', { 
          error, 
          jobId: exportJob.id,
          userId,
          projectId: request.projectId 
        });
      });

      return {
        success: true,
        data: {
          jobId: exportJob.id,
          status: ExportStatus.QUEUED,
          estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes estimate
        },
      };
    } catch (error) {
      logger.error('Error creating export job', { error, userId, request });
      return {
        success: false,
        error: {
          code: 'EXPORT_CREATE_ERROR',
          message: 'Failed to create export job',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getExportJob(jobId: string, userId: string): Promise<ExportJob | null> {
    try {
      const exportJob = await this.prisma.exportJob.findFirst({
        where: {
          id: jobId,
          userId,
        },
      });

      return exportJob as ExportJob | null;
    } catch (error) {
      logger.error('Error fetching export job', { error, jobId, userId });
      return null;
    }
  }

  async listExportJobs(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ jobs: ExportJob[]; total: number }> {
    try {
      const [jobs, total] = await Promise.all([
        this.prisma.exportJob.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.exportJob.count({
          where: { userId },
        }),
      ]);

      return {
        jobs: jobs as ExportJob[],
        total,
      };
    } catch (error) {
      logger.error('Error listing export jobs', { error, userId });
      return { jobs: [], total: 0 };
    }
  }

  async cancelExportJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.prisma.exportJob.updateMany({
        where: {
          id: jobId,
          userId,
          status: { in: [ExportStatus.QUEUED, ExportStatus.PROCESSING] },
        },
        data: {
          status: ExportStatus.CANCELED,
        },
      });

      return result.count > 0;
    } catch (error) {
      logger.error('Error canceling export job', { error, jobId, userId });
      return false;
    }
  }

  private async processExportJob(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.PROCESSING,
          startedAt: new Date(),
          progress: 10,
        },
      });

      // Get job details
      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Export job not found');
      }

      // Check if job was canceled
      if (job.status === ExportStatus.CANCELED) {
        return;
      }

      logger.info('Starting export job processing', { jobId, format: job.format });

      // Collect project data
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 30 },
      });

      const projectData = await this.dataCollector.collectProjectData(
        job.projectId,
        job.userId,
        job.options as any
      );

      // Generate export file
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 60 },
      });

      const fileOutput = await this.generateExportFile(
        job.format as ExportFormat,
        projectData,
        job.options as any
      );

      // Upload to storage
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 80 },
      });

      const fileUrl = await this.storageManager.uploadFile(
        fileOutput,
        `exports/${job.userId}/${jobId}/${fileOutput.filename}`
      );

      // Update job as completed
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.COMPLETED,
          progress: 100,
          fileUrl,
          fileSize: fileOutput.size,
          completedAt: new Date(),
        },
      });

      logger.info('Export job completed successfully', { jobId, fileUrl });
    } catch (error) {
      logger.error('Export job processing failed', { error, jobId });

      // Update job as failed
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(updateError => {
        logger.error('Failed to update job status', { updateError, jobId });
      });
    }
  }

  private async generateExportFile(
    format: ExportFormat,
    projectData: any,
    options: any
  ): Promise<FileOutput> {
    switch (format) {
      case ExportFormat.MARKDOWN:
        const markdownExporter = new MarkdownExporter(projectData, options);
        return await markdownExporter.export();

      case ExportFormat.PDF:
        const pdfExporter = new PDFExporter(projectData, options);
        return await pdfExporter.export();

      case ExportFormat.EPUB:
        const epubExporter = new EPubExporter(projectData, options);
        return await epubExporter.export();

      case ExportFormat.HTML:
        // Convert markdown to HTML
        const htmlExporter = new MarkdownExporter(projectData, options);
        const markdownOutput = await htmlExporter.export();
        // TODO: Convert markdown to HTML
        return {
          ...markdownOutput,
          filename: markdownOutput.filename.replace('.md', '.html'),
          mimeType: 'text/html',
        };

      case ExportFormat.TXT:
        // Plain text version
        const txtExporter = new MarkdownExporter(projectData, {
          ...options,
          includeMetadata: false,
          includeTableOfContents: false,
        });
        const txtOutput = await txtExporter.export();
        // TODO: Strip markdown formatting
        return {
          ...txtOutput,
          filename: txtOutput.filename.replace('.md', '.txt'),
          mimeType: 'text/plain',
        };

      case ExportFormat.JSON:
        // Export raw data as JSON
        const jsonData = {
          metadata: {
            title: projectData.project.title,
            author: projectData.project.owner.displayName,
            exportedAt: new Date().toISOString(),
          },
          project: projectData.project,
          books: projectData.books,
          characters: projectData.characters,
          locations: projectData.locations,
          cultures: projectData.cultures,
          languages: projectData.languages,
          economies: projectData.economies,
          timelines: projectData.timelines,
        };

        const jsonContent = JSON.stringify(jsonData, null, 2);
        const jsonBuffer = Buffer.from(jsonContent, 'utf8');
        const jsonFilename = options.filename || 
          `${projectData.project.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;

        return {
          buffer: jsonBuffer,
          filename: jsonFilename,
          mimeType: 'application/json',
          size: jsonBuffer.length,
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Cleanup expired export jobs
  async cleanupExpiredJobs(): Promise<void> {
    try {
      const expiredJobs = await this.prisma.exportJob.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          status: ExportStatus.COMPLETED,
        },
      });

      for (const job of expiredJobs) {
        try {
          // Delete file from storage
          if (job.fileUrl) {
            await this.storageManager.deleteFile(job.fileUrl);
          }

          // Update job status
          await this.prisma.exportJob.update({
            where: { id: job.id },
            data: {
              status: ExportStatus.EXPIRED,
              fileUrl: null,
            },
          });

          logger.info('Cleaned up expired export job', { jobId: job.id });
        } catch (error) {
          logger.error('Error cleaning up export job', { error, jobId: job.id });
        }
      }

      logger.info(`Cleaned up ${expiredJobs.length} expired export jobs`);
    } catch (error) {
      logger.error('Error during export job cleanup', { error });
    }
  }
}