import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { AIIntent, AIPersona } from '@worldbest/shared-types';
import { AIService } from './services/ai-service';
import { logger } from './utils/logger';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

const port = parseInt(process.env.PORT || '3003', 10);

// Initialize services
const aiService = new AIService();

const GenerationSchema = z.object({
  intent: z.nativeEnum(AIIntent),
  persona: z.nativeEnum(AIPersona),
  projectId: z.string().min(1),
  contextRefs: z.array(z.object({
    type: z.string(),
    id: z.string(),
    version: z.string().optional(),
    fields: z.array(z.string()).optional(),
  })).default([]),
  params: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    top_p: z.number().min(0).max(1).optional(),
    frequency_penalty: z.number().optional(),
    presence_penalty: z.number().optional(),
    deterministic: z.boolean().optional(),
    stream: z.boolean().optional(),
    target_length: z.enum(['short', 'medium', 'long']).optional(),
    style_intensity: z.number().optional(),
    model_override: z.string().optional(),
  }).partial().default({}),
  safety_overrides: z.any().optional(),
  idempotency_key: z.string().optional(),
});
type GenerationBody = z.infer<typeof GenerationSchema>;

app.get('/health', async () => ({ status: 'ok' }));

app.post('/api/v1/ai/generate', async (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) => {
  try {
    const parseResult = GenerationSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.code(400);
      return { 
        success: false, 
        error: { 
          code: 'VAL_002', 
          message: 'Invalid request', 
          details: parseResult.error.flatten(), 
          timestamp: new Date() 
        } 
      };
    }

    const body: GenerationBody = parseResult.data;

    // Initialize database connections
    const prismaClient = PrismaClient.getInstance();
    await PrismaClient.connect();
    await MongoDBClient.connect();

    // Generate content using AI service
    const result = await aiService.generateContent({
      intent: body.intent,
      persona: body.persona,
      projectId: body.projectId,
      contextRefs: body.contextRefs,
      params: body.params,
      safety_overrides: body.safety_overrides,
      idempotency_key: body.idempotency_key,
    });

    logger.info('AI generation completed', {
      requestId: result.request_id,
      persona: result.persona,
      intent: result.intent,
      tokens: result.usage.total_tokens,
      cost: result.usage.estimated_cost,
      cached: result.cached,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('AI generation failed:', error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AI_001',
        message: 'AI generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
    };
  }
});

// Additional AI endpoints
app.post('/api/v1/ai/analyze', async (
  request: FastifyRequest<{ Body: { text: string; analysisType: string } }>,
  reply: FastifyReply
) => {
  try {
    const { text, analysisType } = request.body;
    
    // Mock analysis - in real implementation, this would use AI
    const analysis = {
      sentiment: 'positive',
      readability: 'intermediate',
      suggestions: ['Consider adding more dialogue', 'The pacing could be improved'],
      wordCount: text.split(' ').length,
      characterCount: text.length,
    };

    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    logger.error('AI analysis failed:', error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AI_002',
        message: 'AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
    };
  }
});

app.post('/api/v1/ai/suggest', async (
  request: FastifyRequest<{ Body: { context: any; suggestionType: string } }>,
  reply: FastifyReply
) => {
  try {
    const { context, suggestionType } = request.body;
    
    // Mock suggestions - in real implementation, this would use AI
    const suggestions = {
      plot: ['Add a plot twist', 'Introduce a new character', 'Create a conflict'],
      character: ['Develop the backstory', 'Add a flaw', 'Create a relationship'],
      dialogue: ['Make it more natural', 'Add subtext', 'Vary the speech patterns'],
      description: ['Add sensory details', 'Show don\'t tell', 'Use metaphors'],
    };

    return {
      success: true,
      data: {
        suggestions: suggestions[suggestionType] || [],
        confidence: 0.8,
      },
    };
  } catch (error) {
    logger.error('AI suggestions failed:', error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AI_003',
        message: 'AI suggestions failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
    };
  }
});

app.listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`AI Orchestrator listening on :${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

