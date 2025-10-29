import { PrismaClient } from '@worldbest/database';
import Fuse from 'fuse.js';
import { v4 as uuidv4 } from 'uuid';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  structure: ProjectStructure;
  metadata: TemplateMetadata;
  isPublic: boolean;
  isOfficial: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    totalUses: number;
    recentUses: number;
    rating: number;
    reviewCount: number;
  };
}

interface ProjectStructure {
  chapters: ChapterTemplate[];
  characters: CharacterTemplate[];
  worldbuilding: WorldbuildingTemplate[];
  plotlines: PlotlineTemplate[];
  settings: ProjectSettings;
}

interface ChapterTemplate {
  title: string;
  description?: string;
  order: number;
  estimatedWordCount?: number;
  notes?: string;
  tags?: string[];
  sections?: SectionTemplate[];
}

interface SectionTemplate {
  title: string;
  content?: string;
  order: number;
  type: 'prose' | 'dialogue' | 'action' | 'description' | 'notes';
}

interface CharacterTemplate {
  name: string;
  description?: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  attributes: {
    age?: string;
    occupation?: string;
    personality?: string[];
    background?: string;
    goals?: string;
    conflicts?: string;
  };
  relationships: Array<{
    characterName: string;
    relationship: string;
    description?: string;
  }>;
}

interface WorldbuildingTemplate {
  name: string;
  type: 'location' | 'culture' | 'technology' | 'magic' | 'politics' | 'history' | 'other';
  description?: string;
  details: Record<string, any>;
  connections: Array<{
    elementName: string;
    connectionType: string;
    description?: string;
  }>;
}

interface PlotlineTemplate {
  name: string;
  description?: string;
  type: 'main' | 'subplot' | 'character-arc' | 'romance' | 'mystery';
  structure: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedChapters?: number[];
  }>;
}

interface ProjectSettings {
  genre: string[];
  targetWordCount?: number;
  targetAudience?: string;
  writingStyle?: string;
  pov?: 'first' | 'second' | 'third-limited' | 'third-omniscient' | 'multiple';
  tense?: 'past' | 'present' | 'future';
  customFields?: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
    options?: string[];
    required?: boolean;
  }>;
}

interface TemplateMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCompletionTime?: string;
  prerequisites?: string[];
  features: string[];
  inspiration?: string;
  exampleWorks?: string[];
  tips?: string[];
  warnings?: string[];
}

interface SearchFilters {
  category?: string;
  subcategory?: string;
  tags?: string[];
  genre?: string[];
  difficulty?: string;
  isOfficial?: boolean;
  isPublic?: boolean;
  minRating?: number;
  createdBy?: string;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'newest' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

class TemplateService {
  private prisma: PrismaClient;
  private searchIndex: Fuse<ProjectTemplate>;
  private templates: Map<string, ProjectTemplate>;

