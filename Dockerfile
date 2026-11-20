# syntax=docker/dockerfile:1@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

# Build JavaScript on the host architecture to avoid QEMU compiler hangs.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.5@sha256:3aa040e5445efa09d75bb428a64ba50db13e2b3ac9b6b0c7f145615f62b2ee18 AS builder

WORKDIR /app

ARG ROASTBOOK_EDITION=standard
ARG VITE_HEAD_HTML

# Copy package files
COPY package.json bun.lock ./
COPY packages/journal-demo/package.json packages/journal-demo/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN ROASTBOOK_EDITION=${ROASTBOOK_EDITION} VITE_HEAD_HTML="${VITE_HEAD_HTML}" bun run build

# Resolve native modules from the target-specific install in the runner.
RUN rm -rf .output/server/node_modules

# Production stage
FROM oven/bun:1.4.5-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 --create-home --shell /usr/sbin/nologin app

# Copy runtime dependencies and built application
COPY --from=builder --chown=app:nodejs /app/package.json /app/package.json
COPY --from=builder /app/bun.lock /app/bun.lock
COPY --from=builder --chown=app:nodejs /app/packages/journal-demo/package.json /app/packages/journal-demo/package.json
RUN bun install --frozen-lockfile --production
COPY --from=builder --chown=app:nodejs /app/.output /app/.output
COPY --from=builder --chown=app:nodejs /app/drizzle /app/drizzle
COPY --from=builder --chown=app:nodejs /app/scripts /app/scripts
COPY --from=builder --chown=app:nodejs /app/src /app/src
COPY --from=builder --chown=app:nodejs /app/tsconfig.json /app/tsconfig.json

USER app

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
