## Data Layer Deep Dive

### PostgreSQL (Prisma)

- Canonical entities: users, teams, projects, books, chapters, scenes, versions
- Worldbuilding: characters, relationships, locations, cultures, languages, economies
- Billing: subscriptions, invoices, usage, credits, referrals
- AI: generations, prompt templates

Key models (see `packages/database/prisma/schema.prisma`):

```1:28:/workspace/worldbest/packages/database/src/prisma-client.ts
export class PrismaClient {
  private static instance: PrismaClientBase;
  static getInstance(): PrismaClientBase { /* singleton with logs */ }
}
```

### MongoDB (Mongoose)

- High-churn, collaborative data: `SceneDraft`, `CollaborationSession`, `AnalyticsEvent`
- AI context caching and plugin metadata

```1:20:/workspace/worldbest/packages/database/src/mongodb/schemas.ts
export interface ISceneDraft extends Document { /* draft content + metadata */ }
export const SceneDraft = mongoose.model<ISceneDraft>('SceneDraft', SceneDraftSchema);
```

### Redis

- Sessions, caches, rate limiting, queues, pub/sub, locks, metrics

```1:20:/workspace/worldbest/packages/database/src/redis/client.ts
export class RedisClient { /* getInstance/connect/locks/ratelimit/pubsub */ }
```

### Vector DB (Pinecone)

- Embeddings for semantic search, continuity checks, relationship analysis

```1:30:/workspace/worldbest/packages/database/src/vector/client.ts
export class VectorDBClient { /* upsert/search/findSimilar/project ops */ }
```

### Data Design Rationale

- Normalize transactional core in Postgres; use JSON arrays for flexible lists where appropriate
- Store collaborative/temporal data in Mongo for simpler append-only histories and OT logs
- Redis provides low-latency coordination and backpressure controls
- Vector DB decouples search from transactional queries

### Migration & Seeding

- Prisma migrations via package script; seed includes baseline personas/templates and demo data

