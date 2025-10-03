import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { AIIntent, AIPersona } from '@worldbest/shared-types';
import { OpenAIProvider } from '../providers/openai';
import { AnthropicProvider } from '../providers/anthropic';
import { ContextManager } from '../context/manager';
import { getPersona } from '../personas';
import { GenerationContext, GenerationResult, AIProvider } from '../types';
import { config } from '../config';

export class AIOrchestrator {
  private prisma: PrismaClient;
  private mongodb: typeof MongoDBClient;
  private contextManager: ContextManager;
  private providers: Map<string, AIProvider>;

  constructor() {
    this.prisma = PrismaClient.getInstance();
    this.mongodb = MongoDBClient;
    this.contextManager = new ContextManager();
    this.providers = new Map();
    
    // Initialize providers
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
  }

  async generateContent(
    userId: string,
    projectId: string,
    intent: AIIntent,
    persona: AIPersona,
    contextRefs: Array<{ type: string; id: string; fields?: string[] }> = [],
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
    } = {},
    safetyOverrides: any = {},
    idempotencyKey?: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    const startTime = Date.now();

    try {
      // Check if this is a duplicate request
      if (idempotencyKey) {
        const existing = await this.prisma.aIGeneration.findFirst({
          where: { requestId: idempotencyKey },
        });
        
        if (existing) {
          return {
            success: true,
            data: this.formatGenerationResponse(existing),
          };
        }
      }

      // Build context
      const contextItems = await this.contextManager.buildContext(
        projectId,
        userId,
        intent,
        contextRefs,
        config.context.maxContextLength
      );

      const generationContext: GenerationContext = {
        projectId,
        userId,
        intent,
        persona,
        contextItems,
        userPreferences: {},
        safetySettings: safetyOverrides,
      };

      // Get persona configuration
      const personaConfig = getPersona(persona);

      // Build prompt
      const prompt = await this.buildPrompt(intent, generationContext, params);

      // Select provider and model
      const { provider, model } = this.selectProvider(params.model_override, personaConfig);

      // Generate content
      const generationParams = {
        prompt: prompt.userPrompt,
        systemPrompt: prompt.systemPrompt,
        model,
        temperature: params.temperature ?? personaConfig.temperature,
        maxTokens: params.maxTokens ?? personaConfig.maxTokens,
        topP: params.top_p,
        frequencyPenalty: params.frequency_penalty,
        presencePenalty: params.presence_penalty,
        stream: params.stream,
      };

      const result = await provider.generateText(generationParams);

      // Calculate context hash
      const contextHash = this.calculateContextHash(contextItems);

      // Estimate cost
      const estimatedCost = provider.estimateCost(generationParams);

      // Store generation result
      const generation = await this.prisma.aIGeneration.create({
        data: {
          userId,
          projectId,
          requestId: idempotencyKey || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          persona,
          intent,
          content: result.content,
          alternatives: [], // Could generate multiple alternatives in the future
          model: result.model,
          temperature: generationParams.temperature!,
          finishReason: result.finishReason,
          contextHash,
          processingTimeMs: result.processingTimeMs,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          estimatedCost,
          cached: false,
        },
      });

      // Cache context in MongoDB if significant
      if (contextItems.length > 0) {
        await this.mongodb.cacheAIContext({
          projectId,
          contextType: 'generation',
          contextId: generation.id,
          contextHash,
          summary: this.generateContextSummary(contextItems),
          keyPoints: this.extractKeyPoints(contextItems),
          entities: this.extractEntities(contextItems),
          metadata: {
            intent,
            persona,
            contextRefs,
            generatedAt: new Date(),
          },
          ttl: config.cache.ttl,
        });
      }

      return {
        success: true,
        data: this.formatGenerationResponse(generation),
      };

    } catch (error) {
      console.error('AI generation error:', error);
      
      return {
        success: false,
        error: {
          code: 'AI_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date(),
        },
      };
    }
  }

  private async buildPrompt(
    intent: AIIntent,
    context: GenerationContext,
    params: any
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const personaConfig = getPersona(context.persona);
    
    // Build context string
    const contextString = context.contextItems
      .map(item => `## ${item.title} (${item.type})\n${item.content}`)
      .join('\n\n');

    // Build system prompt
    let systemPrompt = personaConfig.systemPrompt;
    
    if (contextString) {
      systemPrompt += `\n\nHere is the relevant context from the story bible:\n\n${contextString}`;
    }

    // Add any special instructions
    if (personaConfig.specialInstructions?.length) {
      systemPrompt += `\n\nSpecial Instructions:\n${personaConfig.specialInstructions.map(i => `- ${i}`).join('\n')}`;
    }

    // Build user prompt based on intent
    const userPrompt = this.buildIntentPrompt(intent, context, params);

    return { systemPrompt, userPrompt };
  }

  private buildIntentPrompt(intent: AIIntent, context: GenerationContext, params: any): string {
    switch (intent) {
      case AIIntent.GENERATE_SCENE:
        return `Please generate a new scene for this story. ${params.target_length ? `The scene should be ${params.target_length} length.` : ''} Focus on advancing the plot while maintaining character consistency and the established tone.`;
      
      case AIIntent.CONTINUE_SCENE:
        return `Please continue the current scene naturally, maintaining the established tone, pacing, and character voices. Build on what has already been written.`;
      
      case AIIntent.REVISE_TEXT:
        return `Please revise and improve the provided text while maintaining the author's voice and style. Focus on clarity, flow, and impact.`;
      
      case AIIntent.DEVELOP_CHARACTER:
        return `Please help develop this character further, providing insights into their personality, motivations, and potential character arc. Be creative but consistent with what's already established.`;
      
      case AIIntent.EXPAND_WORLDBUILDING:
        return `Please expand on the worldbuilding elements provided, adding rich details that enhance the story world while maintaining consistency with established lore.`;
      
      case AIIntent.SUGGEST_PLOT:
        return `Please suggest compelling plot developments that would work well with the established characters and world. Consider potential conflicts, character growth, and story progression.`;
      
      case AIIntent.BRAINSTORM_IDEAS:
        return `Please brainstorm creative ideas related to this story. Think outside the box while respecting the established world and characters.`;
      
      case AIIntent.IMPROVE_DIALOGUE:
        return `Please improve the dialogue to sound more natural and character-appropriate. Each character should have a distinct voice that reflects their personality and background.`;
      
      case AIIntent.DESCRIBE_SCENE:
        return `Please provide a vivid, immersive description of this scene or location. Use sensory details to bring the setting to life.`;
      
      case AIIntent.ANALYZE_TEXT:
        return `Please analyze the provided text for strengths, weaknesses, and opportunities for improvement. Provide specific, constructive feedback.`;
      
      default:
        return `Please help with this creative writing task, using your expertise to provide valuable assistance while maintaining story consistency.`;
    }
  }

  private selectProvider(modelOverride?: string, personaConfig?: any): { provider: AIProvider; model: string } {
    if (modelOverride) {
      if (modelOverride.includes('gpt') || modelOverride.includes('openai')) {
        return {
          provider: this.providers.get('openai')!,
          model: modelOverride,
        };
      } else if (modelOverride.includes('claude') || modelOverride.includes('anthropic')) {
        return {
          provider: this.providers.get('anthropic')!,
          model: modelOverride,
        };
      }
    }

    // Default to OpenAI with GPT-4
    return {
      provider: this.providers.get('openai')!,
      model: config.openai.defaultModel,
    };
  }

  private calculateContextHash(contextItems: any[]): string {
    const contextString = contextItems
      .map(item => `${item.id}:${item.type}:${item.title}`)
      .sort()
      .join('|');
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `ctx_${Math.abs(hash).toString(36)}`;
  }

  private generateContextSummary(contextItems: any[]): string {
    const types = [...new Set(contextItems.map(item => item.type))];
    const count = contextItems.length;
    
    return `Context includes ${count} items: ${types.join(', ')}`;
  }

  private extractKeyPoints(contextItems: any[]): string[] {
    return contextItems.map(item => `${item.type}: ${item.title}`);
  }

  private extractEntities(contextItems: any[]): any {
    const entities: any = {
      characters: [],
      locations: [],
      events: [],
    };

    contextItems.forEach(item => {
      switch (item.type) {
        case 'character':
          entities.characters.push(item.title);
          break;
        case 'location':
          entities.locations.push(item.title);
          break;
        case 'scene':
          entities.events.push(item.title);
          break;
      }
    });

    return entities;
  }

  private formatGenerationResponse(generation: any) {
    return {
      id: generation.id,
      request_id: generation.requestId,
      persona: generation.persona,
      intent: generation.intent,
      content: generation.content,
      alternatives: generation.alternatives,
      metadata: {
        model: generation.model,
        temperature: generation.temperature,
        finish_reason: generation.finishReason,
        context_version: 'v1',
        context_hash: generation.contextHash,
        processing_time_ms: generation.processingTimeMs,
      },
      usage: {
        prompt_tokens: generation.promptTokens,
        completion_tokens: generation.completionTokens,
        total_tokens: generation.totalTokens,
        estimated_cost: generation.estimatedCost,
        model_tier: 'production',
      },
      cached: generation.cached,
      created_at: generation.createdAt,
    };
  }
}