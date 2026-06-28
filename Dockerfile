# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 --create-home --shell /usr/sbin/nologin app

# Copy runtime dependencies and built application
COPY --from=builder --chown=app:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=app:nodejs /app/.output /app/.output

USER app

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