  constructor() {
    this.prisma = new PrismaClient();
    this.templates = new Map();
    
    // Initialize search index
    this.searchIndex = new Fuse([], {
      keys: [
        { name: 'name', weight: 0.3 },
        { name: 'description', weight: 0.2 },
        { name: 'category', weight: 0.15 },
        { name: 'subcategory', weight: 0.1 },
        { name: 'tags', weight: 0.15 },
        { name: 'metadata.features', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true
    });

    this.loadTemplates();
  }

  /**
   * Search templates with advanced filtering and sorting
   */
  async searchTemplates(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<{
    templates: ProjectTemplate[];
    total: number;
    hasMore: boolean;
    facets: {
      categories: Record<string, number>;
      tags: Record<string, number>;
      genres: Record<string, number>;
      difficulties: Record<string, number>;
    };
  }> {
    const { limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc' } = options;

    let results: ProjectTemplate[] = [];

    if (query.trim()) {
      // Use Fuse.js for fuzzy search
      const searchResults = this.searchIndex.search(query);
      results = searchResults.map(result => result.item);
    } else {
      // Get all templates if no query
      results = Array.from(this.templates.values());
    }

    // Apply filters
    results = this.applyFilters(results, filters);

    // Calculate facets for filtering UI
    const facets = this.calculateFacets(results);

    // Sort results
    results = this.sortTemplates(results, sortBy, sortOrder);

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      templates: paginatedResults,
      total,
      hasMore: offset + paginatedResults.length < total,
      facets
    };
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * Create a new template
   */
  async createTemplate(
    templateData: Omit<ProjectTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>,
    userId: string
  ): Promise<ProjectTemplate> {
    const template: ProjectTemplate = {
      id: uuidv4(),
      ...templateData,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: {
        totalUses: 0,
        recentUses: 0,
        rating: 0,
        reviewCount: 0
      }
    };

    // Save to database
    await this.prisma.projectTemplate.create({
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        tags: template.tags,
        structure: JSON.stringify(template.structure),
        metadata: JSON.stringify(template.metadata),
        isPublic: template.isPublic,
        isOfficial: template.isOfficial,
        createdBy: template.createdBy,
        totalUses: 0,
        rating: 0,
        reviewCount: 0
      }
    });

    // Add to memory cache and search index
    this.templates.set(template.id, template);
    this.updateSearchIndex();

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<ProjectTemplate>,
    userId: string
  ): Promise<ProjectTemplate | null> {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return null;
    }

    // Check permissions (only creator or admin can update)
    if (template.createdBy !== userId && !template.isOfficial) {
      throw new Error('Insufficient permissions to update template');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    // Save to database
    await this.prisma.projectTemplate.update({
      where: { id: templateId },
      data: {
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        category: updatedTemplate.category,
        subcategory: updatedTemplate.subcategory,
        tags: updatedTemplate.tags,
        structure: JSON.stringify(updatedTemplate.structure),
        metadata: JSON.stringify(updatedTemplate.metadata),
        isPublic: updatedTemplate.isPublic,
        isOfficial: updatedTemplate.isOfficial
      }
    });

    // Update memory cache and search index
    this.templates.set(templateId, updatedTemplate);
    this.updateSearchIndex();

    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return false;
    }

    // Check permissions
    if (template.createdBy !== userId && !template.isOfficial) {
      throw new Error('Insufficient permissions to delete template');
    }

    // Remove from database
    await this.prisma.projectTemplate.delete({
      where: { id: templateId }
    });

    // Remove from memory cache and update search index
    this.templates.delete(templateId);
    this.updateSearchIndex();

    return true;
  }

  /**
   * Create a project from a template
   */
  async createProjectFromTemplate(
    templateId: string,
    projectData: {
      title: string;
      description?: string;
      customizations?: Record<string, any>;
    },
    userId: string
  ): Promise<{
    projectId: string;
    structure: any;
  }> {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Create project structure from template
    const projectStructure = this.processTemplateStructure(
      template.structure,
      projectData.customizations || {}
    );

    // Create the project (this would integrate with your project service)
    const project = await this.prisma.project.create({
      data: {
        title: projectData.title,
        description: projectData.description || template.description,
        userId,
        templateId: template.id,
        structure: JSON.stringify(projectStructure),
        settings: JSON.stringify(template.structure.settings),
        status: 'active'
      }
    });

    // Increment template usage
    await this.incrementTemplateUsage(templateId);

    return {
      projectId: project.id,
      structure: projectStructure
    };
  }

  /**
   * Get template categories and subcategories
   */
  async getTemplateCategories(): Promise<{
    categories: Array<{
      name: string;
      subcategories: string[];
      count: number;
    }>;
  }> {
    const categoryMap = new Map<string, { subcategories: Set<string>; count: number }>();

    for (const template of this.templates.values()) {
      if (!categoryMap.has(template.category)) {
        categoryMap.set(template.category, { subcategories: new Set(), count: 0 });
      }
      
      const category = categoryMap.get(template.category)!;
      category.count++;
      
      if (template.subcategory) {
        category.subcategories.add(template.subcategory);
      }
    }

    return {
      categories: Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        subcategories: Array.from(data.subcategories).sort(),
        count: data.count
      }))
    };
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<ProjectTemplate[]> {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usage.totalUses - a.usage.totalUses)
      .slice(0, limit);
  }

