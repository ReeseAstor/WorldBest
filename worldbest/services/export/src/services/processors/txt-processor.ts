import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import { promises as fs } from 'fs';

export class TXTProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const text = this.generateText(content, options);
    await fs.writeFile(outputPath, text, 'utf8');
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

  private generateText(content: ProjectContent, options: ExportOptions): string {
    const parts = [];
    
    // Title page
    parts.push(this.generateTitlePage(content, options));
    
    // Table of contents
    if (options.includeTOC) {
      parts.push(this.generateTOC(content.chapters));
    }
    
    // Chapters
    content.chapters.forEach(chapter => {
      parts.push(this.generateChapter(chapter, options));
    });
    
    // Footer
    if (options.footer) {
      parts.push(this.generateFooter(options.footer));
    }

    return parts.join('\n\n' + '='.repeat(80) + '\n\n');
  }

  private generateTitlePage(content: ProjectContent, options: ExportOptions): string {
    const lines = [];
    const width = 80;
    
    // Center the title
    const title = content.title.toUpperCase();
    const titlePadding = Math.max(0, Math.floor((width - title.length) / 2));
    lines.push(' '.repeat(titlePadding) + title);
    lines.push('');
    
    // Center the author
    const authorLine = `by ${content.author}`;
    const authorPadding = Math.max(0, Math.floor((width - authorLine.length) / 2));
    lines.push(' '.repeat(authorPadding) + authorLine);
    lines.push('');
    
    // Description
    if (content.description) {
      lines.push('');
      const wrappedDescription = this.wrapText(content.description, width);
      wrappedDescription.forEach(line => {
        const padding = Math.max(0, Math.floor((width - line.length) / 2));
        lines.push(' '.repeat(padding) + line);
      });
    }
    
    // Metadata
    if (options.includeMetadata) {
      lines.push('');
      lines.push('-'.repeat(width));
      lines.push('');
      
      const metadata = [
        `Language: ${content.settings.language || 'Unknown'}`,
        `Genre: ${content.settings.genre || 'Unknown'}`,
        `Chapters: ${content.chapters.length}`,
        `Total Words: ${this.calculateTotalWords(content.chapters)}`,
        `Exported: ${new Date().toLocaleDateString()}`
      ];
      
      metadata.forEach(item => {
        const padding = Math.max(0, Math.floor((width - item.length) / 2));
        lines.push(' '.repeat(padding) + item);
      });
    }
    
    return lines.join('\n');
  }

  private generateTOC(chapters: any[]): string {
    const lines = [];
    const title = 'TABLE OF CONTENTS';
    const width = 80;
    
    // Center the title
    const titlePadding = Math.max(0, Math.floor((width - title.length) / 2));
    lines.push(' '.repeat(titlePadding) + title);
    lines.push('');
    lines.push('-'.repeat(width));
    lines.push('');
    
    chapters.forEach((chapter, index) => {
      const chapterNumber = `Chapter ${index + 1}`;
      const chapterTitle = chapter.title;
      const pageNumber = `${index + 1}`;
      
      // Create a line with dots between title and page number
      const contentLength = chapterNumber.length + chapterTitle.length + pageNumber.length + 4; // +4 for spaces
      const dots = Math.max(3, width - contentLength);
      
      const line = `${chapterNumber}: ${chapterTitle} ${'.'.repeat(dots)} ${pageNumber}`;
      lines.push(line.substring(0, width)); // Ensure it doesn't exceed width
    });
    
    return lines.join('\n');
  }

  private generateChapter(chapter: any, options: ExportOptions): string {
    const lines = [];
    const width = 80;
    
    // Chapter header
    const chapterHeader = `CHAPTER ${chapter.order || 1}: ${chapter.title.toUpperCase()}`;
    lines.push(chapterHeader);
    lines.push('='.repeat(Math.min(chapterHeader.length, width)));
    lines.push('');
    
    // Chapter metadata
    if (options.includeMetadata && chapter.metadata) {
      lines.push('Chapter Information:');
      Object.entries(chapter.metadata).forEach(([key, value]) => {
        lines.push(`  ${key}: ${value}`);
      });
      lines.push('');
      lines.push('-'.repeat(width));
      lines.push('');
    }
    
    // Chapter content
    const content = this.formatContent(chapter.content, options);
    const wrappedContent = this.wrapText(content, width);
    lines.push(...wrappedContent);
    
    // Chapter statistics
    if (options.includeMetadata) {
      lines.push('');
      lines.push('-'.repeat(width));
      lines.push('');
      
      const wordCount = chapter.wordCount || this.countWords(chapter.content);
      const charCount = chapter.content.length;
      const paragraphs = this.countParagraphs(chapter.content);
      const readingTime = Math.ceil(wordCount / 200);
      
      const stats = [
        `Word Count: ${wordCount}`,
        `Character Count: ${charCount}`,
        `Paragraphs: ${paragraphs}`,
        `Estimated Reading Time: ${readingTime} minutes`
      ];
      
      stats.forEach(stat => lines.push(stat));
    }
    
    return lines.join('\n');
  }

  private generateFooter(footerText: string): string {
    const width = 80;
    const lines = ['-'.repeat(width)];
    
    const wrappedFooter = this.wrapText(footerText, width);
    wrappedFooter.forEach(line => {
      const padding = Math.max(0, Math.floor((width - line.length) / 2));
      lines.push(' '.repeat(padding) + line);
    });
    
    return lines.join('\n');
  }

  private formatContent(content: string, options: ExportOptions): string {
    let formatted = content;
    
    // Remove HTML tags
    formatted = this.stripHtml(formatted);
    
    // Convert markdown formatting to plain text equivalents
    formatted = this.convertMarkdownToText(formatted);
    
    // Normalize whitespace
    formatted = formatted
      .replace(/\r\n/g, '\n')  // Convert Windows line endings
      .replace(/\r/g, '\n')    // Convert Mac line endings
      .replace(/\t/g, '    ')  // Convert tabs to spaces
      .replace(/\n{3,}/g, '\n\n'); // Limit multiple line breaks
    
    return formatted.trim();
  }

  private stripHtml(content: string): string {
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
      .replace(/<[^>]*>/g, '')                          // Remove all HTML tags
      .replace(/&lt;/g, '<')                            // Decode entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  private convertMarkdownToText(content: string): string {
    return content
      // Headers - just remove the # symbols
      .replace(/^#{1,6}\s+/gm, '')
      
      // Bold and italic - remove the markup
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
      .replace(/\*(.*?)\*/g, '$1')      // Italic
      .replace(/__(.*?)__/g, '$1')      // Bold (alternative)
      .replace(/_(.*?)_/g, '$1')        // Italic (alternative)
      
      // Links - keep just the text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      
      // Images - keep just the alt text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      
      // Code - remove backticks
      .replace(/`([^`]*)`/g, '$1')
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim();
      })
      
      // Blockquotes - remove > symbols but keep indentation
      .replace(/^>\s*/gm, '    ')
      
      // Lists - convert to simple text with indentation
      .replace(/^[\s]*[-*+]\s+/gm, '  • ')
      .replace(/^[\s]*\d+\.\s+/gm, (match) => {
        const num = match.match(/\d+/)?.[0] || '1';
        return `  ${num}. `;
      })
      
      // Horizontal rules
      .replace(/^[-*_]{3,}$/gm, '-'.repeat(40));
  }

  private wrapText(text: string, width: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n\n');
    
    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) {
        lines.push(''); // Add blank line between paragraphs
      }
      
      const words = paragraph.trim().split(/\s+/);
      let currentLine = '';
      
      words.forEach(word => {
        if (currentLine.length === 0) {
          currentLine = word;
        } else if (currentLine.length + word.length + 1 <= width) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });
      
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    });
    
    return lines;
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