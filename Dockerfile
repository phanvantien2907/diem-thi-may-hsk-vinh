# ── Base Stage ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── Dependencies Stage ─────────────────────────────────────────────────────────
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build Stage ────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
# Generate types and build production server/client bundles
RUN pnpm exec react-router typegen && pnpm run build

# ── Production Dependencies Stage ──────────────────────────────────────────────
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    # Strip unnecessary files (*.d.ts, sourcemaps, markdown docs, tests) to save ~65MB
    find node_modules -type f \( -name '*.d.ts' -o -name '*.map' -o -name '*.md' -o -name 'README*' -o -name 'CHANGELOG*' -o -name '*.ts' \) -delete && \
    find node_modules -type d \( -name 'test' -o -name 'tests' -o -name '__tests__' \) -exec rm -rf {} + 2>/dev/null || true

# ── Runtime Stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Remove unused package managers from Alpine runtime to save ~22MB
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*

# Security: run as non-root user (node uid 1000)
USER node

# Copy trimmed production node_modules and compiled build outputs
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/package.json ./package.json

EXPOSE 3000

# Launch server with Node using the compiled React Router runner
CMD ["node", "./node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
