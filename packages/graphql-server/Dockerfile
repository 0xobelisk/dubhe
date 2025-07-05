FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build project
RUN pnpm build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set user
USER nodejs

# Expose port
EXPOSE 4000

# Start application (can use CLI or direct start)
# Start using CLI method
CMD ["node", "dist/cli.js", "start"]

# Or start directly (optional)
# CMD ["pnpm", "start"] 