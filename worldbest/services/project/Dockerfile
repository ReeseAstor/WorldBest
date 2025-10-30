# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.11.0

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy packages
COPY packages ./packages

# Copy project service
COPY services/project ./services/project

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm -F @worldbest/database build
RUN pnpm -F @worldbest/shared-types build

# Build project service
RUN pnpm -F @worldbest/project-service build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.11.0

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/project/dist ./dist
COPY --from=builder /app/services/project/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

EXPOSE 3002

CMD ["node", "dist/index.js"]