# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e

# Build stage
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS builder

WORKDIR /app

ARG ROASTBOOK_EDITION=standard
ARG VITE_HEAD_HTML

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN ROASTBOOK_EDITION=${ROASTBOOK_EDITION} VITE_HEAD_HTML="${VITE_HEAD_HTML}" bun run build

# Production stage
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 --create-home --shell /usr/sbin/nologin app

# Copy runtime dependencies and built application
COPY --from=builder --chown=app:nodejs /app/package.json /app/package.json
COPY --from=builder /app/bun.lock /app/bun.lock
RUN bun install --frozen-lockfile --production
COPY --from=builder --chown=app:nodejs /app/.output /app/.output
COPY --from=builder --chown=app:nodejs /app/drizzle /app/drizzle
COPY --from=builder --chown=app:nodejs /app/scripts /app/scripts

USER app

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
