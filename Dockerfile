# =============================================================================
# Stage 1: Build frontend
# =============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY todo-frontend/package.json todo-frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile

COPY todo-frontend/ ./
RUN yarn build

# =============================================================================
# Stage 2: Build backend
# =============================================================================
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

COPY todo-backend/package.json todo-backend/yarn.lock* ./
RUN yarn install --frozen-lockfile

COPY todo-backend/ ./
RUN yarn build

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

COPY --from=backend-builder --chown=nodeuser:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=nodeuser:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=nodeuser:nodejs /app/backend/package.json ./

COPY --from=frontend-builder --chown=nodeuser:nodejs /app/frontend/dist ./public

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
