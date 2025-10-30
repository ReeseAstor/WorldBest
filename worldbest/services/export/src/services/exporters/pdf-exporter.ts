import puppeteer from 'puppeteer';
import { BaseExporter } from './base-exporter';
import { FileOutput } from '../../types';
import { config } from '../../config';
import { marked } from 'marked';

export class PDFExporter extends BaseExporter {
  async export(): Promise<FileOutput> {
    // First generate markdown content
    const markdownContent = this.generateMarkdownContent();
    
    // Convert to HTML
    const htmlContent = this.generateHTMLContent(markdownContent);
    
    // Generate PDF using Puppeteer
    const pdfBuffer = await this.generatePDF(htmlContent);
    
    const filename = this.options.filename || this.generateFilename('pdf');
    
    return {
      buffer: pdfBuffer,
      filename,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
    };
  }
  
  private generateMarkdownContent(): string {
    let content = '';
    
    // Add cover page
    if (this.options.includeCoverPage) {
      content += this.generateCoverPage() + '\n\n<div class="page-break"></div>\n\n';
    }
    
    // Add table of contents
    if (this.options.includeTableOfContents) {
      content += this.generateTableOfContents() + '\n\n<div class="page-break"></div>\n\n';
    }
    
    // Add main content
    this.projectData.books.forEach((bookData, bookIndex) => {
      // Book title
      content += `# ${bookData.book.title}\n\n`;
      
      if (bookData.book.blurb) {
        content += `*${bookData.book.blurb}*\n\n`;
      }
      
      bookData.chapters.forEach((chapterData, chapterIndex) => {
        // Chapter break
        if (this.options.chapterBreaks) {
          content += '<div class="chapter-break"></div>\n\n';
        }
        
        // Chapter title
        content += `## Chapter ${chapterData.chapter.number}: ${chapterData.chapter.title}\n\n`;
        
        if (chapterData.chapter.summary) {
          content += `*${chapterData.chapter.summary}*\n\n`;
        }
        
        chapterData.scenes.forEach((sceneData, sceneIndex) => {
          // Scene break
          if (this.options.sceneBreaks && sceneIndex > 0) {
            content += '\n<div class="scene-break">* * *</div>\n\n';
          }
          
          // Scene content
          if (sceneData.textVersions.length > 0) {
            const sceneContent = this.formatText(sceneData.textVersions[0].content);
            content += sceneContent + '\n\n';
          }
        });
      });
    });
    
    return content;
  }
  
  private generateHTMLContent(markdownContent: string): string {
    const htmlBody = marked(markdownContent);
    const pdfOptions = this.options.pdfOptions || {};
    
    const css = `
      <style>
        body {
          font-family: ${pdfOptions.fontFamily || 'Times, "Times New Roman", serif'};
          font-size: ${pdfOptions.fontSize || 12}pt;
          line-height: 1.6;
          color: #333;
          max-width: none;
          margin: 0;
          padding: 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: Arial, sans-serif;
          color: #2c3e50;
          margin-top: 2em;
          margin-bottom: 1em;
        }
        
        h1 {
          font-size: 2.5em;
          text-align: center;
          border-bottom: 3px solid #2c3e50;
          padding-bottom: 0.5em;
        }
        
        h2 {
          font-size: 2em;
          page-break-before: always;
        }
        
        h3 {
          font-size: 1.5em;
        }
        
        p {
          margin-bottom: 1em;
          text-align: justify;
          text-indent: 1.5em;
        }
        
        blockquote {
          border-left: 4px solid #ddd;
          margin: 1em 0;
          padding-left: 1em;
          font-style: italic;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .chapter-break {
          page-break-before: always;
          height: 0;
        }
        
        .scene-break {
          text-align: center;
          margin: 2em 0;
          font-size: 1.2em;
          letter-spacing: 0.5em;
        }
        
        code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        
        pre {
          background-color: #f5f5f5;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        
        @media print {
          body {
            margin: 0;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .chapter-break {
            page-break-before: always;
          }
          
          h2 {
            page-break-before: always;
          }
        }
        
        /* Cover page styles */
        .cover-page {
          text-align: center;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .cover-title {
          font-size: 3em;
          margin-bottom: 0.5em;
        }
        
        .cover-author {
          font-size: 1.5em;
          margin-bottom: 2em;
        }
        
        .cover-details {
          font-size: 1.2em;
          line-height: 2;
        }
      </style>
    `;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${this.projectData.project.title}</title>
          ${css}
        </head>
        <body>
          ${htmlBody}
        </body>
      </html>
    `;
  }
  
  private async generatePDF(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: config.pdf.chromiumPath,
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfOptions = this.options.pdfOptions || {};
      
      const pdfBuffer = await page.pdf({
        format: (pdfOptions.pageSize || config.pdf.format) as any,
        landscape: pdfOptions.orientation === 'landscape',
        margin: {
          top: pdfOptions.margins?.top || config.pdf.margin.top,
          right: pdfOptions.margins?.right || config.pdf.margin.right,
          bottom: pdfOptions.margins?.bottom || config.pdf.margin.bottom,
          left: pdfOptions.margins?.left || config.pdf.margin.left,
        },
        printBackground: true,
        displayHeaderFooter: pdfOptions.headerFooter || false,
        headerTemplate: pdfOptions.headerFooter ? `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            ${this.projectData.project.title}
          </div>
        ` : '',
        footerTemplate: pdfOptions.pageNumbers ? `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        ` : '',
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}