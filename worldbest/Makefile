# WorldBest Platform Makefile
# Convenient commands for development and deployment

.PHONY: help setup install build dev test lint format clean docker-build docker-up docker-down migrate seed

# Default target
help: ## Show this help message
	@echo "WorldBest Platform - Available Commands"
	@echo "======================================"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

setup: ## Run initial setup (install deps, setup env, start services)
	@echo "🚀 Setting up WorldBest development environment..."
	./setup.sh

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	pnpm install

build: ## Build all packages and services
	@echo "🔨 Building all packages..."
	pnpm build

dev: ## Start development servers
	@echo "🚀 Starting development servers..."
	pnpm dev

test: ## Run all tests
	@echo "🧪 Running tests..."
	pnpm test

test-watch: ## Run tests in watch mode
	@echo "🧪 Running tests in watch mode..."
	pnpm test:watch

lint: ## Run linting
	@echo "🔍 Running linter..."
	pnpm lint

format: ## Format code
	@echo "💅 Formatting code..."
	pnpm format

type-check: ## Run TypeScript type checking
	@echo "🔍 Running type check..."
	pnpm type-check

##@ Database

migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	pnpm --filter @worldbest/database migrate

migrate-reset: ## Reset database and run migrations
	@echo "🗄️ Resetting database and running migrations..."
	pnpm --filter @worldbest/database migrate:reset

seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	pnpm --filter @worldbest/database seed

db-studio: ## Open Prisma Studio
	@echo "🎨 Opening Prisma Studio..."
	pnpm --filter @worldbest/database studio

##@ Docker

docker-build: ## Build all Docker images
	@echo "🐳 Building Docker images..."
	docker-compose build

docker-up: ## Start all services with Docker Compose
	@echo "🐳 Starting services with Docker Compose..."
	docker-compose up -d

docker-down: ## Stop all Docker services
	@echo "🐳 Stopping Docker services..."
	docker-compose down

docker-logs: ## View Docker logs
	@echo "📋 Viewing Docker logs..."
	docker-compose logs -f

docker-dev: ## Start development environment with Docker
	@echo "🐳 Starting development environment..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

docker-clean: ## Clean up Docker containers and volumes
	@echo "🧹 Cleaning up Docker..."
	docker-compose down -v
	docker system prune -f

##@ Services

start-infra: ## Start only infrastructure services (DB, Redis, etc.)
	@echo "🏗️ Starting infrastructure services..."
	docker-compose up -d postgres mongodb redis rabbitmq minio

stop-infra: ## Stop infrastructure services
	@echo "🏗️ Stopping infrastructure services..."
	docker-compose stop postgres mongodb redis rabbitmq minio

start-monitoring: ## Start monitoring services (Prometheus, Grafana)
	@echo "📊 Starting monitoring services..."
	docker-compose up -d prometheus grafana

##@ Production

build-prod: ## Build for production
	@echo "🏭 Building for production..."
	NODE_ENV=production pnpm build

deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	# Add staging deployment commands here

deploy-prod: ## Deploy to production environment
	@echo "🚀 Deploying to production..."
	# Add production deployment commands here

##@ Utilities

clean: ## Clean all build artifacts and node_modules
	@echo "🧹 Cleaning build artifacts..."
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true

reset: clean ## Reset entire development environment
	@echo "🔄 Resetting development environment..."
	docker-compose down -v
	rm -f .env
	$(MAKE) setup

check-env: ## Check environment configuration
	@echo "🔍 Checking environment configuration..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "✅ Environment configuration looks good"

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -f http://localhost:3001/health || echo "❌ Auth service unhealthy"
	@curl -f http://localhost:3002/health || echo "❌ Project service unhealthy"
	@curl -f http://localhost:3003/health || echo "❌ AI service unhealthy"
	@curl -f http://localhost:3004/health || echo "❌ Export service unhealthy"
	@curl -f http://localhost:3005/health || echo "❌ Billing service unhealthy"

##@ Code Quality

security-audit: ## Run security audit
	@echo "🔒 Running security audit..."
	pnpm audit

update-deps: ## Update all dependencies
	@echo "📦 Updating dependencies..."
	pnpm update --recursive

check-updates: ## Check for available updates
	@echo "🔍 Checking for available updates..."
	pnpm outdated --recursive

##@ Documentation

docs-build: ## Build documentation
	@echo "📚 Building documentation..."
	# Add documentation build commands here

docs-serve: ## Serve documentation locally
	@echo "📚 Serving documentation..."
	# Add documentation serve commands here

##@ Backup & Restore

backup-db: ## Backup database
	@echo "💾 Backing up database..."
	docker exec worldbest-postgres pg_dump -U worldbest worldbest > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database (requires BACKUP_FILE variable)
	@echo "📥 Restoring database..."
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Please specify BACKUP_FILE variable"; \
		exit 1; \
	fi
	docker exec -i worldbest-postgres psql -U worldbest worldbest < $(BACKUP_FILE)

##@ Quick Commands

quick-start: install start-infra migrate build ## Quick start for new developers
	@echo "⚡ Quick start completed! Run 'make dev' to start development servers."

full-reset: docker-clean clean setup ## Full reset of the development environment
	@echo "🔄 Full reset completed!"