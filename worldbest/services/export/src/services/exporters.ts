import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import EpubGen from 'epub-gen';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import archiver from 'archiver';
import { PrismaClient } from '@worldbest/database';
import { logger } from '../utils/logger';
import { config } from '../config';

const prisma = PrismaClient.getInstance();
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return '';
  },
});

export interface ExportOptions {
  format: 'epub' | 'pdf' | 'docx' | 'html' | 'markdown' | 'json';
  projectId: string;
  bookIds?: string[];
  chapterIds?: string[];
  includeMetadata?: boolean;
  includeImages?: boolean;
  redactSensitive?: boolean;
  customTitle?: string;
  customAuthor?: string;
  customCover?: string;
  pageSize?: 'A4' | 'A5' | 'Letter';
  fontSize?: number;
  lineSpacing?: number;
  margin?: string;
}

export interface ExportResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  progress?: number;
}

export class ExportService {
  static async createExportJob(
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Validate format
      if (!config.export.formats[options.format]?.enabled) {
        throw new Error(`Export format ${options.format} is not enabled`);
      }

      // Check user's export limits
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscriptions: { where: { status: 'active' } } },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create export job
      const job = await prisma.exportJob.create({
        data: {
          userId,
          projectId: options.projectId,
          format: options.format,
          status: 'queued',
          progress: 0,
          options: options as any,
        },
      });

      // Queue the export job
      await this.queueExportJob(job.id);

