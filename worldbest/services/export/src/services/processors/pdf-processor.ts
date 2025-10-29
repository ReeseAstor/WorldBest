import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import puppeteer, { Page, Browser } from 'puppeteer';
import path from 'path';
import { promises as fs } from 'fs';

export class PDFProcessor {
  private browser: Browser | null = null;

  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string; pages?: number }> {
    const html = await this.generateHTML(content, options);
    const tempHtmlPath = outputPath.replace('.pdf', '.temp.html');
    
    // Write temporary HTML file
    await fs.writeFile(tempHtmlPath, html);

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.goto(`file://${path.resolve(tempHtmlPath)}`, {
        waitUntil: 'networkidle0'
      });

      const pdfOptions = {
        path: outputPath,
        format: options.pageSize || 'A4' as const,
        margin: options.margins || {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        printBackground: true,
        displayHeaderFooter: !!(options.header || options.footer),
        headerTemplate: options.header || '',
        footerTemplate: options.footer || '',
        preferCSSPageSize: false
      };

      await page.pdf(pdfOptions);
      await page.close();

      // Get page count
      const pageCount = await this.getPageCount(outputPath);

      return { filePath: outputPath, pages: pageCount };
    } finally {
      // Cleanup temp HTML file
      await fs.unlink(tempHtmlPath).catch(() => {});
    }
  }

  async generatePreview(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string; pages?: number }> {
    // For preview, generate only first few pages
    const previewContent = {
      ...content,
      chapters: content.chapters.slice(0, 2) // Only first 2 chapters for preview
    };

    return this.process(previewContent, options, outputPath);
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  private async generateHTML(content: ProjectContent, options: ExportOptions): Promise<string> {
    const styles = this.generateCSS(options);
    const toc = options.includeTOC ? this.generateTOC(content.chapters) : '';
    const chaptersHTML = content.chapters
      .map(chapter => this.generateChapterHTML(chapter, options))
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="${options.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="document">
        ${this.generateTitlePage(content, options)}
        ${toc}
        ${chaptersHTML}
    </div>
</body>
</html>`;
  }

  private generateCSS(options: ExportOptions): string {
    const fontSize = options.fontSize || 12;
    const fontFamily = options.fontFamily || 'serif';
    const lineHeight = options.lineHeight || 1.6;

    return `
        @page {
            margin: 1in;
            ${options.pageNumbers ? '@bottom-center { content: counter(page); }' : ''}
        }
        
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize}pt;
            line-height: ${lineHeight};
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .document {
            max-width: 100%;
        }
        
        .title-page {
            text-align: center;
            page-break-after: always;
            padding-top: 30%;
        }
        
        .title {
            font-size: ${fontSize * 2}pt;
            font-weight: bold;
            margin-bottom: 20pt;
        }
        
        .author {
            font-size: ${fontSize * 1.2}pt;
            margin-bottom: 20pt;
        }
        
        .description {
            font-style: italic;
            margin-bottom: 40pt;
        }
        
        .toc {
            page-break-after: always;
        }
        
        .toc h2 {
            text-align: center;
            margin-bottom: 30pt;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10pt;
            border-bottom: 1pt dotted #ccc;
        }
        
        .chapter {
            ${options.chapterBreaks ? 'page-break-before: always;' : ''}
            margin-bottom: 30pt;
        }
        
        .chapter-title {
            font-size: ${fontSize * 1.5}pt;
            font-weight: bold;
            margin-bottom: 20pt;
            border-bottom: 2pt solid #333;
            padding-bottom: 10pt;
        }
        
        .chapter-content {
            text-align: justify;
        }
        
        .chapter-content p {
            margin-bottom: 12pt;
            text-indent: 20pt;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72pt;
            color: rgba(0, 0, 0, 0.1);
            z-index: -1;
            pointer-events: none;
        }
        
        ${options.customCSS || ''}
    `;
  }

  private generateTitlePage(content: ProjectContent, options: ExportOptions): string {
    return `
        <div class="title-page">
            <div class="title">${content.title}</div>
            <div class="author">${content.author}</div>
            ${content.description ? `<div class="description">${content.description}</div>` : ''}
            ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
        </div>
    `;
  }

  private generateTOC(chapters: any[]): string {
    const tocItems = chapters
      .map((chapter, index) => `
        <div class="toc-item">
            <span>Chapter ${index + 1}: ${chapter.title}</span>
            <span>${index + 1}</span>
        </div>
      `)
      .join('');

    return `
        <div class="toc">
            <h2>Table of Contents</h2>
            ${tocItems}
        </div>
    `;
  }

  private generateChapterHTML(chapter: any, options: ExportOptions): string {
    const content = this.formatContent(chapter.content);
    
    return `
        <div class="chapter">
            <h1 class="chapter-title">${chapter.title}</h1>
            <div class="chapter-content">
                ${content}
            </div>
        </div>
    `;
  }

  private formatContent(content: string): string {
    // Convert markdown-like formatting to HTML
    return content
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.trim()}</p>`)
      .join('\n');
  }

  private async getPageCount(pdfPath: string): Promise<number> {
    // This would require a PDF parsing library
    // For now, estimate based on content length
    return 1;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}