  /**
   * Get recommended templates for a user
   */
  async getRecommendedTemplates(
    userId: string,
    limit: number = 5
  ): Promise<ProjectTemplate[]> {
    // Get user's project history and preferences
    const userProjects = await this.prisma.project.findMany({
      where: { userId },
      select: { templateId: true, structure: true, settings: true }
    });

    const userPreferences = this.analyzeUserPreferences(userProjects);
    
    // Find templates matching user preferences
    let candidates = Array.from(this.templates.values()).filter(template => {
      // Filter by user's preferred genres
      if (userPreferences.genres.length > 0) {
        const templateGenres = template.structure.settings.genre || [];
        if (!templateGenres.some(genre => userPreferences.genres.includes(genre))) {
          return false;
        }
      }

      // Filter by difficulty (suggest slightly above current level)
      const userLevel = userPreferences.experienceLevel;
      if (userLevel === 'beginner' && template.metadata.difficulty === 'advanced') {
        return false;
      }

      return true;
    });

    // Sort by relevance and popularity
    candidates = candidates.sort((a, b) => {
      const aScore = this.calculateRecommendationScore(a, userPreferences);
      const bScore = this.calculateRecommendationScore(b, userPreferences);
      return bScore - aScore;
    });

    return candidates.slice(0, limit);
  }

  /**
   * Rate a template
   */
  async rateTemplate(
    templateId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<boolean> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Save rating to database
    await this.prisma.templateRating.upsert({
      where: {
        templateId_userId: {
          templateId,
          userId
        }
      },
      update: {
        rating,
        review
      },
      create: {
        templateId,
        userId,
        rating,
        review
      }
    });

    // Update template rating average
    await this.updateTemplateRating(templateId);

    return true;
  }

  // Private helper methods

