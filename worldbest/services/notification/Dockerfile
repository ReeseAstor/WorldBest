# Multi-stage build for Notification Service
FROM node:18-alpine as builder

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package files
COPY services/notification/package.json ./services/notification/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/notification ./services/notification
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database

# Build the service
RUN pnpm --filter @worldbest/notification-service build

# Production stage
FROM node:18-alpine as production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S notification -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=notification:nodejs /app/services/notification/dist ./dist
COPY --from=builder --chown=notification:nodejs /app/services/notification/package.json ./
COPY --from=builder --chown=notification:nodejs /app/node_modules ./node_modules

USER notification

EXPOSE 3008

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]