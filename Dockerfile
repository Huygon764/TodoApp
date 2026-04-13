# syntax=docker/dockerfile:1.6

# =============================================================================
# Stage 1: Build frontend
# =============================================================================
FROM oven/bun:1.2-alpine AS frontend-builder

WORKDIR /app/frontend

COPY todo-frontend/package.json todo-frontend/bun.lock* ./
RUN bun install --frozen-lockfile

COPY todo-frontend/ ./
RUN bun run build

# =============================================================================
# Stage 2: Production-only backend dependencies
# =============================================================================
FROM oven/bun:1.2-alpine AS backend-deps

WORKDIR /app/backend

COPY todo-backend/package.json todo-backend/bun.lock* ./
RUN bun install --frozen-lockfile --production

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

COPY --from=backend-deps     --chown=bunuser:nodejs /app/backend/node_modules ./node_modules
COPY --chown=bunuser:nodejs   todo-backend/package.json                        ./package.json
COPY --chown=bunuser:nodejs   todo-backend/tsconfig.json                       ./tsconfig.json
COPY --chown=bunuser:nodejs   todo-backend/src                                 ./src
COPY --from=frontend-builder --chown=bunuser:nodejs /app/frontend/dist         ./public

USER bunuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "src/server.ts"]
