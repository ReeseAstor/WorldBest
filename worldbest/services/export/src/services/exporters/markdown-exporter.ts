import { BaseExporter } from './base-exporter';
import { FileOutput } from '../../types';

export class MarkdownExporter extends BaseExporter {
  async export(): Promise<FileOutput> {
    let content = '';
    
    // Add cover page
    if (this.options.includeCoverPage) {
      content += this.generateCoverPage() + '\n\n';
    }
    
    // Add table of contents
    if (this.options.includeTableOfContents) {
      content += this.generateTableOfContents() + '\n\n';
    }
    
    // Add main content
    content += this.generateMainContent();
    
    // Add appendices
    content += this.generateAppendices();
    
    const buffer = Buffer.from(content, 'utf8');
    const filename = this.options.filename || this.generateFilename('md');
    
    return {
      buffer,
      filename,
      mimeType: 'text/markdown',
      size: buffer.length,
    };
  }
  
  private generateMainContent(): string {
    let content = '';
    
    this.projectData.books.forEach((bookData, bookIndex) => {
      // Book title
      content += `# ${bookData.book.title}\n\n`;
      
      if (bookData.book.blurb) {
        content += `*${bookData.book.blurb}*\n\n`;
      }
      
      bookData.chapters.forEach((chapterData, chapterIndex) => {
        // Chapter break
        if (this.options.chapterBreaks && chapterIndex > 0) {
          content += '---\n\n';
        }
        
        // Chapter title
        content += `## Chapter ${chapterData.chapter.number}: ${chapterData.chapter.title}\n\n`;
        
        if (chapterData.chapter.summary) {
          content += `*${chapterData.chapter.summary}*\n\n`;
        }
        
        chapterData.scenes.forEach((sceneData, sceneIndex) => {
          // Scene break
          if (this.options.sceneBreaks && sceneIndex > 0) {
            content += '\n* * *\n\n';
          }
          
          // Scene title (optional, as a comment)
          if (this.options.includeMetadata && sceneData.scene.title) {
            content += `<!-- Scene: ${sceneData.scene.title} -->\n\n`;
          }
          
          // Scene content
          if (sceneData.textVersions.length > 0) {
            const sceneContent = this.formatText(sceneData.textVersions[0].content);
            content += sceneContent + '\n\n';
          }
        });
      });
      
      // Book break
      if (bookIndex < this.projectData.books.length - 1) {
        content += '\n\n---\n\n';
      }
    });
    
    return content;
  }
  
  private generateAppendices(): string {
    let appendices = '';
    
    // Character profiles
    if (this.options.includeCharacterProfiles && this.projectData.characters.length > 0) {
      appendices += '\n\n# Appendix A: Character Profiles\n\n';
      
      this.projectData.characters.forEach(character => {
        appendices += `## ${character.name}\n\n`;
        
        if (character.aliases?.length) {
          appendices += `**Aliases:** ${character.aliases.join(', ')}\n\n`;
        }
        
        if (character.age) {
          appendices += `**Age:** ${character.age}\n\n`;
        }
        
        if (character.gender) {
          appendices += `**Gender:** ${character.gender}\n\n`;
        }
        
        if (character.backstory) {
          appendices += `**Backstory:** ${character.backstory}\n\n`;
        }
        
        if (character.coreTraits?.length) {
          appendices += `**Core Traits:** ${character.coreTraits.join(', ')}\n\n`;
        }
        
        if (character.relationships?.length) {
          appendices += `**Relationships:**\n`;
          character.relationships.forEach((rel: any) => {
            appendices += `- ${rel.relatedChar.name} (${rel.relationshipType})\n`;
          });
          appendices += '\n';
        }
        
        appendices += '---\n\n';
      });
    }
    
    // Worldbuilding
    if (this.options.includeWorldbuilding) {
      // Locations
      if (this.projectData.locations.length > 0) {
        appendices += '\n\n# Appendix B: Locations\n\n';
        
        this.projectData.locations.forEach(location => {
          appendices += `## ${location.name}\n\n`;
          
          if (location.region) {
            appendices += `**Region:** ${location.region}\n\n`;
          }
          
          if (location.description) {
            appendices += `${location.description}\n\n`;
          }
          
          if (location.terrain) {
            appendices += `**Terrain:** ${location.terrain}\n\n`;
          }
          
          if (location.climate) {
            appendices += `**Climate:** ${location.climate}\n\n`;
          }
          
          appendices += '---\n\n';
        });
      }
      
      // Cultures
      if (this.projectData.cultures.length > 0) {
        appendices += '\n\n# Appendix C: Cultures\n\n';
        
        this.projectData.cultures.forEach(culture => {
          appendices += `## ${culture.name}\n\n`;
          
          if (culture.government) {
            appendices += `**Government:** ${culture.government}\n\n`;
          }
          
          if (culture.religion) {
            appendices += `**Religion:** ${culture.religion}\n\n`;
          }
          
          if (culture.values?.length) {
            appendices += `**Values:** ${culture.values.join(', ')}\n\n`;
          }
          
          if (culture.norms?.length) {
            appendices += `**Social Norms:** ${culture.norms.join(', ')}\n\n`;
          }
          
          if (culture.history) {
            appendices += `**History:** ${culture.history}\n\n`;
          }
          
          appendices += '---\n\n';
        });
      }
    }
    
    // Timeline
    if (this.options.includeTimeline && this.projectData.timelines.length > 0) {
      appendices += '\n\n# Appendix D: Timeline\n\n';
      
      this.projectData.timelines.forEach(timeline => {
        appendices += `## ${timeline.name}\n\n`;
        
        if (timeline.events?.length) {
          timeline.events.forEach((event: any) => {
            appendices += `### ${event.date}: ${event.title}\n\n`;
            appendices += `${event.description}\n\n`;
          });
        }
        
        appendices += '---\n\n';
      });
    }
    
    return appendices;
  }
}