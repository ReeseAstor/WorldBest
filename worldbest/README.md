# WorldBest Platform

> A production-ready, scalable commercial membership-tier platform for writers combining Story Bibles, AI-assisted content generation, collaboration tools, publishing capabilities, and analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-development-yellow.svg)

## 🚀 Quick Start

Get up and running in minutes:

```bash
# Clone the repository
git clone https://github.com/your-org/worldbest.git
cd worldbest

# Run the setup script (handles everything)
./setup.sh

# Start development servers
make dev
# or
pnpm dev
```

**That's it!** The application will be available at http://localhost:3000

### Alternative Setup

If you prefer manual setup:

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start infrastructure services
make start-infra

# 4. Run database migrations
make migrate

# 5. Build packages
pnpm build

# 6. Start development
pnpm dev
```

## 🎯 Overview

WorldBest is an end-to-end author workflow platform that helps writers plan, generate, revise, and publish higher-quality fiction faster, while preserving author control, provenance, and IP. The platform combines powerful worldbuilding tools, AI-assisted writing with multiple personas, real-time collaboration, and professional publishing capabilities.

### Key Features

- **📚 Story Bible Management** - Comprehensive project, book, and chapter organization
- **👥 Character Development** - Rich character profiles with relationship graphs and arc tracking
- **🗺️ Worldbuilding System** - Locations, cultures, timelines, languages, and economies
- **🤖 AI Orchestration** - Three specialized personas (Muse, Editor, Coach) for different writing needs
- **✍️ Rich Editor** - Real-time collaboration with inline AI suggestions and version control
- **🔒 Content Safety** - Placeholder system for sensitive content with customizable rendering
- **📤 Export Capabilities** - Multiple formats including ePub, PDF, and JSON with selective redaction
- **💳 Flexible Billing** - Tiered subscriptions with usage-based upgrades and team plans
- **📊 Analytics Dashboard** - Track progress, word count, and AI token usage

## 🏗️ Architecture

The platform follows a microservices architecture for scalability and fault isolation:

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   Web    │  │  Mobile  │  │   CLI    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (Nginx)                    │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Microservices                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Auth   │  │ Project  │  │    AI    │             │
│  │ Service  │  │ Service  │  │Orchestr. │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Export  │  │ Billing  │  │  Safety  │             │
│  │ Service  │  │ Service  │  │ Service  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Pinecone │  │  MinIO   │  │RabbitMQ  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL 16
- MongoDB 7.0
- Redis 7

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/worldbest.git
cd worldbest
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services**
```bash
docker-compose up -d postgres mongodb redis rabbitmq minio
```

5. **Run database migrations**
```bash
pnpm -F @worldbest/database migrate
```

6. **Seed the database (optional)**
```bash
pnpm -F @worldbest/database seed
```

7. **Start development servers**
```bash
pnpm dev
```

The application will be available at:
- Web Frontend: http://localhost:3000
- API Gateway: http://localhost/api
- Admin Dashboard: http://localhost:3000/admin

### Using Docker

For a complete containerized setup:

```bash
docker-compose up
```

This will start all services including the database, cache, message queue, and application services.

## 📦 Project Structure

```
worldbest/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── admin/               # Admin dashboard
├── services/
│   ├── auth/                # Authentication service
│   ├── project/             # Project management service
│   ├── bible/               # Worldbuilding service
│   ├── character/           # Character management service
│   ├── scene/               # Scene and text management
│   ├── ai-orchestrator/     # AI integration service
│   ├── export/              # Export service
│   ├── billing/             # Billing and subscription service
│   ├── safety/              # Content moderation service
│   └── analytics/           # Analytics service
├── packages/
│   ├── database/            # Database schemas and clients
│   ├── shared-types/        # Shared TypeScript types
│   ├── ui-components/       # Shared UI components
│   └── utils/               # Shared utilities
├── infrastructure/
│   ├── docker/              # Docker configurations
│   ├── k8s/                 # Kubernetes manifests
│   ├── terraform/           # Infrastructure as Code
│   ├── nginx/               # API Gateway configuration
│   └── monitoring/          # Prometheus and Grafana configs
└── docs/                    # Documentation
```

## 💳 Membership Tiers

| Tier | Monthly Price | Features |
|------|--------------|----------|
| **Story Starter** | Free | 2 projects, 10 AI prompts/day, basic editor |
| **Solo Author** | $15 | 10 projects, unlimited prompts, full export |
| **Pro Creator** | $35 | Unlimited projects, voice/OCR, analytics |
| **Studio Team** | $149 | 5 seats, RBAC, API access, priority support |
| **Enterprise** | Custom | SSO, SLA, white-label, dedicated support |

## 🔧 Configuration

### Environment Variables

Key environment variables for configuration:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/worldbest
MONGODB_URI=mongodb://localhost:27017/worldbest
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
PINECONE_API_KEY=your-pinecone-key

# Billing
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## 📊 Monitoring

The platform includes comprehensive monitoring:

- **Metrics**: Prometheus + Grafana dashboards
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: OpenTelemetry with Jaeger
- **Alerts**: PagerDuty integration

Access monitoring dashboards:
- Grafana: http://localhost:3030
- Prometheus: http://localhost:9090
- Kibana: http://localhost:5601

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy with Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Apply configurations
kubectl apply -f infrastructure/k8s/configmap.yaml
kubectl apply -f infrastructure/k8s/secrets.yaml

# Deploy services
kubectl apply -f infrastructure/k8s/deployments/

# Apply ingress
kubectl apply -f infrastructure/k8s/ingress.yaml
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing on pull requests
- Docker image building and pushing
- Kubernetes deployment on merge to main
- Database migration automation

## 🔒 Security

### Security Features

- **Authentication**: JWT-based auth with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS for transit, AES-256 for data at rest
- **Rate Limiting**: Configurable per-endpoint rate limits
- **Input Validation**: Comprehensive input sanitization
- **Content Safety**: AI-powered content moderation
- **Audit Logging**: Complete audit trail for compliance

### Security Best Practices

1. Always use HTTPS in production
2. Rotate secrets regularly
3. Enable 2FA for admin accounts
4. Regular security updates
5. Implement CSP headers
6. Use parameterized queries
7. Regular security audits

## 📖 API Documentation

### Authentication

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

### Projects

```http
GET /api/v1/projects
Authorization: Bearer <token>

POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Novel",
  "genre": "Fantasy",
  "synopsis": "An epic adventure..."
}
```

### AI Generation

```http
POST /api/v1/ai/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "intent": "generate_scene",
  "persona": "muse",
  "projectId": "proj_123",
  "contextRefs": ["scene_456", "character_789"],
  "params": {
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

Full API documentation available at: http://localhost/api/docs

## 🧭 Deep Dive Docs

- Technical Deep Dive: docs/deep-dive/index.md

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write comprehensive tests
- Document complex logic
- Keep commits atomic and descriptive

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.worldbest.ai](https://docs.worldbest.ai)
- **Discord Community**: [discord.gg/worldbest](https://discord.gg/worldbest)
- **Email Support**: support@worldbest.ai
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/worldbest/issues)

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude models
- The open-source community for amazing tools
- Our beta testers and early adopters

## 📊 Development Status

### ✅ Completed
- **Frontend Application** - Complete Next.js web app with authentication, dashboard, and UI components
- **Authentication Service** - JWT-based auth with session management, 2FA, and security features
- **Database Schema** - Comprehensive Prisma schema with all entities and relationships
- **Infrastructure Setup** - Docker Compose, Kubernetes manifests, and deployment configs
- **Development Environment** - Setup scripts, Makefile, and development tooling
- **Shared Packages** - TypeScript types, UI components, and utilities

### 🚧 In Progress
- **Project Management Service** - Story bibles, characters, and worldbuilding APIs

### 📋 Planned
- **AI Orchestrator Service** - Three personas (Muse, Editor, Coach) with generation capabilities
- **Export Service** - ePub, PDF, and other format generation
- **Billing Service** - Stripe integration and subscription management
- **Real-time Features** - WebSocket implementation for collaboration
- **Advanced UI Components** - Rich text editor, drag-and-drop interfaces

## 🚀 Roadmap

### Q1 2024
- [x] Core platform MVP
- [x] Authentication system
- [x] Database architecture
- [x] Development environment
- [ ] Basic AI integration
- [ ] Payment processing

### Q2 2024
- [ ] Advanced AI personas
- [ ] Real-time collaboration
- [ ] Mobile app (React Native)
- [ ] Plugin marketplace

### Q3 2024
- [ ] Voice input/output
- [ ] Publishing integrations
- [ ] Advanced analytics
- [ ] Custom model training

### Q4 2024
- [ ] Enterprise features
- [ ] White-label options
- [ ] International expansion
- [ ] AI audiobook generation

---

Built with ❤️ by the WorldBest Team