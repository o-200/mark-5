# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------
# Production Image
# ---------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

# Install tini for PID 1 signal forwarding and zombie reaping
RUN apk add --no-cache tini

# Application lives in /app
WORKDIR /app

# Enforce production environment by default
ENV NODE_ENV=production

# Copy dependency specifications first to leverage Docker layer caching
COPY --chown=node:node package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy TypeScript configuration and application source
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node scripts/ ./scripts/

# Run as non-root user
USER node

# Use tini to forward SIGINT/SIGTERM to Node for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]

# Start the bot
CMD ["npm", "start"]
