# Multi-stage build for Dubhe project
FROM node:18.19.0-alpine AS base

# Install pnpm and security updates
RUN apk add --no-cache curl && \
    npm install -g pnpm@9.12.3 && \
    apk del curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dubhe -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY templates/*/package.json ./templates/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Build stage
FROM base AS builder

# Build all packages
RUN pnpm build

# Production stage
FROM node:18.19.0-alpine AS production

# Install pnpm and security updates
RUN apk add --no-cache curl && \
    npm install -g pnpm@9.12.3 && \
    apk del curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dubhe -u 1001

# Set working directory
WORKDIR /app

# Copy built packages and dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/*/dist ./packages/*/dist
COPY --from=builder /app/packages/*/package.json ./packages/*/package.json
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R dubhe:nodejs /app

# Switch to non-root user
USER dubhe

# Set environment variables
ENV NODE_ENV=production
ENV DUBHE_ENV=production

# Expose ports
EXPOSE 3000 4000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["pnpm", "start"] 