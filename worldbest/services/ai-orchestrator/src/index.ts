import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { PrismaClient, MongoDBClient } from '@worldbest/database';
import { AIIntent, AIPersona } from '@worldbest/shared-types';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

const port = parseInt(process.env.PORT || '3003', 10);

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
  const parseResult = GenerationSchema.safeParse(request.body);
  if (!parseResult.success) {
    reply.code(400);
    return { success: false, error: { code: 'VAL_002', message: 'Invalid request', details: parseResult.error.flatten(), timestamp: new Date() } };
  }

  const body: GenerationBody = parseResult.data;

  const prismaClient = PrismaClient.getInstance();
  await PrismaClient.connect();
  await MongoDBClient.connect();

  const startTime = Date.now();

  // Stubbed generation result
  const content = `Stub response for intent ${body.intent} by persona ${body.persona}.`;
  const alternatives: string[] = [];
  const model = body.params.model_override || 'gpt-4o-mini';
  const temperature = body.params.temperature ?? 0.7;

  // Persist AIGeneration log to Postgres
  const generation = await prismaClient.aIGeneration.create({
    data: {
      userId: 'user_demo',
      projectId: body.projectId,
      requestId: body.idempotency_key || `req_${Date.now()}`,
      persona: body.persona,
      intent: body.intent,
      content,
      alternatives,
      model,
      temperature,
      finishReason: 'stop',
      contextHash: 'context_stub',
      processingTimeMs: Date.now() - startTime,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      cached: false,
    },
  });

  // Cache minimal context in Mongo if provided
  if (body.contextRefs.length > 0) {
    await MongoDBClient.cacheAIContext({
      projectId: body.projectId,
      contextType: 'project',
      contextId: body.projectId,
      contextHash: 'context_stub',
      summary: 'stub summary',
      keyPoints: [],
      entities: { characters: [], locations: [], events: [] },
      metadata: { refs: body.contextRefs },
      ttl: 3600,
    });
  }

  return {
    success: true,
    data: {
      id: generation.id,
      request_id: generation.requestId,
      persona: generation.persona,
      intent: generation.intent,
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
    },
  };
});

app.listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`AI Orchestrator listening on :${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

