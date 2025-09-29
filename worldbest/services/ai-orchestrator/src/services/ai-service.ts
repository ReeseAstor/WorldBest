import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { AIIntent, AIPersona } from '@worldbest/shared-types';
import { logger } from '../utils/logger';

export interface AIGenerationRequest {
  intent: AIIntent;
  persona: AIPersona;
  projectId: string;
  contextRefs: Array<{
    type: string;
    id: string;
    version?: string;
    fields?: string[];
  }>;
  params: {
    temperature?: number;
    maxTokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    deterministic?: boolean;
    stream?: boolean;
    target_length?: 'short' | 'medium' | 'long';
    style_intensity?: number;
    model_override?: string;
  };
  safety_overrides?: any;
  idempotency_key?: string;
}

export interface AIGenerationResponse {
  id: string;
  request_id: string;
  persona: AIPersona;
  intent: AIIntent;
  content: string;
  alternatives: string[];
  metadata: {
    model: string;
    temperature: number;
    finish_reason: string;
    context_version: string;
    context_hash: string;
    processing_time_ms: number;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    model_tier: string;
  };
  cached: boolean;
  created_at: Date;
}

export class AIService {
  private prisma: PrismaClient;
  private mongoClient: MongoDBClient;

  constructor() {
    this.prisma = PrismaClient.getInstance();
    this.mongoClient = MongoDBClient.getInstance();
  }

  async generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create context
      const context = await this.buildContext(request);
      
      // Check cache first
      const cached = await this.checkCache(request, context);
      if (cached) {
        return cached;
      }

      // Generate content based on persona and intent
      const content = await this.generateWithPersona(request, context);
      
      // Generate alternatives if requested
      const alternatives = await this.generateAlternatives(request, context, content);
      
      // Calculate usage and cost
      const usage = this.calculateUsage(request, content);
      
      // Save to database
      const generation = await this.saveGeneration(request, content, alternatives, usage, startTime);
      
      // Cache the result
      await this.cacheResult(request, context, generation);
      
