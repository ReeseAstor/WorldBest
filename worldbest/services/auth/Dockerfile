# Multi-stage Dockerfile for Auth Service

# Base stage for dependencies
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY services/auth/package.json ./services/auth/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/auth/node_modules ./services/auth/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules

# Copy source code
COPY . .

# Build shared packages first
RUN pnpm --filter @worldbest/shared-types build
RUN pnpm --filter @worldbest/database build

# Build the auth service
ENV NODE_ENV production
RUN pnpm --filter @worldbest/auth-service build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 authservice

# Copy built application
COPY --from=builder --chown=authservice:nodejs /app/services/auth/dist ./services/auth/dist
COPY --from=builder --chown=authservice:nodejs /app/services/auth/package.json ./services/auth/
COPY --from=builder --chown=authservice:nodejs /app/packages ./packages
COPY --from=builder --chown=authservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=authservice:nodejs /app/package.json ./

USER authservice

EXPOSE 3001

ENV PORT 3001

CMD ["node", "services/auth/dist/index.js"]
