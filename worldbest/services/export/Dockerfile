# Multi-stage build for Export Service
FROM node:18-alpine as builder

# Install system dependencies for PDF generation and image processing
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package files
COPY services/export/package.json ./services/export/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/export ./services/export
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database

# Build the service
RUN pnpm --filter @worldbest/export-service build

# Production stage
FROM node:18-alpine as production

# Install runtime dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S export -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=export:nodejs /app/services/export/dist ./dist
COPY --from=builder --chown=export:nodejs /app/services/export/package.json ./
COPY --from=builder --chown=export:nodejs /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p /app/temp /app/exports && chown -R export:nodejs /app

USER export

EXPOSE 3004

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]