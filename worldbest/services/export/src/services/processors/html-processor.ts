import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import { promises as fs } from 'fs';

export class HTMLProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const html = this.generateHTML(content, options);
    await fs.writeFile(outputPath, html, 'utf8');
    return { filePath: outputPath };
  }

  async generatePreview(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const previewContent = {
      ...content,
      chapters: content.chapters.slice(0, 2)
    };
    return this.process(previewContent, options, outputPath);
  }

  private generateHTML(content: ProjectContent, options: ExportOptions): string {
    const css = this.generateCSS(options);
    const toc = options.includeTOC ? this.generateTOC(content.chapters) : '';
    const chapters = content.chapters.map(chapter => this.generateChapter(chapter, options)).join('\n');

    return `
<!DOCTYPE html>
<html lang="${options.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(content.title)}</title>
    <meta name="author" content="${this.escapeHtml(content.author)}">
    ${content.description ? `<meta name="description" content="${this.escapeHtml(content.description)}">` : ''}
    <style>${css}</style>
</head>
<body>
    <div class="document">
        <header class="title-page">
            <h1 class="title">${this.escapeHtml(content.title)}</h1>
            <div class="author">by ${this.escapeHtml(content.author)}</div>
            ${content.description ? `<div class="description">${this.escapeHtml(content.description)}</div>` : ''}
        </header>
        ${toc}
        <main class="content">
            ${chapters}
        </main>
        ${options.footer ? `<footer>${this.escapeHtml(options.footer)}</footer>` : ''}
    </div>
</body>
</html>`;
  }

  private generateCSS(options: ExportOptions): string {
    const fontSize = options.fontSize || 16;
    const fontFamily = options.fontFamily || 'serif';
    const lineHeight = options.lineHeight || 1.6;

    let themeStyles = '';
    switch (options.theme) {
      case 'dark':
        themeStyles = `
          body { background: #1a1a1a; color: #e0e0e0; }
          .chapter { border-bottom: 1px solid #333; }
        `;
        break;
      case 'sepia':
        themeStyles = `
          body { background: #f4f1e8; color: #5c4b37; }
          .chapter { border-bottom: 1px solid #d4c5a8; }
        `;
        break;
      default:
        themeStyles = `
          body { background: #ffffff; color: #333333; }
          .chapter { border-bottom: 1px solid #eee; }
        `;
    }

    return `
      * {
        box-sizing: border-box;
      }

      body {
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        margin: 0;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        ${themeStyles}
      }

      .document {
        margin: 0;
      }

      .title-page {
        text-align: center;
        padding: 60px 0;
        margin-bottom: 40px;
        border-bottom: 2px solid currentColor;
      }

      .title {
        font-size: ${fontSize * 2.5}px;
        font-weight: bold;
        margin: 0 0 20px 0;
        line-height: 1.2;
      }

      .author {
        font-size: ${fontSize * 1.3}px;
        margin-bottom: 20px;
        font-style: italic;
      }

      .description {
        font-size: ${fontSize * 1.1}px;
        margin-top: 30px;
        font-style: italic;
        opacity: 0.8;
      }

      .toc {
        margin: 40px 0;
        padding: 20px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 5px;
      }

      .toc h2 {
        margin: 0 0 20px 0;
        font-size: ${fontSize * 1.5}px;
        text-align: center;
      }

      .toc-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px dotted rgba(0, 0, 0, 0.3);
        text-decoration: none;
        color: inherit;
      }

      .toc-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .chapter {
        margin-bottom: 40px;
        padding-bottom: 20px;
      }

      .chapter-title {
        font-size: ${fontSize * 1.8}px;
        font-weight: bold;
        margin: 0 0 20px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid currentColor;
      }

      .chapter-content p {
        margin-bottom: 1em;
        text-align: justify;
        text-indent: 2em;
      }

      .chapter-content p:first-child {
        text-indent: 0;
      }

      .chapter-content h1,
      .chapter-content h2,
      .chapter-content h3,
      .chapter-content h4,
      .chapter-content h5,
      .chapter-content h6 {
        margin: 1.5em 0 0.5em 0;
        font-weight: bold;
      }

      .chapter-content h1 { font-size: ${fontSize * 1.6}px; }
      .chapter-content h2 { font-size: ${fontSize * 1.4}px; }
      .chapter-content h3 { font-size: ${fontSize * 1.2}px; }

      .chapter-metadata {
        background: rgba(0, 0, 0, 0.05);
        padding: 15px;
        margin-bottom: 20px;
        border-left: 4px solid #007acc;
        border-radius: 3px;
      }

      .chapter-metadata h4 {
        margin: 0 0 10px 0;
        font-size: ${fontSize * 1.1}px;
      }

      .chapter-metadata dl {
        margin: 0;
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 5px 15px;
      }

      .chapter-metadata dt {
        font-weight: bold;
      }

      .chapter-metadata dd {
        margin: 0;
      }

      strong {
        font-weight: bold;
      }

      em {
        font-style: italic;
      }

      blockquote {
        margin: 20px 0;
        padding: 15px 20px;
        background: rgba(0, 0, 0, 0.05);
        border-left: 4px solid #ccc;
        font-style: italic;
      }

      code {
        font-family: 'Courier New', monospace;
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: ${fontSize * 0.9}px;
      }

      pre {
        background: rgba(0, 0, 0, 0.1);
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        font-family: 'Courier New', monospace;
        font-size: ${fontSize * 0.9}px;
      }

      footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid currentColor;
        text-align: center;
        font-size: ${fontSize * 0.9}px;
        opacity: 0.7;
      }

      @media print {
        body {
          font-size: 12pt;
          max-width: none;
          margin: 0;
          padding: 0;
        }

        .title-page {
          page-break-after: always;
        }

        .chapter {
          ${options.chapterBreaks ? 'page-break-before: always;' : ''}
        }

        .toc {
          page-break-after: always;
        }
      }

      ${options.customCSS || ''}
    `;
  }

  private generateTOC(chapters: any[]): string {
    const tocItems = chapters
      .map((chapter, index) => `
        <a href="#chapter-${index + 1}" class="toc-item">
          <span>Chapter ${index + 1}: ${this.escapeHtml(chapter.title)}</span>
          <span>${index + 1}</span>
        </a>
      `)
      .join('');

    return `
      <nav class="toc">
        <h2>Table of Contents</h2>
        ${tocItems}
      </nav>
    `;
  }

  private generateChapter(chapter: any, options: ExportOptions): string {
    const content = this.formatContent(chapter.content);
    const metadata = options.includeMetadata && chapter.metadata 
      ? this.generateMetadata(chapter.metadata) 
      : '';

    return `
      <section class="chapter" id="chapter-${chapter.order || 1}">
        <h2 class="chapter-title">${this.escapeHtml(chapter.title)}</h2>
        ${metadata}
        <div class="chapter-content">
          ${content}
        </div>
      </section>
    `;
  }

  private generateMetadata(metadata: Record<string, any>): string {
    const metadataEntries = Object.entries(metadata)
      .map(([key, value]) => `
        <dt>${this.escapeHtml(key)}</dt>
        <dd>${this.escapeHtml(String(value))}</dd>
      `)
      .join('');

    return `
      <div class="chapter-metadata">
        <h4>Chapter Information</h4>
        <dl>
          ${metadataEntries}
        </dl>
      </div>
    `;
  }

  private formatContent(content: string): string {
    return content
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => this.convertMarkdownToHTML(paragraph))
      .join('\n');
  }

  private convertMarkdownToHTML(text: string): string {
    return `<p>${text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')}</p>`;
  }

  private escapeHtml(text: string): string {
    const div = { innerHTML: '', textContent: text };
    return div.innerHTML || text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}