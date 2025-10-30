import { AIProvider, GenerationParams, GenerationResult } from '../types';
import { config } from '../config';

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.anthropic.apiKey;
    this.baseUrl = config.anthropic.baseUrl;
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    let prompt = params.prompt;
    if (params.systemPrompt) {
      prompt = `${params.systemPrompt}\n\nHuman: ${params.prompt}\n\nAssistant:`;
    } else {
      prompt = `Human: ${params.prompt}\n\nAssistant:`;
    }

    const requestBody = {
      model: params.model || config.anthropic.defaultModel,
      prompt,
      max_tokens_to_sample: params.maxTokens || config.anthropic.maxTokens,
      temperature: params.temperature ?? 0.7,
      top_p: params.topP ?? 1,
      stop_sequences: params.stop || ['\n\nHuman:'],
      stream: params.stream ?? false,
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/complete`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      // Anthropic doesn't provide token counts in the same way, so we estimate
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(data.completion.length / 4);
      
      return {
        content: data.completion.trim(),
        finishReason: data.stop_reason === 'stop_sequence' ? 'stop' : data.stop_reason as any,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
        model: data.model,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Anthropic doesn't provide embedding endpoints, so we fallback to OpenAI
    const openaiProvider = new (await import('./openai')).OpenAIProvider();
    return openaiProvider.generateEmbedding(text);
  }

  estimateCost(params: GenerationParams): number {
    // Rough cost estimation for Anthropic
    const model = params.model || config.anthropic.defaultModel;
    const maxTokens = params.maxTokens || config.anthropic.maxTokens;
    
    // Estimated cost per 1K tokens (these are approximate rates)
    const costPer1K = model.includes('claude-3-opus') ? 0.075 : 
                      model.includes('claude-3-sonnet') ? 0.015 : 0.008;
    
    // Estimate prompt tokens
    const estimatedPromptTokens = Math.ceil(params.prompt.length / 4);
    const estimatedTotalTokens = estimatedPromptTokens + maxTokens;
    
    return (estimatedTotalTokens / 1000) * costPer1K;
  }
}