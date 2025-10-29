import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import EpubGenerator from 'epub-gen';
import path from 'path';
import { promises as fs } from 'fs';

export class EPUBProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const epubOptions = this.buildEpubOptions(content, options);
    const chapters = await this.prepareChapters(content.chapters, options);

    const epub = new EpubGenerator({
      ...epubOptions,
      content: chapters,
      output: outputPath
    });

    await epub.promise;

    return { filePath: outputPath };
  }

  async generatePreview(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    // For preview, generate with limited chapters
    const previewContent = {
      ...content,
      chapters: content.chapters.slice(0, 2)
    };

    return this.process(previewContent, options, outputPath);
  }

  private buildEpubOptions(content: ProjectContent, options: ExportOptions) {
    return {
      title: options.title || content.title,
      author: options.author || content.author,
      description: options.description || content.description,
      language: options.language || content.settings.language || 'en',
      publisher: 'WorldBest Platform',
      publishDate: new Date().toISOString().split('T')[0],
      genre: content.settings.genre || 'Fiction',
      cover: undefined, // Would be set if cover image is provided
      css: this.generateCSS(options),
      fonts: [],
      tocTitle: 'Table of Contents',
      appendChapterTitles: true,
      customOpfTemplatePath: undefined,
      customNcxTocTemplatePath: undefined,
      customHtmlTocTemplatePath: undefined,
      version: 3
    };
  }

  private async prepareChapters(chapters: any[], options: ExportOptions) {
    return chapters.map((chapter, index) => ({
      title: chapter.title,
      data: this.formatChapterContent(chapter, options),
      filename: `chapter-${index + 1}.xhtml`,
      excludeFromToc: false,
      beforeToc: false
    }));
  }

  private formatChapterContent(chapter: any, options: ExportOptions): string {
    let content = chapter.content;

    // Convert basic markdown to HTML
    content = this.convertMarkdownToHTML(content);

    // Add chapter metadata if requested
    if (options.includeMetadata && chapter.metadata) {
      const metadataHTML = this.generateMetadataHTML(chapter.metadata);
      content = metadataHTML + content;
    }

    // Add word count if requested
    if (options.includeMetadata) {
      const wordCount = chapter.wordCount || this.countWords(content);
      content += `<div class="chapter-meta">Word count: ${wordCount}</div>`;
    }

    return `
      <div class="chapter-content">
        ${content}
      </div>
    `;
  }

  private convertMarkdownToHTML(content: string): string {
    return content
      // Convert headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Convert bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Convert line breaks to paragraphs
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  private generateMetadataHTML(metadata: Record<string, any>): string {
    const metadataEntries = Object.entries(metadata)
      .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
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

  private generateCSS(options: ExportOptions): string {
    const fontSize = options.fontSize || 14;
    const fontFamily = options.fontFamily || 'serif';
    const lineHeight = options.lineHeight || 1.6;
    
    let theme = '';
    switch (options.theme) {
      case 'dark':
        theme = `
          body { background-color: #1a1a1a; color: #e0e0e0; }
          .chapter-content { background-color: #1a1a1a; }
        `;
        break;
      case 'sepia':
        theme = `
          body { background-color: #f4f1e8; color: #5c4b37; }
          .chapter-content { background-color: #f4f1e8; }
        `;
        break;
      default:
        theme = `
          body { background-color: #ffffff; color: #333333; }
          .chapter-content { background-color: #ffffff; }
        `;
    }

    return `
      body {
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        margin: 0;
        padding: 0;
        ${theme}
      }
      
      .chapter-content {
        padding: 20px;
        max-width: 100%;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: bold;
      }
      
      h1 {
        font-size: ${fontSize * 1.8}px;
        border-bottom: 2px solid currentColor;
        padding-bottom: 0.3em;
      }
      
      h2 {
        font-size: ${fontSize * 1.5}px;
      }
      
      h3 {
        font-size: ${fontSize * 1.3}px;
      }
      
      p {
        margin-bottom: 1em;
        text-align: justify;
        text-indent: 1.5em;
      }
      
      p:first-child {
        text-indent: 0;
      }
      
      em {
        font-style: italic;
      }
      
      strong {
        font-weight: bold;
      }
      
      .chapter-metadata {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 10px;
        margin-bottom: 20px;
        border-left: 4px solid #007acc;
      }
      
      .chapter-metadata h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: ${fontSize * 1.1}px;
      }
      
      .chapter-metadata dl {
        margin: 0;
      }
      
      .chapter-metadata dt {
        font-weight: bold;
        display: inline;
      }
      
      .chapter-metadata dd {
        display: inline;
        margin-left: 10px;
        margin-right: 20px;
      }
      
      .chapter-meta {
        font-size: ${fontSize * 0.9}px;
        color: #666;
        text-align: right;
        margin-top: 20px;
        padding-top: 10px;
        border-top: 1px solid #ccc;
      }
      
      blockquote {
        margin: 1em 40px;
        padding: 10px 20px;
        background-color: rgba(0, 0, 0, 0.05);
        border-left: 4px solid #ccc;
        font-style: italic;
      }
      
      code {
        font-family: monospace;
        background-color: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
      }
      
      pre {
        background-color: rgba(0, 0, 0, 0.1);
        padding: 10px;
        border-radius: 5px;
        overflow-x: auto;
        font-family: monospace;
      }
      
      ${options.customCSS || ''}
    `;
  }

  private countWords(text: string): number {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }
}