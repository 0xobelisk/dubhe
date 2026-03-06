# Build from repository root so monorepo deps resolve (pnpm-workspace, lockfile).
# Usage: docker build -f packages/graphql-server/Dockerfile .

FROM node:22-alpine

WORKDIR /app

# Use same pnpm version as packageManager (lockfile was generated with this)
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy root workspace, lockfile, and .npmrc (settings must match lockfile, e.g. auto-install-peers=false)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/graphql-server ./packages/graphql-server

# Install dependencies (from root)
RUN pnpm install --frozen-lockfile

# Build only graphql-server
RUN pnpm --filter @0xobelisk/graphql-server build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

WORKDIR /app/packages/graphql-server
EXPOSE 4000

CMD ["node", "dist/cli.js", "start"]
