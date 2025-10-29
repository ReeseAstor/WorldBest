import { ExportFormat, ExportOptions, ProjectContent, ExportTemplate } from '../types/export.types.js';
import { createWriteStream, createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import mimeTypes from 'mime-types';

// Format-specific processors
import { PDFProcessor } from './processors/pdf-processor.js';
import { EPUBProcessor } from './processors/epub-processor.js';
import { DOCXProcessor } from './processors/docx-processor.js';
import { HTMLProcessor } from './processors/html-processor.js';
import { JSONProcessor } from './processors/json-processor.js';
import { MarkdownProcessor } from './processors/markdown-processor.js';
import { TXTProcessor } from './processors/txt-processor.js';

export class ExportService {
  private processors: Map<ExportFormat, any>;
  private outputDir: string;
  private templateDir: string;

  constructor() {
    this.outputDir = process.env.EXPORT_OUTPUT_DIR || './exports';
    this.templateDir = process.env.EXPORT_TEMPLATE_DIR || './templates';
    
    this.processors = new Map([
      [ExportFormat.PDF, new PDFProcessor()],
      [ExportFormat.EPUB, new EPUBProcessor()],
      [ExportFormat.DOCX, new DOCXProcessor()],
      [ExportFormat.HTML, new HTMLProcessor()],
      [ExportFormat.JSON, new JSONProcessor()],
      [ExportFormat.MARKDOWN, new MarkdownProcessor()],
      [ExportFormat.TXT, new TXTProcessor()]
    ]);

    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.templateDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'temp'), { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async exportProject(
    content: ProjectContent,
    format: ExportFormat,
    options: ExportOptions = {},
    template?: ExportTemplate
  ): Promise<{ filePath: string; fileSize: number; mimeType: string }> {
    const processor = this.processors.get(format);
    if (!processor) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const filename = this.generateFilename(content.title, format);
    const filePath = path.join(this.outputDir, filename);

    // Apply template if provided
    const processedContent = template 
      ? await this.applyTemplate(content, template)
      : content;

    // Process the export
    const result = await processor.process(processedContent, options, filePath);

    // Get file stats
    const stats = await fs.stat(result.filePath);
    const mimeType = mimeTypes.lookup(result.filePath) || 'application/octet-stream';

    return {
      filePath: result.filePath,
      fileSize: stats.size,
      mimeType
    };
  }

  async batchExport(
    contents: ProjectContent[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<{ archivePath: string; fileSize: number; results: any[] }> {
    const batchId = uuidv4();
    const tempDir = path.join(this.outputDir, 'temp', batchId);
    await fs.mkdir(tempDir, { recursive: true });

    const results = [];
    
    // Process each project
    for (const content of contents) {
      try {
        const result = await this.exportProject(content, format, options);
        const tempPath = path.join(tempDir, path.basename(result.filePath));
        
        // Copy to temp directory
        await fs.copyFile(result.filePath, tempPath);
        
        results.push({
          projectId: content.id,
          success: true,
          filename: path.basename(result.filePath),
          fileSize: result.fileSize
        });
      } catch (error) {
        results.push({
          projectId: content.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Create archive
    const archivePath = path.join(this.outputDir, `batch_export_${batchId}.zip`);
    await this.createArchive(tempDir, archivePath);

    // Get archive stats
    const stats = await fs.stat(archivePath);

    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      archivePath,
      fileSize: stats.size,
      results
    };
  }

  async previewExport(
    content: ProjectContent,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<{ previewPath: string; pages?: number }> {
    const processor = this.processors.get(format);
    if (!processor || !processor.generatePreview) {
      throw new Error(`Preview not supported for format: ${format}`);
    }

    const previewFilename = `preview_${uuidv4()}.${format === ExportFormat.PDF ? 'pdf' : 'html'}`;
    const previewPath = path.join(this.outputDir, 'temp', previewFilename);

    const result = await processor.generatePreview(content, options, previewPath);

    return {
      previewPath: result.filePath,
      pages: result.pages
    };
  }

  async validateContent(content: ProjectContent): Promise<{
    isValid: boolean;
    issues: Array<{ type: string; message: string; location?: string }>;
  }> {
    const issues = [];

    // Basic validation
    if (!content.title || content.title.trim().length === 0) {
      issues.push({
        type: 'error',
        message: 'Project title is required',
        location: 'title'
      });
    }

    if (!content.chapters || content.chapters.length === 0) {
      issues.push({
        type: 'error',
        message: 'Project must have at least one chapter',
        location: 'chapters'
      });
    }

    // Chapter validation
    content.chapters?.forEach((chapter, index) => {
      if (!chapter.title || chapter.title.trim().length === 0) {
        issues.push({
          type: 'warning',
          message: `Chapter ${index + 1} is missing a title`,
          location: `chapters[${index}].title`
        });
      }

      if (!chapter.content || chapter.content.trim().length === 0) {
        issues.push({
          type: 'warning',
          message: `Chapter ${index + 1} has no content`,
          location: `chapters[${index}].content`
        });
      }

      // Check for extremely long chapters
      if (chapter.content && chapter.content.length > 100000) {
        issues.push({
          type: 'info',
          message: `Chapter ${index + 1} is very long (${chapter.content.length} characters)`,
          location: `chapters[${index}].content`
        });
      }
    });

    return {
      isValid: !issues.some(issue => issue.type === 'error'),
      issues
    };
  }

  async getExportStats(): Promise<{
    totalExports: number;
    formatBreakdown: Record<ExportFormat, number>;
    averageFileSize: number;
    popularOptions: Record<string, number>;
  }> {
    // This would typically query a database
    // For now, return mock data
    return {
      totalExports: 0,
      formatBreakdown: Object.values(ExportFormat).reduce((acc, format) => {
        acc[format] = 0;
        return acc;
      }, {} as Record<ExportFormat, number>),
      averageFileSize: 0,
      popularOptions: {}
    };
  }

  private generateFilename(title: string, format: ExportFormat): string {
    const sanitized = title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = this.getFileExtension(format);
    
    return `${sanitized}_${timestamp}.${extension}`;
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

  private async applyTemplate(
    content: ProjectContent,
    template: ExportTemplate
  ): Promise<ProjectContent> {
    // This would implement template processing
    // For now, return content as-is
    return content;
  }

  private async createArchive(sourceDir: string, archivePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to cleanup file:', error);
    }
  }

  async getFileStream(filePath: string): Promise<NodeJS.ReadableStream> {
    return createReadStream(filePath);
  }
}