      return generation;
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw error;
    }
  }

  private async buildContext(request: AIGenerationRequest): Promise<any> {
    const context = {
      project: null,
      characters: [],
      locations: [],
      cultures: [],
      languages: [],
      timelines: [],
      scenes: [],
      chapters: [],
      books: [],
    };

    try {
      // Get project context
      const project = await this.prisma.project.findUnique({
        where: { id: request.projectId },
        include: {
          books: {
            include: {
              chapters: {
                include: {
                  scenes: {
                    include: {
                      textVersions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
          characters: true,
          locations: true,
          cultures: true,
          languages: true,
          timelines: {
            include: {
              events: true,
              eras: true,
            },
          },
        },
      });

      if (project) {
        context.project = project;
        context.characters = project.characters;
        context.locations = project.locations;
        context.cultures = project.cultures;
        context.languages = project.languages;
        context.timelines = project.timelines;
        context.books = project.books;
        context.chapters = project.books.flatMap(book => book.chapters);
        context.scenes = project.books.flatMap(book => 
          book.chapters.flatMap(chapter => chapter.scenes)
        );
      }

      // Get specific context references
      for (const ref of request.contextRefs) {
        const refData = await this.getContextReference(ref);
        if (refData) {
          context[ref.type] = context[ref.type] || [];
          context[ref.type].push(refData);
        }
      }

      return context;
    } catch (error) {
      logger.error('Error building context:', error);
      return context;
    }
  }

  private async getContextReference(ref: any): Promise<any> {
    try {
      switch (ref.type) {
        case 'character':
          return await this.prisma.character.findUnique({
            where: { id: ref.id },
            include: {
              relationships: {
                include: {
                  relatedChar: true,
                },
              },
              secrets: true,
            },
          });
        case 'location':
          return await this.prisma.location.findUnique({
            where: { id: ref.id },
            include: {
              locationCultures: {
                include: {
                  culture: true,
                },
              },
            },
          });
        case 'scene':
          return await this.prisma.scene.findUnique({
            where: { id: ref.id },
            include: {
              textVersions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              location: true,
              povCharacter: true,
            },
          });
        case 'chapter':
          return await this.prisma.chapter.findUnique({
            where: { id: ref.id },
            include: {
              scenes: {
                include: {
                  textVersions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          });
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error getting context reference ${ref.type}:`, error);
      return null;
    }
  }

  private async checkCache(request: AIGenerationRequest, context: any): Promise<AIGenerationResponse | null> {
    try {
      const contextHash = this.generateContextHash(context);
      
      const cached = await this.mongoClient.getCachedAIContext(
        request.projectId,
        'generation',
        contextHash
      );

      if (cached) {
        // Return cached result
        return {
          id: `cached_${Date.now()}`,
          request_id: request.idempotency_key || `req_${Date.now()}`,
          persona: request.persona,
          intent: request.intent,
          content: cached.summary,
          alternatives: [],
          metadata: {
            model: request.params.model_override || 'gpt-4o-mini',
            temperature: request.params.temperature || 0.7,
            finish_reason: 'stop',
            context_version: 'v1',
            context_hash: contextHash,
            processing_time_ms: 0,
          },
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            estimated_cost: 0,
            model_tier: 'cached',
          },
          cached: true,
          created_at: new Date(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking cache:', error);
      return null;
    }
  }

  private async generateWithPersona(request: AIGenerationRequest, context: any): Promise<string> {
    const prompt = this.buildPrompt(request, context);
    
    // In a real implementation, this would call the actual AI service
    // For now, we'll return a mock response based on the persona and intent
    
    switch (request.persona) {
      case 'muse':
        return this.generateMuseContent(request, context, prompt);
      case 'editor':
        return this.generateEditorContent(request, context, prompt);
      case 'coach':
        return this.generateCoachContent(request, context, prompt);
      default:
        return 'Generated content based on your request.';
    }
  }

  private generateMuseContent(request: AIGenerationRequest, context: any, prompt: string): string {
    const templates = {
      generate_scene: `The morning light filtered through the window, casting long shadows across the room. ${context.characters[0]?.name || 'The character'} stood by the window, lost in thought. The scene unfolded with a sense of anticipation...`,
      improve_dialogue: `"I never thought it would come to this," ${context.characters[0]?.name || 'she'} said, her voice barely above a whisper. The words hung in the air between them, heavy with unspoken meaning.`,
      add_description: `The room was filled with the soft glow of candlelight, each flame dancing in the gentle breeze. Shadows played across the walls, creating patterns that seemed to tell their own story.`,
      create_conflict: `The tension in the room was palpable. Every word spoken seemed to carry the weight of years of unspoken grievances. The conflict had been building for so long, and now it was finally coming to a head.`,
      suggest_plot: `The story could take an unexpected turn here. What if the character discovers something that changes everything? Perhaps a hidden truth that has been buried for years, waiting to be uncovered.`,
      character_development: `This moment could be pivotal for ${context.characters[0]?.name || 'the character'}. It's a chance to show their growth, their fears, their hopes. How they respond to this situation will define who they are becoming.`,
      worldbuilding: `The world around them was rich with detail. From the architecture that spoke of ancient civilizations to the customs that had been passed down through generations, every element told a story.`,
      style_improvement: `The prose flows more smoothly now, with each sentence building upon the last. The rhythm and pacing create a sense of momentum that draws the reader forward.`,
    };

    return templates[request.intent] || 'Creative content generated by the Muse persona.';
  }

  private generateEditorContent(request: AIGenerationRequest, context: any, prompt: string): string {
    const templates = {
      generate_scene: `The scene opens with a clear sense of place and time. The action unfolds logically, with each beat building tension and advancing the plot. The dialogue feels natural and serves the story.`,
      improve_dialogue: `The dialogue has been refined for clarity and impact. Each line serves a purpose, whether it's revealing character, advancing plot, or creating tension. The voices are distinct and authentic.`,
      add_description: `The description has been enhanced with sensory details that bring the scene to life. The prose is vivid without being overwrought, painting a clear picture for the reader.`,
      create_conflict: `The conflict has been sharpened and focused. The stakes are clear, and the tension builds naturally. Each character has a clear motivation, and their goals are in direct opposition.`,
      suggest_plot: `The plot structure has been analyzed and strengthened. The pacing is improved, with better balance between action and reflection. The story beats are more impactful.`,
      character_development: `The character arc has been refined. The development feels organic and earned, with clear growth from beginning to end. The character's choices drive the story forward.`,
      worldbuilding: `The worldbuilding has been tightened and made more consistent. The details serve the story and feel authentic to the setting. The rules of the world are clear and logical.`,
      style_improvement: `The writing style has been polished. The prose is cleaner, more direct, and more engaging. Unnecessary words have been removed, and the flow has been improved.`,
    };

    return templates[request.intent] || 'Editorial feedback and improvements.';
  }

  private generateCoachContent(request: AIGenerationRequest, context: any, prompt: string): string {
    const templates = {
      generate_scene: `Consider the key elements of a strong scene: clear objective, conflict, and resolution. What does your character want? What's standing in their way? How will they try to overcome it?`,
      improve_dialogue: `Good dialogue should sound natural while serving multiple purposes. Each line should reveal character, advance plot, or create tension. Avoid exposition-heavy dialogue.`,
      add_description: `Description should engage the senses and create atmosphere. Show, don't tell. Use specific details that matter to the story. Don't over-describe.`,
      create_conflict: `Conflict is the engine of story. Make sure your characters have clear, opposing goals. The conflict should escalate throughout the scene.`,
      suggest_plot: `Plot should be driven by character choices and consequences. Each scene should advance the story and reveal something new. Consider cause and effect.`,
      character_development: `Characters should grow and change throughout the story. What do they learn? How do they overcome their flaws? Make their arc meaningful.`,
      worldbuilding: `Your world should feel lived-in and consistent. The rules should be clear and logical. Every detail should serve the story.`,
      style_improvement: `Good writing is clear, concise, and engaging. Read your work aloud. Cut unnecessary words. Vary your sentence structure.`,
    };

    return templates[request.intent] || 'Writing guidance and coaching tips.';
  }

  private async generateAlternatives(request: AIGenerationRequest, context: any, originalContent: string): Promise<string[]> {
    // In a real implementation, this would generate alternative versions
    // For now, we'll return empty array
    return [];
  }

  private buildPrompt(request: AIGenerationRequest, context: any): string {
    const personaPrompts = {
      muse: "You are a creative writing muse, helping authors with inspiration and creative content generation.",
      editor: "You are an experienced editor, providing technical feedback and improvements to writing.",
      coach: "You are a writing coach, offering guidance and techniques to help authors improve their craft.",
    };

    const intentPrompts = {
      generate_scene: "Generate a new scene for the story.",
      improve_dialogue: "Improve the dialogue in the provided text.",
      add_description: "Add rich, sensory description to enhance the scene.",
      create_conflict: "Create or enhance conflict in the scene.",
      suggest_plot: "Suggest plot developments and story progression.",
      character_development: "Develop and deepen character arcs.",
      worldbuilding: "Expand and enrich the worldbuilding elements.",
      style_improvement: "Improve the writing style and prose quality.",
    };

    return `${personaPrompts[request.persona]}\n\n${intentPrompts[request.intent]}\n\nContext: ${JSON.stringify(context, null, 2)}`;
  }

  private calculateUsage(request: AIGenerationRequest, content: string): any {
    // Mock usage calculation
    const promptTokens = 100; // Estimated
    const completionTokens = content.split(' ').length;
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = totalTokens * 0.00002; // Mock cost calculation

    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
      model_tier: 'draft',
    };
  }

  private async saveGeneration(
    request: AIGenerationRequest,
    content: string,
    alternatives: string[],
    usage: any,
    startTime: number
  ): Promise<AIGenerationResponse> {
    const generation = await this.prisma.aIGeneration.create({
      data: {
        userId: 'user_demo', // In real implementation, get from auth
        projectId: request.projectId,
        requestId: request.idempotency_key || `req_${Date.now()}`,
        persona: request.persona,
        intent: request.intent,
        content,
        alternatives,
        model: request.params.model_override || 'gpt-4o-mini',
        temperature: request.params.temperature || 0.7,
        finishReason: 'stop',
        contextHash: 'context_stub',
        processingTimeMs: Date.now() - startTime,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: usage.estimated_cost,
        cached: false,
      },
    });

    return {
      id: generation.id,
      request_id: generation.requestId,
      persona: generation.persona as AIPersona,
      intent: generation.intent as AIIntent,
      content: generation.content,
      alternatives: generation.alternatives,
      metadata: {
        model: generation.model,
        temperature: generation.temperature,
        finish_reason: generation.finishReason as any,
        context_version: 'v1',
        context_hash: generation.contextHash,
        processing_time_ms: generation.processingTimeMs,
      },
      usage: {
        prompt_tokens: generation.promptTokens,
        completion_tokens: generation.completionTokens,
        total_tokens: generation.totalTokens,
        estimated_cost: generation.estimatedCost,
        model_tier: 'draft',
      },
      cached: generation.cached,
      created_at: generation.createdAt,
    };
  }

  private async cacheResult(request: AIGenerationRequest, context: any, generation: AIGenerationResponse): Promise<void> {
    try {
      const contextHash = this.generateContextHash(context);
      
      await this.mongoClient.cacheAIContext({
        projectId: request.projectId,
        contextType: 'generation',
        contextId: generation.id,
        contextHash,
        summary: generation.content,
        keyPoints: [],
        entities: { characters: [], locations: [], events: [] },
        metadata: { 
          persona: request.persona,
          intent: request.intent,
          params: request.params,
        },
        ttl: 3600, // 1 hour
      });
    } catch (error) {
      logger.error('Error caching result:', error);
    }
  }

  private generateContextHash(context: any): string {
    // Simple hash generation - in production, use a proper hashing algorithm
    return `hash_${JSON.stringify(context).length}_${Date.now()}`;
  }
}