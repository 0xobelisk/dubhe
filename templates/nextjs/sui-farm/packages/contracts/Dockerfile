FROM node:18-alpine
WORKDIR /app
COPY packages/graphql-server/package.json ./package.json
# Use --legacy-peer-deps to bypass devDependency eslint peer conflict,
# --omit=dev to skip devDependencies entirely (we only need runtime deps)
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts
# Copy pre-built dist (run `pnpm --filter @0xobelisk/graphql-server build` on host first)
COPY packages/graphql-server/dist ./dist
CMD ["node", "dist/cli.js", "start"]