      return {
        jobId: job.id,
        status: 'queued',
        progress: 0,
      };
    } catch (error) {
      logger.error('Error creating export job:', error);
      throw error;
    }
  }

  static async queueExportJob(jobId: string) {
    // In a real implementation, this would queue the job in Redis or a job queue
    // For now, we'll process it immediately
    setImmediate(() => this.processExportJob(jobId));
  }

  static async processExportJob(jobId: string) {
    try {
      const job = await prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Export job not found');
      }

      // Update status to processing
      await prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'processing', progress: 10 },
      });

      // Get project data
      const project = await prisma.project.findUnique({
        where: { id: job.projectId },
        include: {
          books: {
            where: job.options.bookIds ? { id: { in: job.options.bookIds } } : {},
            include: {
              chapters: {
                where: job.options.chapterIds ? { id: { in: job.options.chapterIds } } : {},
                include: {
                  scenes: {
                    include: {
                      textVersions: {
                        where: { id: { not: null } },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                      },
                    },
                    orderBy: { createdAt: 'asc' },
                  },
                },
                orderBy: { number: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
          characters: true,
          locations: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      await prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 30 },
      });

      // Generate export based on format
      let filePath: string;
      let fileSize: number;

      switch (job.format) {
        case 'epub':
          ({ filePath, fileSize } = await this.exportToEpub(project, job.options));
          break;
        case 'pdf':
          ({ filePath, fileSize } = await this.exportToPdf(project, job.options));
          break;
        case 'docx':
          ({ filePath, fileSize } = await this.exportToDocx(project, job.options));
          break;
        case 'html':
          ({ filePath, fileSize } = await this.exportToHtml(project, job.options));
          break;
        case 'markdown':
          ({ filePath, fileSize } = await this.exportToMarkdown(project, job.options));
          break;
        case 'json':
          ({ filePath, fileSize } = await this.exportToJson(project, job.options));
          break;
        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      await prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 80 },
      });

      // Upload file to storage
      const fileUrl = await this.uploadFile(filePath, jobId, job.format);

      // Update job as completed
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          fileUrl,
          fileSize,
          completedAt: new Date(),
        },
      });

      // Clean up temporary file
      await fs.unlink(filePath);

      logger.info('Export job completed', {
        jobId,
        format: job.format,
        fileSize,
        fileUrl,
      });
    } catch (error) {
      logger.error('Error processing export job:', error);
      
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  static async exportToEpub(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const content = await this.generateBookContent(project, options);
    
    const epubOptions = {
      title: options.customTitle || project.title,
      author: options.customAuthor || project.owner?.displayName || 'Unknown Author',
      content: content.chapters,
      output: path.join(tempDir, 'book.epub'),
      ...(options.customCover && { cover: options.customCover }),
    };

    await new Promise((resolve, reject) => {
      new EpubGen(epubOptions, epubOptions.output)
        .promise
        .then(resolve)
        .catch(reject);
    });

    const stats = await fs.stat(epubOptions.output);
    return {
      filePath: epubOptions.output,
      fileSize: stats.size,
    };
  }

  static async exportToPdf(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const htmlContent = await this.generateHtmlContent(project, options);
    const htmlPath = path.join(tempDir, 'book.html');
    await fs.writeFile(htmlPath, htmlContent);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfOptions = {
      path: path.join(tempDir, 'book.pdf'),
      format: options.pageSize || 'A4',
      margin: {
        top: options.margin || '1in',
        right: options.margin || '1in',
        bottom: options.margin || '1in',
        left: options.margin || '1in',
      },
      printBackground: true,
    };

    await page.pdf(pdfOptions);
    await browser.close();

    const stats = await fs.stat(pdfOptions.path);
    return {
      filePath: pdfOptions.path,
      fileSize: stats.size,
    };
  }

  static async exportToDocx(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const content = await this.generateBookContent(project, options);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: options.customTitle || project.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `By ${options.customAuthor || project.owner?.displayName || 'Unknown Author'}`,
          }),
          new Paragraph({ text: '' }),
          ...content.chapters.flatMap((chapter: any) => [
            new Paragraph({
              text: chapter.title,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: chapter.content.split('\n').map((line: string) => 
                new TextRun({ text: line, break: 1 })
              ),
            }),
            new Paragraph({ text: '' }),
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filePath = path.join(tempDir, 'book.docx');
    await fs.writeFile(filePath, buffer);

    return {
      filePath,
      fileSize: buffer.length,
    };
  }

  static async exportToHtml(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const htmlContent = await this.generateHtmlContent(project, options);
    const filePath = path.join(tempDir, 'book.html');
    await fs.writeFile(filePath, htmlContent);

    const stats = await fs.stat(filePath);
    return {
      filePath,
      fileSize: stats.size,
    };
  }

  static async exportToMarkdown(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const content = await this.generateBookContent(project, options);
    
    let markdown = `# ${options.customTitle || project.title}\n\n`;
    markdown += `**By ${options.customAuthor || project.owner?.displayName || 'Unknown Author'}**\n\n`;
    
    if (project.synopsis) {
      markdown += `## Synopsis\n\n${project.synopsis}\n\n`;
    }

    content.chapters.forEach((chapter: any) => {
      markdown += `## ${chapter.title}\n\n`;
      markdown += chapter.content + '\n\n';
    });

    const filePath = path.join(tempDir, 'book.md');
    await fs.writeFile(filePath, markdown);

    const stats = await fs.stat(filePath);
    return {
      filePath,
      fileSize: stats.size,
    };
  }

  static async exportToJson(project: any, options: ExportOptions) {
    const tempDir = path.join(config.export.tempDir, uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    const exportData = {
      metadata: {
        title: project.title,
        author: project.owner?.displayName || 'Unknown Author',
        synopsis: project.synopsis,
        genre: project.genre,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      project: {
        id: project.id,
        title: project.title,
        synopsis: project.synopsis,
        genre: project.genre,
        defaultLanguage: project.defaultLanguage,
        timePeriod: project.timePeriod,
        targetAudience: project.targetAudience,
        contentRating: project.contentRating,
      },
      books: project.books.map((book: any) => ({
        id: book.id,
        title: book.title,
        order: book.order,
        blurb: book.blurb,
        targetWordCount: book.targetWordCount,
        status: book.status,
        chapters: book.chapters.map((chapter: any) => ({
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          summary: chapter.summary,
          targetWordCount: chapter.targetWordCount,
          status: chapter.status,
          scenes: chapter.scenes.map((scene: any) => ({
            id: scene.id,
            title: scene.title,
            content: scene.textVersions[0]?.content || '',
            wordCount: scene.textVersions[0]?.wordCount || 0,
            location: scene.location?.name,
            povCharacter: scene.povCharacter?.name,
            mood: scene.mood,
            conflict: scene.conflict,
            resolution: scene.resolution,
          })),
        })),
      })),
      characters: project.characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        aliases: char.aliases,
        age: char.age,
        gender: char.gender,
        description: char.appearanceDesc,
        backstory: char.backstory,
        traits: char.coreTraits,
        flaws: char.flaws,
        strengths: char.strengths,
        weaknesses: char.weaknesses,
      })),
      locations: project.locations.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        region: loc.region,
        description: loc.description,
        terrain: loc.terrain,
        climate: loc.climate,
        atmosphere: loc.atmosphere,
      })),
    };

    const filePath = path.join(tempDir, 'book.json');
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    const stats = await fs.stat(filePath);
    return {
      filePath,
      fileSize: stats.size,
    };
  }

  static async generateBookContent(project: any, options: ExportOptions) {
    const chapters: any[] = [];

    for (const book of project.books) {
      for (const chapter of book.chapters) {
        let content = '';
        
        for (const scene of chapter.scenes) {
          if (scene.textVersions.length > 0) {
            content += scene.textVersions[0].content + '\n\n';
          }
        }

        chapters.push({
          title: chapter.title,
          content: content.trim(),
        });
      }
    }

    return { chapters };
  }

  static async generateHtmlContent(project: any, options: ExportOptions) {
    const content = await this.generateBookContent(project, options);
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.customTitle || project.title}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .chapter { page-break-before: always; }
        .chapter:first-child { page-break-before: avoid; }
        p { margin-bottom: 1em; text-align: justify; }
    </style>
</head>
<body>
    <h1>${options.customTitle || project.title}</h1>
    <p><strong>By ${options.customAuthor || project.owner?.displayName || 'Unknown Author'}</strong></p>
`;

    if (project.synopsis) {
      html += `<p><em>${project.synopsis}</em></p>`;
    }

    content.chapters.forEach((chapter: any, index: number) => {
      html += `
    <div class="chapter">
        <h2>${chapter.title}</h2>
        <div>${chapter.content.replace(/\n/g, '</p><p>')}</div>
    </div>`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  static async uploadFile(filePath: string, jobId: string, format: string): Promise<string> {
    // In a real implementation, this would upload to MinIO or S3
    // For now, we'll return a placeholder URL
    const fileName = `export-${jobId}.${format}`;
    return `https://storage.worldbest.ai/exports/${fileName}`;
  }
}