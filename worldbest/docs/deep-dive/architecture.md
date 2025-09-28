## Architecture Deep Dive

### Goals

- Strong domain boundaries with service isolation
- Scalable read/write paths for collaborative editing and AI generation
- Observability-first (metrics, logs, tracing)
- Cost-aware AI usage with caching and batching

### System Overview

The platform follows a microservices architecture with an API gateway in front. Core services include `auth`, `project`, `ai-orchestrator`, `export`, and `billing`. Shared packages centralize types and data access adapters.

```
Web/Clients -> Nginx (gateway) -> Services (auth, project, ai, export, billing) -> Data (Postgres, Mongo, Redis, VectorDB, MinIO)
```

### Service Responsibilities

- Auth: identity, sessions, JWT, RBAC
- Project: projects/books/chapters/scenes CRUD, worldbuilding entities
- AI Orchestrator: prompt construction, persona flows, tool use, semantic context
- Export: renders to ePub/PDF/Docx/JSON; stores artifacts in MinIO
- Billing: Stripe integration, subscriptions, webhooks, usage tracking

### Data Access Patterns

- Transactional data in PostgreSQL via Prisma
- Draft/collab and high-churn docs in MongoDB via Mongoose
- Caching, queues, realtime pub/sub, and rate limiting in Redis
- Semantic search and similarity via Pinecone
- Binary artifacts via MinIO (S3-compatible)

### Async Workflows

- AI requests publish jobs via RabbitMQ; workers process and update status
- Export jobs stream progress and upload final artifacts

### Observability

- Metrics: Prometheus; Dashboards: Grafana
- Logs: ELK stack (future integration)
- Tracing: OpenTelemetry + Jaeger (planned)

### Extensibility

- Plugin model (prompt/export/import/analysis) backed by MongoDB metadata
- Prompt templates and personas versioned in Postgres for auditability

