FROM node:20-alpine AS builder
WORKDIR /repo
COPY ../../package.json ../../pnpm-workspace.yaml ../../turbo.json ./
COPY ../../worldbest/package.json ./worldbest/package.json
COPY ../../worldbest/tsconfig.json ./worldbest/tsconfig.json
COPY ../../worldbest/packages ./worldbest/packages
COPY ../../worldbest/services/ai-orchestrator ./worldbest/services/ai-orchestrator
RUN corepack enable && corepack prepare pnpm@8.11.0 --activate
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm -F @worldbest/ai-orchestrator build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/worldbest/services/ai-orchestrator/dist ./dist
COPY --from=builder /repo/worldbest/services/ai-orchestrator/package.json ./package.json
RUN corepack enable && corepack prepare pnpm@8.11.0 --activate && pnpm install --prod --frozen-lockfile || true
EXPOSE 3003
CMD ["node", "dist/index.js"]
