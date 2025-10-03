## AI Orchestrator Deep Dive

### Personas and Intents

- Personas: muse (creative expansion), editor (polish/consistency), coach (guidance)
- Intents: generate_scene, outline, expand, rewrite, summarize, critique

### Context Assembly

- Pulls canonical context from Postgres (projects/scenes/characters)
- Augments with `AIContextCache` and `SceneDraft` from Mongo
- Retrieves semantic neighbors via `VectorDBClient.searchProjectContent`

### Embeddings and Vector Search

- Uses OpenAI embeddings with Pinecone. See `packages/database/src/vector/client.ts`:

```46:71:/workspace/worldbest/packages/database/src/vector/client.ts
static async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', { /* ... */ });
  const data = await response.json();
  return data.data[0].embedding;
}
```

### Caching and Rate Limiting

- Redis-backed request de-dup, per-user rate limits, and idempotency keys

### Processing Flow

1. Validate and rate-limit request
2. Build prompt (persona + intent + constraints)
3. Fetch semantic context and inline citations
4. Invoke provider (OpenAI/Anthropic)
5. Post-process: safety, placeholders, style constraints
6. Persist `AIGeneration`, update drafts, publish events

### Continuity and Consistency

- Vector-based checks for duplicates, character and location consistency:

```339:414:/workspace/worldbest/packages/database/src/vector/client.ts
static async checkContinuity(projectId: string, sceneText: string, context: { /* ... */})
```

### Extensibility

- Prompt templates versioned with `PromptTemplate`
- Plugin hooks: pre-context, post-generation, moderation

