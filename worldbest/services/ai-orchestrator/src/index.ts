import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { AIIntent, AIPersona } from '@worldbest/shared-types';
import { AIOrchestrator } from './services/orchestrator';
import { config } from './config';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

const port = config.port;
const orchestrator = new AIOrchestrator();

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

// Health check endpoint
app.get('/health', async () => ({ 
  status: 'ok',
  service: 'ai-orchestrator',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// Main AI generation endpoint
app.post('/api/v1/ai/generate', async (
  request: FastifyRequest<{ Body: unknown; Headers: { authorization?: string } }>,
  reply: FastifyReply
) => {
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

  // Extract user ID from authorization header (simplified for demo)
  // In production, this should use proper JWT verification
  const authHeader = request.headers.authorization;
  const userId = authHeader ? 'user_from_token' : 'user_demo';

  try {
    // Initialize database connections
    await PrismaClient.connect();
    await MongoDBClient.connect();

    // Use the enhanced orchestrator
    const result = await orchestrator.generateContent(
      userId,
      body.projectId,
      body.intent,
      body.persona,
      body.contextRefs,
      body.params,
      body.safety_overrides,
      body.idempotency_key
    );

    if (!result.success) {
      reply.code(500);
      return result;
    }

    return result;
  } catch (error) {
    app.log.error('AI generation error:', error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'Internal server error during AI generation',
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

