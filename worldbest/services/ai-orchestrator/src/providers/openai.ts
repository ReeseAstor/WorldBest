import { AIProvider, GenerationParams, GenerationResult } from '../types';
import { config } from '../config';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.openai.apiKey;
    this.baseUrl = config.openai.baseUrl;
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [];
    
    if (params.systemPrompt) {
      messages.push({
        role: 'system',
        content: params.systemPrompt,
      });
    }
    
    messages.push({
      role: 'user',
      content: params.prompt,
    });

    const requestBody = {
      model: params.model || config.openai.defaultModel,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens || config.openai.maxTokens,
      top_p: params.topP ?? 1,
      frequency_penalty: params.frequencyPenalty ?? 0,
      presence_penalty: params.presencePenalty ?? 0,
      stop: params.stop,
      stream: params.stream ?? false,
      n: 1, // Generate single response for now
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      
      return {
        content: choice.message.content,
        finishReason: choice.finish_reason as any,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.context.embeddingModel,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI embedding error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  estimateCost(params: GenerationParams): number {
    // Rough cost estimation based on token count and model
    const model = params.model || config.openai.defaultModel;
    const maxTokens = params.maxTokens || config.openai.maxTokens;
    
    // Estimated cost per 1K tokens (these are approximate rates)
    const costPer1K = model.includes('gpt-4') ? 0.03 : 0.002;
    
    // Estimate prompt tokens (rough approximation)
    const estimatedPromptTokens = Math.ceil(params.prompt.length / 4);
    const estimatedTotalTokens = estimatedPromptTokens + maxTokens;
    
    return (estimatedTotalTokens / 1000) * costPer1K;
  }
}