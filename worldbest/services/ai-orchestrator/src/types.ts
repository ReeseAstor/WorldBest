export interface AIProvider {
  generateText(params: GenerationParams): Promise<GenerationResult>;
  generateEmbedding(text: string): Promise<number[]>;
  estimateCost(params: GenerationParams): number;
}

export interface GenerationParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface GenerationResult {
  content: string;
  alternatives?: string[];
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTimeMs: number;
}

export interface ContextItem {
  id: string;
  type: 'character' | 'location' | 'culture' | 'scene' | 'project' | 'custom';
  title: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  relevanceScore?: number;
}

export interface PersonaConfig {
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  preferredModels: string[];
  contextPriority: string[];
  specialInstructions?: string[];
}

export interface GenerationContext {
  projectId: string;
  userId: string;
  intent: string;
  persona: string;
  contextItems: ContextItem[];
  userPreferences: Record<string, any>;
  safetySettings: Record<string, any>;
}