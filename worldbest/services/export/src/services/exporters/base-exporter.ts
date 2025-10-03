import { ProjectData, ExportOptions, FileOutput } from '../../types';

export abstract class BaseExporter {
  protected projectData: ProjectData;
  protected options: ExportOptions;

  constructor(projectData: ProjectData, options: ExportOptions) {
    this.projectData = projectData;
    this.options = options;
  }

  abstract export(): Promise<FileOutput>;

  protected generateFilename(extension: string): string {
    const projectTitle = this.projectData.project.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    const timestamp = new Date().toISOString().split('T')[0];
    return `${projectTitle}-${timestamp}.${extension}`;
  }

  protected processPlaceholders(content: string): string {
    if (!this.options.includePlaceholders || this.options.redactionMode === 'remove') {
      // Remove placeholder markers
      return content.replace(/\[PLACEHOLDER:.*?\]/g, '');
    }
    
    if (this.options.redactionMode === 'placeholder') {
      // Replace with generic placeholders
      return content.replace(/\[PLACEHOLDER:.*?\]/g, '[CONTENT REDACTED]');
    }
    
    // Keep placeholders as-is
    return content;
  }

  protected formatText(text: string): string {
    if (!text) return '';
    
    // Basic text cleanup
    let formatted = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
    
    // Process placeholders
    formatted = this.processPlaceholders(formatted);
    
    return formatted;
  }

  protected generateTableOfContents(): string {
    if (!this.options.includeTableOfContents) return '';
    
    let toc = '# Table of Contents\n\n';
    
    this.projectData.books.forEach((bookData, bookIndex) => {
      toc += `## ${bookData.book.title}\n\n`;
      
      bookData.chapters.forEach((chapterData, chapterIndex) => {
        toc += `  ${chapterData.chapter.number}. ${chapterData.chapter.title}\n`;
      });
      
      toc += '\n';
    });
    
    return toc;
  }

  protected generateMetadata(): Record<string, any> {
    const metadata: Record<string, any> = {
      title: this.projectData.project.title,
      author: this.projectData.project.owner.displayName,
      genre: this.projectData.project.genre,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    
    if (this.projectData.project.synopsis) {
      metadata.description = this.projectData.project.synopsis;
    }
    
    if (this.projectData.project.timePeriod) {
      metadata.timePeriod = this.projectData.project.timePeriod;
    }
    
    if (this.projectData.project.targetAudience) {
      metadata.targetAudience = this.projectData.project.targetAudience;
    }
    
    metadata.statistics = {
      books: this.projectData.books.length,
      chapters: this.projectData.books.reduce((sum, book) => sum + book.chapters.length, 0),
      scenes: this.projectData.books.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.scenes.length, 0), 0
      ),
      characters: this.projectData.characters.length,
      locations: this.projectData.locations.length,
    };
    
    return metadata;
  }

  protected generateCoverPage(): string {
    const metadata = this.generateMetadata();
    
    return `
# ${metadata.title}

**Author:** ${metadata.author}

**Genre:** ${metadata.genre}

${metadata.description ? `**Synopsis:** ${metadata.description}` : ''}

---

*Exported from WorldBest Platform on ${new Date().toLocaleDateString()}*
    `.trim();
  }
}