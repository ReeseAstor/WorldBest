import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { ContextItem, GenerationContext } from '../types';
import { OpenAIProvider } from '../providers/openai';
import { config } from '../config';

export class ContextManager {
  private prisma: PrismaClient;
  private mongodb: typeof MongoDBClient;
  private openai: OpenAIProvider;

  constructor() {
    this.prisma = PrismaClient.getInstance();
    this.mongodb = MongoDBClient;
    this.openai = new OpenAIProvider();
  }

  async buildContext(
    projectId: string,
    userId: string,
    intent: string,
    contextRefs: Array<{ type: string; id: string; fields?: string[] }>,
    maxTokens: number = config.context.maxContextLength
  ): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];
    
    try {
      // Get project context
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            {
              collaborators: {
                some: { userId }
              }
            }
          ],
          deletedAt: null,
        },
        include: {
          styleProfile: true,
        },
      });

      if (project) {
        contextItems.push({
          id: project.id,
          type: 'project',
          title: project.title,
          content: this.formatProjectContext(project),
          metadata: {
            genre: project.genre,
            contentRating: project.contentRating,
            aiPreferences: {
              draftModel: project.draftModel,
              polishModel: project.polishModel,
              temperatureDraft: project.temperatureDraft,
              temperaturePolish: project.temperaturePolish,
            }
          },
        });
      }

      // Process specific context references
      for (const ref of contextRefs) {
        const item = await this.getContextItem(projectId, ref.type, ref.id, ref.fields);
        if (item) {
          contextItems.push(item);
        }
      }

      // Add relevant characters, locations, etc. based on intent
      await this.addRelevantContext(projectId, intent, contextItems, maxTokens);

      // Generate embeddings for similarity search if needed
      if (contextItems.length > 0) {
        await this.generateEmbeddings(contextItems);
      }

      return contextItems;
    } catch (error) {
      console.error('Error building context:', error);
      return contextItems; // Return partial context rather than failing
    }
  }

  private async getContextItem(
    projectId: string,
    type: string,
    id: string,
    fields?: string[]
  ): Promise<ContextItem | null> {
    try {
      switch (type) {
        case 'character':
          const character = await this.prisma.character.findFirst({
            where: { id, projectId },
            include: {
              relationships: {
                include: {
                  relatedChar: { select: { name: true } }
                }
              },
              secrets: true,
            },
          });
          
          if (character) {
            return {
              id: character.id,
              type: 'character',
              title: character.name,
              content: this.formatCharacterContext(character, fields),
              metadata: {
                age: character.age,
                gender: character.gender,
                mbti: character.mbti,
              },
            };
          }
          break;

        case 'location':
          const location = await this.prisma.location.findFirst({
            where: { id, projectId },
            include: {
              locationCultures: {
                include: {
                  culture: { select: { name: true } }
                }
              },
            },
          });
          
          if (location) {
            return {
              id: location.id,
              type: 'location',
              title: location.name,
              content: this.formatLocationContext(location, fields),
              metadata: {
                region: location.region,
                terrain: location.terrain,
                climate: location.climate,
              },
            };
          }
          break;

        case 'scene':
          const scene = await this.prisma.scene.findFirst({
            where: { id },
            include: {
              chapter: {
                include: {
                  book: { select: { title: true } }
                }
              },
              location: { select: { name: true } },
              povCharacter: { select: { name: true } },
              characters: {
                include: {
                  character: { select: { name: true } }
                }
              },
              textVersions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
          
          if (scene) {
            return {
              id: scene.id,
              type: 'scene',
              title: scene.title,
              content: this.formatSceneContext(scene, fields),
              metadata: {
                chapterTitle: scene.chapter.title,
                bookTitle: scene.chapter.book.title,
                location: scene.location?.name,
                povCharacter: scene.povCharacter?.name,
              },
            };
          }
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${type} context:`, error);
    }
    
    return null;
  }

  private async addRelevantContext(
    projectId: string,
    intent: string,
    contextItems: ContextItem[],
    maxTokens: number
  ): Promise<void> {
    // Add most relevant characters and locations based on intent
    const currentTokens = this.estimateTokenCount(contextItems);
    const remainingTokens = maxTokens - currentTokens;
    
    if (remainingTokens <= 0) return;

    try {
      // Get key characters
      const characters = await this.prisma.character.findMany({
        where: { projectId },
        take: 3,
        orderBy: { updatedAt: 'desc' },
      });

      for (const character of characters) {
        if (this.estimateTokenCount(contextItems) >= maxTokens) break;
        
        const existing = contextItems.find(item => item.id === character.id);
        if (!existing) {
          contextItems.push({
            id: character.id,
            type: 'character',
            title: character.name,
            content: this.formatCharacterContext(character),
            metadata: { age: character.age, gender: character.gender },
          });
        }
      }

      // Get key locations
      const locations = await this.prisma.location.findMany({
        where: { projectId },
        take: 2,
        orderBy: { updatedAt: 'desc' },
      });

      for (const location of locations) {
        if (this.estimateTokenCount(contextItems) >= maxTokens) break;
        
        const existing = contextItems.find(item => item.id === location.id);
        if (!existing) {
          contextItems.push({
            id: location.id,
            type: 'location',
            title: location.name,
            content: this.formatLocationContext(location),
            metadata: { region: location.region },
          });
        }
      }
    } catch (error) {
      console.error('Error adding relevant context:', error);
    }
  }

  private async generateEmbeddings(contextItems: ContextItem[]): Promise<void> {
    for (const item of contextItems) {
      if (!item.embedding) {
        try {
          item.embedding = await this.openai.generateEmbedding(
            `${item.title}\n${item.content}`
          );
        } catch (error) {
          console.error(`Failed to generate embedding for ${item.id}:`, error);
        }
      }
    }
  }

  private formatProjectContext(project: any): string {
    const parts = [
      `Title: ${project.title}`,
      `Genre: ${project.genre}`,
    ];
    
    if (project.synopsis) {
      parts.push(`Synopsis: ${project.synopsis}`);
    }
    
    if (project.timePeriod) {
      parts.push(`Time Period: ${project.timePeriod}`);
    }
    
    if (project.targetAudience) {
      parts.push(`Target Audience: ${project.targetAudience}`);
    }
    
    if (project.styleProfile) {
      parts.push(`Style Profile: ${JSON.stringify(project.styleProfile, null, 2)}`);
    }
    
    return parts.join('\n');
  }

  private formatCharacterContext(character: any, fields?: string[]): string {
    const parts = [`Name: ${character.name}`];
    
    if (!fields || fields.includes('aliases')) {
      if (character.aliases?.length) {
        parts.push(`Aliases: ${character.aliases.join(', ')}`);
      }
    }
    
    if (!fields || fields.includes('appearance')) {
      const appearance = [];
      if (character.age) appearance.push(`Age: ${character.age}`);
      if (character.gender) appearance.push(`Gender: ${character.gender}`);
      if (character.height) appearance.push(`Height: ${character.height}`);
      if (character.build) appearance.push(`Build: ${character.build}`);
      if (character.hair) appearance.push(`Hair: ${character.hair}`);
      if (character.eyes) appearance.push(`Eyes: ${character.eyes}`);
      if (appearance.length) {
        parts.push(`Appearance: ${appearance.join(', ')}`);
      }
    }
    
    if (!fields || fields.includes('personality')) {
      if (character.coreTraits?.length) {
        parts.push(`Core Traits: ${character.coreTraits.join(', ')}`);
      }
      if (character.fears?.length) {
        parts.push(`Fears: ${character.fears.join(', ')}`);
      }
      if (character.desires?.length) {
        parts.push(`Desires: ${character.desires.join(', ')}`);
      }
    }
    
    if (!fields || fields.includes('backstory')) {
      if (character.backstory) {
        parts.push(`Backstory: ${character.backstory}`);
      }
    }
    
    if (!fields || fields.includes('relationships')) {
      if (character.relationships?.length) {
        const relationships = character.relationships.map((rel: any) => 
          `${rel.relatedChar.name} (${rel.relationshipType})`
        );
        parts.push(`Relationships: ${relationships.join(', ')}`);
      }
    }
    
    return parts.join('\n');
  }

  private formatLocationContext(location: any, fields?: string[]): string {
    const parts = [`Name: ${location.name}`];
    
    if (!fields || fields.includes('region')) {
      if (location.region) {
        parts.push(`Region: ${location.region}`);
      }
    }
    
    if (!fields || fields.includes('description')) {
      if (location.description) {
        parts.push(`Description: ${location.description}`);
      }
    }
    
    if (!fields || fields.includes('geography')) {
      const geography = [];
      if (location.terrain) geography.push(`Terrain: ${location.terrain}`);
      if (location.climate) geography.push(`Climate: ${location.climate}`);
      if (geography.length) {
        parts.push(`Geography: ${geography.join(', ')}`);
      }
    }
    
    if (!fields || fields.includes('atmosphere')) {
      if (location.atmosphere) {
        parts.push(`Atmosphere: ${location.atmosphere}`);
      }
    }
    
    return parts.join('\n');
  }

  private formatSceneContext(scene: any, fields?: string[]): string {
    const parts = [`Scene: ${scene.title}`];
    
    if (scene.chapter) {
      parts.push(`Chapter: ${scene.chapter.title}`);
      if (scene.chapter.book) {
        parts.push(`Book: ${scene.chapter.book.title}`);
      }
    }
    
    if (scene.location) {
      parts.push(`Location: ${scene.location.name}`);
    }
    
    if (scene.povCharacter) {
      parts.push(`POV Character: ${scene.povCharacter.name}`);
    }
    
    if (scene.characters?.length) {
      const characters = scene.characters.map((sc: any) => sc.character.name);
      parts.push(`Characters: ${characters.join(', ')}`);
    }
    
    if (scene.mood) {
      parts.push(`Mood: ${scene.mood}`);
    }
    
    if (scene.conflict) {
      parts.push(`Conflict: ${scene.conflict}`);
    }
    
    if (scene.textVersions?.length && (!fields || fields.includes('content'))) {
      parts.push(`Current Text: ${scene.textVersions[0].content}`);
    }
    
    return parts.join('\n');
  }

  private estimateTokenCount(contextItems: ContextItem[]): number {
    const totalContent = contextItems
      .map(item => `${item.title}\n${item.content}`)
      .join('\n\n');
    
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(totalContent.length / 4);
  }
}