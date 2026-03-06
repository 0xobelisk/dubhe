# Build from repository root so monorepo deps resolve (pnpm-workspace, lockfile).
# Usage: docker build -f packages/graphql-server/Dockerfile .

FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace and lockfile, then graphql-server package
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
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
