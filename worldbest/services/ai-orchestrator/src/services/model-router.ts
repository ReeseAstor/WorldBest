import { AIIntent, AIPersona } from '@worldbest/shared-types';

interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'cohere' | 'local';
  apiKey?: string;
  endpoint?: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
  reliability: number; // 0-1 score
  speed: number; // 0-1 score
  quality: number; // 0-1 score
}

interface ModelRoute {
  primary: ModelConfig;
  fallbacks: ModelConfig[];
  criteria: {
    intent: AIIntent[];
    persona: AIPersona[];
    priority: 'speed' | 'quality' | 'cost' | 'reliability';
  };
}

class ModelRouter {
  private models: Map<string, ModelConfig> = new Map();
  private routes: ModelRoute[] = [];
  private usageStats: Map<string, { requests: number; tokens: number; cost: number }> = new Map();

  constructor() {
    this.initializeModels();
    this.setupRoutes();
  }

  /**
   * Route request to optimal model based on criteria
   */
  async routeRequest(intent: AIIntent, persona: AIPersona, options: {
    priority?: 'speed' | 'quality' | 'cost' | 'reliability';
    maxTokens?: number;
    budget?: number;
  } = {}): Promise<{ model: ModelConfig; fallbacks: ModelConfig[] }> {
    const priority = options.priority || 'quality';
    
    // Find matching route
    const route = this.routes.find(r => 
      r.criteria.intent.includes(intent) && 
      r.criteria.persona.includes(persona) &&
      r.criteria.priority === priority
    );

    if (route) {
      // Check if primary model is available and within budget
      if (await this.isModelAvailable(route.primary) && this.isWithinBudget(route.primary, options.budget)) {
        return { model: route.primary, fallbacks: route.fallbacks };
      }
      
      // Try fallbacks
      for (const fallback of route.fallbacks) {
        if (await this.isModelAvailable(fallback) && this.isWithinBudget(fallback, options.budget)) {
          return { model: fallback, fallbacks: route.fallbacks.filter(f => f !== fallback) };
        }
      }
    }

    // Default routing logic
    return this.getDefaultRoute(intent, persona, priority);
  }

  /**
   * Track model usage for optimization
   */
  trackUsage(modelName: string, tokens: number, cost: number): void {
    const stats = this.usageStats.get(modelName) || { requests: 0, tokens: 0, cost: 0 };
    stats.requests++;
    stats.tokens += tokens;
    stats.cost += cost;
    this.usageStats.set(modelName, stats);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): Record<string, { requests: number; tokens: number; cost: number; avgCost: number }> {
    const stats: Record<string, any> = {};
    for (const [model, data] of this.usageStats.entries()) {
      stats[model] = {
        ...data,
        avgCost: data.requests > 0 ? data.cost / data.requests : 0
      };
    }
    return stats;
  }

  private initializeModels(): void {
    // OpenAI Models
    this.models.set('gpt-4o', {
      name: 'gpt-4o',
      provider: 'openai',
      maxTokens: 128000,
      costPerToken: 0.00003,
      capabilities: ['text', 'reasoning', 'analysis'],
      reliability: 0.95,
      speed: 0.7,
      quality: 0.95
    });

    this.models.set('gpt-4o-mini', {
      name: 'gpt-4o-mini',
      provider: 'openai',
      maxTokens: 128000,
      costPerToken: 0.000015,
      capabilities: ['text', 'speed'],
      reliability: 0.9,
      speed: 0.9,
      quality: 0.8
    });

    this.models.set('gpt-3.5-turbo', {
      name: 'gpt-3.5-turbo',
      provider: 'openai',
      maxTokens: 16000,
      costPerToken: 0.000002,
      capabilities: ['text', 'speed', 'cost'],
      reliability: 0.85,
      speed: 0.95,
      quality: 0.7
    });

    // Anthropic Models
    this.models.set('claude-3-5-sonnet', {
      name: 'claude-3-5-sonnet',
      provider: 'anthropic',
      maxTokens: 200000,
      costPerToken: 0.00003,
      capabilities: ['text', 'reasoning', 'analysis', 'long-context'],
      reliability: 0.92,
      speed: 0.6,
      quality: 0.93
    });
  }

  private setupRoutes(): void {
    // High-quality creative writing
    this.routes.push({
      primary: this.models.get('gpt-4o')!,
      fallbacks: [this.models.get('claude-3-5-sonnet')!, this.models.get('gpt-4o-mini')!],
      criteria: {
        intent: [AIIntent.GENERATE_CONTENT, AIIntent.BRAINSTORM_IDEAS],
        persona: [AIPersona.MUSE],
        priority: 'quality'
      }
    });

    // Fast editing and feedback
    this.routes.push({
      primary: this.models.get('gpt-4o-mini')!,
      fallbacks: [this.models.get('gpt-3.5-turbo')!],
      criteria: {
        intent: [AIIntent.EDIT_CONTENT, AIIntent.IMPROVE_PROSE],
        persona: [AIPersona.EDITOR],
        priority: 'speed'
      }
    });

    // Cost-effective coaching
    this.routes.push({
      primary: this.models.get('gpt-3.5-turbo')!,
      fallbacks: [this.models.get('gpt-4o-mini')!],
      criteria: {
        intent: [AIIntent.PROVIDE_ENCOURAGEMENT, AIIntent.SET_WRITING_GOALS],
        persona: [AIPersona.COACH],
        priority: 'cost'
      }
    });
  }

  private async isModelAvailable(model: ModelConfig): Promise<boolean> {
    // Check model health/availability
    // In real implementation, this would ping the model endpoint
    return true;
  }

  private isWithinBudget(model: ModelConfig, budget?: number): boolean {
    if (!budget) return true;
    // Estimate cost for average request
    const estimatedCost = model.costPerToken * 1000; // Assume 1k tokens
    return estimatedCost <= budget;
  }

  private getDefaultRoute(intent: AIIntent, persona: AIPersona, priority: string): { model: ModelConfig; fallbacks: ModelConfig[] } {
    // Default to balanced model
    const primary = this.models.get('gpt-4o-mini')!;
    const fallbacks = [this.models.get('gpt-3.5-turbo')!];
    return { model: primary, fallbacks };
  }
}

export { ModelRouter, ModelConfig, ModelRoute };"