# WorldBest Development Guide

This guide will help you set up and run the WorldBest platform for development.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL 16
- MongoDB 7.0
- Redis 7

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd worldbest
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
# Start databases and supporting services
docker-compose up -d postgres mongodb redis rabbitmq minio

# Wait for services to be ready (about 30 seconds)
```

### 4. Database Setup

```bash
# Run migrations
pnpm -F @worldbest/database migrate

# Seed the database
pnpm -F @worldbest/database seed
```

### 5. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individual services
pnpm -F @worldbest/web dev          # Frontend
pnpm -F @worldbest/auth-service dev # Auth service
pnpm -F @worldbest/project-service dev # Project service
```

## Project Structure

```
worldbest/
├── apps/                          # Applications
│   ├── web/                      # Next.js frontend
│   └── admin/                    # Admin dashboard (planned)
├── services/                     # Microservices
│   ├── auth/                     # Authentication service
│   ├── project/                  # Project management service
│   ├── ai-orchestrator/          # AI integration service
│   ├── export/                   # Export service
│   ├── billing/                  # Billing service
│   ├── safety/                   # Content moderation service
│   └── analytics/                # Analytics service
├── packages/                     # Shared packages
│   ├── database/                 # Database schemas and clients
│   ├── shared-types/             # TypeScript type definitions
│   ├── ui-components/            # Shared UI components (planned)
│   └── utils/                    # Shared utilities (planned)
└── infrastructure/               # Infrastructure configuration
    ├── docker/                   # Docker configurations
    ├── k8s/                      # Kubernetes manifests
    ├── nginx/                    # API Gateway configuration
    └── monitoring/               # Monitoring setup
```

## Services Overview

### Web Frontend (`apps/web`)
- **Port**: 3000
- **Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Features**: Landing page, authentication, project management, writing interface

### Auth Service (`services/auth`)
- **Port**: 3001
- **Technology**: Express.js, TypeScript, JWT, bcrypt
- **Features**: User registration, login, 2FA, OAuth, password reset

### Project Service (`services/project`)
- **Port**: 3002
- **Technology**: Express.js, TypeScript, Prisma
- **Features**: Project management, story bibles, character management

### AI Orchestrator (`services/ai-orchestrator`)
- **Port**: 3003
- **Technology**: Express.js, TypeScript, OpenAI, Anthropic
- **Features**: AI writing assistants, content generation, persona management

### Export Service (`services/export`)
- **Port**: 3004
- **Technology**: Express.js, TypeScript, Puppeteer, Calibre
- **Features**: Export to ePub, PDF, DOCX, and other formats

### Billing Service (`services/billing`)
- **Port**: 3005
- **Technology**: Express.js, TypeScript, Stripe
- **Features**: Subscription management, payment processing, invoicing

## Database Schema

The platform uses a hybrid database approach:

- **PostgreSQL**: Primary database for structured data (users, projects, billing)
- **MongoDB**: Document store for unstructured data (AI generations, activity logs)
- **Redis**: Caching and session storage
- **Pinecone**: Vector database for AI embeddings and similarity search

## API Documentation

### Authentication Endpoints

```http
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/me
POST /api/v1/auth/password-reset
POST /api/v1/auth/verify-email
```

### Project Endpoints

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

## Development Workflow

### 1. Making Changes

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Commit your changes
6. Create a pull request

### 2. Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm -F @worldbest/auth-service test

# Run tests in watch mode
pnpm test:watch
```

### 3. Linting and Formatting

```bash
# Run ESLint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code with Prettier
pnpm format
```

### 4. Database Operations

```bash
# Generate Prisma client
pnpm -F @worldbest/database generate

# Run migrations
pnpm -F @worldbest/database migrate

# Reset database
pnpm -F @worldbest/database migrate:reset

# Seed database
pnpm -F @worldbest/database seed

# Open Prisma Studio
pnpm -F @worldbest/database studio
```

## Environment Variables

Key environment variables you need to configure:

```env
# Database
DATABASE_URL=postgresql://worldbest:worldbest123@localhost:5432/worldbest
MONGODB_URI=mongodb://worldbest:worldbest123@localhost:27017/worldbest
REDIS_URL=redis://:worldbest123@localhost:6379

# JWT Secrets (generate secure keys for production)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
PINECONE_API_KEY=your-pinecone-api-key

# Email (for development, use a service like Mailtrap)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000-3007 are available
2. **Database connection**: Ensure PostgreSQL, MongoDB, and Redis are running
3. **Permission errors**: Check file permissions in the project directory
4. **Memory issues**: Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

### Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Architecture Decisions

- **Microservices**: Each service has a single responsibility
- **TypeScript**: Type safety across the entire platform
- **Prisma**: Type-safe database access
- **Next.js**: Full-stack React framework for the frontend
- **Docker**: Containerized services for easy deployment
- **Nginx**: API gateway and load balancer

## Performance Considerations

- **Database indexing**: Proper indexes on frequently queried fields
- **Caching**: Redis for session and data caching
- **Rate limiting**: API rate limiting to prevent abuse
- **Connection pooling**: Database connection pooling
- **Compression**: Gzip compression for API responses

## Security

- **JWT tokens**: Secure authentication with refresh tokens
- **Password hashing**: bcrypt for password security
- **Rate limiting**: Prevent brute force attacks
- **CORS**: Configured for specific origins
- **Input validation**: Comprehensive input validation
- **SQL injection**: Prisma prevents SQL injection
- **XSS protection**: Security headers and input sanitization

## Monitoring

- **Health checks**: Each service has health check endpoints
- **Logging**: Structured logging with Winston
- **Metrics**: Prometheus metrics collection
- **Tracing**: OpenTelemetry for distributed tracing

## Next Steps

1. Complete the remaining services (AI orchestrator, export, billing)
2. Implement the admin dashboard
3. Add comprehensive testing
4. Set up CI/CD pipeline
5. Add monitoring and alerting
6. Performance optimization
7. Security audit
8. Documentation completion