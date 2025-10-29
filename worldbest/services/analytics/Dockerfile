# Multi-stage build for Analytics Service
FROM node:18-alpine as builder

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package files
COPY services/analytics/package.json ./services/analytics/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/analytics ./services/analytics
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database

# Build the service
RUN pnpm --filter @worldbest/analytics-service build

# Production stage
FROM node:18-alpine as production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S analytics -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=analytics:nodejs /app/services/analytics/dist ./dist
COPY --from=builder --chown=analytics:nodejs /app/services/analytics/package.json ./
COPY --from=builder --chown=analytics:nodejs /app/node_modules ./node_modules

USER analytics

EXPOSE 3007

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]