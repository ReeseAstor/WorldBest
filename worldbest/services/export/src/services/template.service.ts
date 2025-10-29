import { ExportTemplate, ExportOptions, ExportFormat } from '../types/export.types.js';
import { promises as fs } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export class TemplateService {
  private templateDir: string;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>;

  constructor() {
    this.templateDir = process.env.EXPORT_TEMPLATE_DIR || './templates';
    this.compiledTemplates = new Map();
    this.initializeTemplates();
  }

  private async initializeTemplates(): Promise<void> {
    try {
      await fs.mkdir(this.templateDir, { recursive: true });
      
      // Register Handlebars helpers
      this.registerHelpers();
      
      // Load default templates
      await this.loadDefaultTemplates();
    } catch (error) {
      console.error('Failed to initialize templates:', error);
    }
  }

  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      
      const d = new Date(date);
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'iso':
          return d.toISOString().split('T')[0];
        default:
          return d.toString();
      }
    });

    // Word count helper
    Handlebars.registerHelper('wordCount', (text: string) => {
      if (!text) return 0;
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    });

    // Truncate text helper
    Handlebars.registerHelper('truncate', (text: string, length: number) => {
      if (!text || text.length <= length) return text;
      return text.substring(0, length) + '...';
    });

    // Conditional helpers
    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifGreater', function(arg1: number, arg2: number, options: any) {
      return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
    });

    // Chapter numbering helper
    Handlebars.registerHelper('chapterNumber', (index: number, format: string) => {
      switch (format) {
        case 'roman':
          return this.toRoman(index + 1);
        case 'word':
          return this.numberToWord(index + 1);
        default:
          return (index + 1).toString();
      }
    });

    // Text formatting helpers
    Handlebars.registerHelper('capitalize', (text: string) => {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    });

    Handlebars.registerHelper('uppercase', (text: string) => {
      return text ? text.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (text: string) => {
      return text ? text.toLowerCase() : '';
    });

    // Reading time helper
    Handlebars.registerHelper('readingTime', (text: string, wpm: number = 200) => {
      if (!text) return 0;
      const words = text.trim().split(/\s+/).length;
      return Math.ceil(words / wpm);
    });

    // JSON helper for debugging
    Handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context, null, 2);
    });
  }

  async getTemplate(templateId: string): Promise<ExportTemplate | null> {
    try {
      const templatePath = path.join(this.templateDir, `${templateId}.json`);
      const templateData = await fs.readFile(templatePath, 'utf8');
      return JSON.parse(templateData);
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      return null;
    }
  }

  async createTemplate(template: Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExportTemplate> {
    const newTemplate: ExportTemplate = {
      ...template,
      id: this.generateTemplateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveTemplate(newTemplate);
    return newTemplate;
  }

  async updateTemplate(templateId: string, updates: Partial<ExportTemplate>): Promise<ExportTemplate | null> {
    const existing = await this.getTemplate(templateId);
    if (!existing) return null;

    const updated: ExportTemplate = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    await this.saveTemplate(updated);
    
    // Clear compiled template cache
    this.compiledTemplates.delete(templateId);
    
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const templatePath = path.join(this.templateDir, `${templateId}.json`);
      await fs.unlink(templatePath);
      
      // Also delete the template file if it exists
      const templateFilePath = path.join(this.templateDir, `${templateId}.hbs`);
      try {
        await fs.unlink(templateFilePath);
      } catch (error) {
        // Template file might not exist, ignore
      }
      
      // Clear from cache
      this.compiledTemplates.delete(templateId);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete template ${templateId}:`, error);
      return false;
    }
  }

  async listTemplates(format?: ExportFormat): Promise<ExportTemplate[]> {
    try {
      const files = await fs.readdir(this.templateDir);
      const templateFiles = files.filter(file => file.endsWith('.json'));
      
      const templates = await Promise.all(
        templateFiles.map(async (file) => {
          try {
            const templateData = await fs.readFile(path.join(this.templateDir, file), 'utf8');
            return JSON.parse(templateData) as ExportTemplate;
          } catch (error) {
            console.error(`Failed to load template ${file}:`, error);
            return null;
          }
        })
      );

      const validTemplates = templates.filter(t => t !== null) as ExportTemplate[];
      
      if (format) {
        return validTemplates.filter(t => t.format === format);
      }
      
      return validTemplates;
    } catch (error) {
      console.error('Failed to list templates:', error);
      return [];
    }
  }

  async applyTemplate(templateId: string, data: any): Promise<string> {
    let compiledTemplate = this.compiledTemplates.get(templateId);
    
    if (!compiledTemplate) {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      compiledTemplate = Handlebars.compile(template.template);
      this.compiledTemplates.set(templateId, compiledTemplate);
    }
    
    return compiledTemplate(data);
  }

  async validateTemplate(template: string, variables: string[]): Promise<{
    isValid: boolean;
    errors: string[];
    usedVariables: string[];
    unusedVariables: string[];
  }> {
    const errors: string[] = [];
    const usedVariables: string[] = [];
    
    try {
      // Compile template to check for syntax errors
      const compiled = Handlebars.compile(template);
      
      // Extract variables used in template
      const variableRegex = /\{\{\{?([^}]+)\}?\}\}/g;
      let match;
      
      while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1].trim().split(' ')[0]; // Get base variable name
        if (!usedVariables.includes(variable)) {
          usedVariables.push(variable);
        }
      }
      
      // Check for unused variables
      const unusedVariables = variables.filter(v => !usedVariables.includes(v));
      
      // Test compilation with mock data
      const mockData = variables.reduce((acc, variable) => {
        acc[variable] = `[${variable}]`;
        return acc;
      }, {} as Record<string, any>);
      
      compiled(mockData);
      
      return {
        isValid: errors.length === 0,
        errors,
        usedVariables,
        unusedVariables
      };
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Template compilation failed');
      return {
        isValid: false,
        errors,
        usedVariables,
        unusedVariables: variables
      };
    }
  }

  private async saveTemplate(template: ExportTemplate): Promise<void> {
    const templatePath = path.join(this.templateDir, `${template.id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf8');
  }

  private async loadDefaultTemplates(): Promise<void> {
    const defaultTemplates = this.getDefaultTemplates();
    
    for (const template of defaultTemplates) {
      const templatePath = path.join(this.templateDir, `${template.id}.json`);
      
      try {
        // Check if template already exists
        await fs.access(templatePath);
      } catch (error) {
        // Template doesn't exist, create it
        await this.saveTemplate(template);
      }
    }
  }

  private getDefaultTemplates(): ExportTemplate[] {
    return [
      {
        id: 'basic-novel',
        name: 'Basic Novel',
        description: 'Simple novel template with title page and chapters',
        format: ExportFormat.HTML,
        options: {
          includeTOC: true,
          chapterBreaks: true,
          pageNumbers: true
        },
        template: `
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        body { font-family: serif; line-height: 1.6; }
        .title-page { text-align: center; page-break-after: always; }
        .chapter { page-break-before: always; }
        .chapter-title { font-size: 1.5em; margin-bottom: 1em; }
    </style>
</head>
<body>
    <div class="title-page">
        <h1>{{title}}</h1>
        <p>by {{author}}</p>
        {{#if description}}<p>{{description}}</p>{{/if}}
    </div>
    
    {{#each chapters}}
    <div class="chapter">
        <h2 class="chapter-title">Chapter {{chapterNumber @index "number"}}: {{title}}</h2>
        <div class="content">{{{content}}}</div>
    </div>
    {{/each}}
</body>
</html>`,
        variables: ['title', 'author', 'description', 'chapters'],
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'academic-paper',
        name: 'Academic Paper',
        description: 'Formal academic paper template',
        format: ExportFormat.HTML,
        options: {
          includeTOC: true,
          includeMetadata: true,
          fontSize: 12,
          fontFamily: 'Times New Roman'
        },
        template: `
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 2; }
        .header { text-align: center; margin-bottom: 2em; }
        .abstract { margin: 2em 0; font-style: italic; }
        .section { margin: 1.5em 0; }
        .section-title { font-weight: bold; font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{author}}</p>
        <p>{{formatDate createdAt "long"}}</p>
    </div>
    
    {{#if abstract}}
    <div class="abstract">
        <strong>Abstract:</strong> {{abstract}}
    </div>
    {{/if}}
    
    {{#each sections}}
    <div class="section">
        <h2 class="section-title">{{title}}</h2>
        <div class="content">{{{content}}}</div>
    </div>
    {{/each}}
</body>
</html>`,
        variables: ['title', 'author', 'abstract', 'sections', 'createdAt'],
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'magazine-article',
        name: 'Magazine Article',
        description: 'Magazine-style article template',
        format: ExportFormat.HTML,
        options: {
          fontSize: 14,
          lineHeight: 1.6,
          theme: 'light'
        },
        template: `
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14pt; line-height: 1.6; }
        .article-header { border-bottom: 2px solid #333; padding-bottom: 1em; margin-bottom: 2em; }
        .byline { font-style: italic; color: #666; }
        .lead { font-size: 1.1em; font-weight: bold; margin: 1em 0; }
        .pullquote { font-size: 1.2em; font-style: italic; text-align: center; margin: 2em 0; }
    </style>
</head>
<body>
    <article>
        <header class="article-header">
            <h1>{{title}}</h1>
            <p class="byline">By {{author}} | {{formatDate publishedAt "long"}}</p>
        </header>
        
        {{#if subtitle}}
        <p class="lead">{{subtitle}}</p>
        {{/if}}
        
        <div class="content">{{{content}}}</div>
        
        {{#if wordCount}}
        <footer>
            <p><em>Word count: {{wordCount content}}</em></p>
        </footer>
        {{/if}}
    </article>
</body>
</html>`,
        variables: ['title', 'author', 'subtitle', 'content', 'publishedAt'],
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toRoman(num: number): string {
    const romanNumerals = [
      { value: 1000, symbol: 'M' },
      { value: 900, symbol: 'CM' },
      { value: 500, symbol: 'D' },
      { value: 400, symbol: 'CD' },
      { value: 100, symbol: 'C' },
      { value: 90, symbol: 'XC' },
      { value: 50, symbol: 'L' },
      { value: 40, symbol: 'XL' },
      { value: 10, symbol: 'X' },
      { value: 9, symbol: 'IX' },
      { value: 5, symbol: 'V' },
      { value: 4, symbol: 'IV' },
      { value: 1, symbol: 'I' }
    ];

    let result = '';
    for (const { value, symbol } of romanNumerals) {
      while (num >= value) {
        result += symbol;
        num -= value;
      }
    }
    return result;
  }

  private numberToWord(num: number): string {
    const words = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'
    ];
    
    if (num <= 20) return words[num];
    return num.toString(); // Fallback for numbers > 20
  }
}