  private async loadTemplates(): Promise<void> {
    try {
      const templates = await this.prisma.projectTemplate.findMany({
        include: {
          ratings: true
        }
      });

      this.templates.clear();

      for (const dbTemplate of templates) {
        const template: ProjectTemplate = {
          id: dbTemplate.id,
          name: dbTemplate.name,
          description: dbTemplate.description,
          category: dbTemplate.category,
          subcategory: dbTemplate.subcategory,
          tags: dbTemplate.tags,
          structure: JSON.parse(dbTemplate.structure),
          metadata: JSON.parse(dbTemplate.metadata),
          isPublic: dbTemplate.isPublic,
          isOfficial: dbTemplate.isOfficial,
          createdBy: dbTemplate.createdBy,
          createdAt: dbTemplate.createdAt,
          updatedAt: dbTemplate.updatedAt,
          usage: {
            totalUses: dbTemplate.totalUses,
            recentUses: dbTemplate.recentUses || 0,
            rating: dbTemplate.rating,
            reviewCount: dbTemplate.reviewCount
          }
        };

        this.templates.set(template.id, template);
      }

      this.updateSearchIndex();
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  private updateSearchIndex(): void {
    const templates = Array.from(this.templates.values());
    this.searchIndex.setCollection(templates);
  }

  private applyFilters(templates: ProjectTemplate[], filters: SearchFilters): ProjectTemplate[] {
    return templates.filter(template => {
      if (filters.category && template.category !== filters.category) {
        return false;
      }

      if (filters.subcategory && template.subcategory !== filters.subcategory) {
        return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some(tag => template.tags.includes(tag))) {
          return false;
        }
      }

      if (filters.genre && filters.genre.length > 0) {
        const templateGenres = template.structure.settings.genre || [];
        if (!filters.genre.some(genre => templateGenres.includes(genre))) {
          return false;
        }
      }

      if (filters.difficulty && template.metadata.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters.isOfficial !== undefined && template.isOfficial !== filters.isOfficial) {
        return false;
      }

      if (filters.isPublic !== undefined && template.isPublic !== filters.isPublic) {
        return false;
      }

      if (filters.minRating && template.usage.rating < filters.minRating) {
        return false;
      }

      if (filters.createdBy && template.createdBy !== filters.createdBy) {
        return false;
      }

      return true;
    });
  }

  private sortTemplates(
    templates: ProjectTemplate[],
    sortBy: string,
    sortOrder: string
  ): ProjectTemplate[] {
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

    return templates.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.usage.totalUses - a.usage.totalUses) * sortMultiplier;
        case 'rating':
          return (b.usage.rating - a.usage.rating) * sortMultiplier;
        case 'newest':
          return (b.createdAt.getTime() - a.createdAt.getTime()) * sortMultiplier;
        case 'alphabetical':
          return a.name.localeCompare(b.name) * sortMultiplier;
        default: // relevance - already ordered by search score
          return 0;
      }
    });
  }

  private calculateFacets(templates: ProjectTemplate[]) {
    const facets = {
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      genres: {} as Record<string, number>,
      difficulties: {} as Record<string, number>
    };

    for (const template of templates) {
      // Categories
      facets.categories[template.category] = (facets.categories[template.category] || 0) + 1;

      // Tags
      for (const tag of template.tags) {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      }

      // Genres
      for (const genre of template.structure.settings.genre || []) {
        facets.genres[genre] = (facets.genres[genre] || 0) + 1;
      }

      // Difficulties
      const difficulty = template.metadata.difficulty;
      facets.difficulties[difficulty] = (facets.difficulties[difficulty] || 0) + 1;
    }

    return facets;
  }

  private processTemplateStructure(
    structure: ProjectStructure,
    customizations: Record<string, any>
  ): any {
    // Apply customizations to template structure
    // This is a simplified version - real implementation would be more sophisticated
    return {
      ...structure,
      ...customizations
    };
  }

  private async incrementTemplateUsage(templateId: string): Promise<void> {
    await this.prisma.projectTemplate.update({
      where: { id: templateId },
      data: {
        totalUses: { increment: 1 },
        recentUses: { increment: 1 }
      }
    });

    // Update in-memory cache
    const template = this.templates.get(templateId);
    if (template) {
      template.usage.totalUses++;
      template.usage.recentUses++;
    }
  }

  private analyzeUserPreferences(userProjects: any[]): {
    genres: string[];
    experienceLevel: string;
    preferredComplexity: string;
  } {
    // Analyze user's project history to determine preferences
    const genreCount = new Map<string, number>();
    let totalProjects = userProjects.length;

    for (const project of userProjects) {
      if (project.settings) {
        const settings = JSON.parse(project.settings);
        for (const genre of settings.genre || []) {
          genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        }
      }
    }

    // Get most used genres
    const genres = Array.from(genreCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    // Determine experience level based on project count
    let experienceLevel = 'beginner';
    if (totalProjects > 5) experienceLevel = 'intermediate';
    if (totalProjects > 15) experienceLevel = 'advanced';

    return {
      genres,
      experienceLevel,
      preferredComplexity: experienceLevel
    };
  }

  private calculateRecommendationScore(
    template: ProjectTemplate,
    userPreferences: any
  ): number {
    let score = 0;

    // Genre match
    const templateGenres = template.structure.settings.genre || [];
    const genreMatches = templateGenres.filter(genre => 
      userPreferences.genres.includes(genre)
    ).length;
    score += genreMatches * 3;

    // Popularity
    score += Math.log(template.usage.totalUses + 1) * 0.5;

    // Rating
    score += template.usage.rating * 0.5;

    // Recency
    const daysSinceCreated = (Date.now() - template.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) {
      score += 1; // Boost for newer templates
    }

    return score;
  }

  private async updateTemplateRating(templateId: string): Promise<void> {
    const ratings = await this.prisma.templateRating.findMany({
      where: { templateId }
    });

    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;

    await this.prisma.projectTemplate.update({
      where: { id: templateId },
      data: {
        rating: avgRating,
        reviewCount: ratings.length
      }
    });

    // Update in-memory cache
    const template = this.templates.get(templateId);
    if (template) {
      template.usage.rating = avgRating;
      template.usage.reviewCount = ratings.length;
    }
  }
}

export {
  TemplateService,
  ProjectTemplate,
  ProjectStructure,
  ChapterTemplate,
  CharacterTemplate,
  WorldbuildingTemplate,
  PlotlineTemplate,
  ProjectSettings,
  TemplateMetadata,
  SearchFilters,
  SearchOptions
};