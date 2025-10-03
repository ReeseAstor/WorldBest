## AI Orchestrator Service

Fastify-based service exposing AI endpoints.

### Endpoints

- POST `/api/v1/ai/generate`

Request example:

```bash
curl -X POST http://localhost:3003/api/v1/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "intent": "generate_scene",
    "persona": "muse",
    "projectId": "proj_demo",
    "contextRefs": [],
    "params": { "temperature": 0.7, "maxTokens": 800 }
  }'
```

### Development

```bash
pnpm -F @worldbest/ai-orchestrator dev
```

