import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import { promises as fs } from 'fs';

export class MarkdownProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const markdown = this.generateMarkdown(content, options);
    await fs.writeFile(outputPath, markdown, 'utf8');
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

  private generateMarkdown(content: ProjectContent, options: ExportOptions): string {
    const frontMatter = this.generateFrontMatter(content, options);
    const toc = options.includeTOC ? this.generateTOC(content.chapters) : '';
    const chapters = content.chapters.map(chapter => this.generateChapter(chapter, options)).join('\n\n---\n\n');

    return [frontMatter, toc, chapters].filter(Boolean).join('\n\n');
  }

  private generateFrontMatter(content: ProjectContent, options: ExportOptions): string {
    const metadata = {
      title: content.title,
      author: content.author,
      description: content.description,
      language: content.settings.language || 'en',
      genre: content.settings.genre,
      created: new Date().toISOString(),
      'word-count': this.calculateTotalWords(content.chapters),
      chapters: content.chapters.length,
      ...content.metadata
    };

    const frontMatterLines = Object.entries(metadata)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${this.formatYamlValue(value)}`);

    return `---\n${frontMatterLines.join('\n')}\n---`;
  }

  private generateTOC(chapters: any[]): string {
    const tocItems = chapters.map((chapter, index) => {
      const anchor = this.createAnchor(chapter.title);
      return `${index + 1}. [${chapter.title}](#${anchor})`;
    });

    return `## Table of Contents\n\n${tocItems.join('\n')}`;
  }

  private generateChapter(chapter: any, options: ExportOptions): string {
    const parts = [];
    
    // Chapter title
    parts.push(`# ${chapter.title}`);

    // Chapter metadata
    if (options.includeMetadata && chapter.metadata) {
      parts.push(this.generateChapterMetadata(chapter.metadata));
    }

    // Chapter content
    const content = this.formatContent(chapter.content, options);
    parts.push(content);

    // Chapter statistics
    if (options.includeMetadata) {
      parts.push(this.generateChapterStats(chapter));
    }

    return parts.join('\n\n');
  }

  private generateChapterMetadata(metadata: Record<string, any>): string {
    const metadataLines = Object.entries(metadata)
      .map(([key, value]) => `- **${key}**: ${value}`)
      .join('\n');

    return `> **Chapter Information**
>
${metadataLines.split('
').map(line => `> ${line}`).join('
')}`;
  }

  private generateChapterStats(chapter: any): string {
    const wordCount = chapter.wordCount || this.countWords(chapter.content);
    const charCount = chapter.content.length;
    const paragraphs = this.countParagraphs(chapter.content);
    const readingTime = Math.ceil(wordCount / 200); // minutes

    return `---\n*Chapter Statistics: ${wordCount} words, ${charCount} characters, ${paragraphs} paragraphs, ~${readingTime} min read*`;
  }

  private formatContent(content: string, options: ExportOptions): string {
    let formatted = content;

    // Ensure proper paragraph separation
    formatted = formatted
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .join('\n\n');

    // Convert HTML to Markdown if present
    formatted = this.convertHtmlToMarkdown(formatted);

    // Apply formatting enhancements
    if (options.includeComments) {
      formatted = this.preserveComments(formatted);
    }

    return formatted;
  }

  private convertHtmlToMarkdown(content: string): string {
    return content
      // Convert headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1')
      
      // Convert emphasis
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      
      // Convert links
      .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      
      // Convert images
      .replace(/<img\s+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<img\s+src="([^"]*)"[^>]*>/gi, '![]($1)')
      
      // Convert lists
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1').trim();
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1`).trim();
      })
      
      // Convert blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
        return content.split('\n').map(line => `> ${line.trim()}`).join('\n');
      })
      
      // Convert code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```')
      
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private preserveComments(content: string): string {
    // Convert HTML comments to Markdown comments
    return content.replace(/<!--\s*(.*?)\s*-->/gs, (match, comment) => {
      return `[//]: # (${comment.trim()})`;
    });
  }

  private formatYamlValue(value: any): string {
    if (typeof value === 'string') {
      // Escape special YAML characters and wrap in quotes if necessary
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatYamlValue(v)).join(', ')}]`;
    }
    return String(value);
  }

  private createAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private calculateTotalWords(chapters: any[]): number {
    return chapters.reduce((total, chapter) => {
      return total + (chapter.wordCount || this.countWords(chapter.content));
    }, 0);
  }

  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  private countParagraphs(text: string): number {
    return text.split('\n\n').filter(p => p.trim().length > 0).length;
  }
}