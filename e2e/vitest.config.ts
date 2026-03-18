import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    // Map @0xobelisk workspace packages to their TypeScript sources so Vite
    // resolves transitive deps (debug, find-up, …) from each package's own
    // node_modules regardless of which directory the import originates from.
    // Without this, imports from outside e2e/ (e.g. templates/*/dubhe.config.ts)
    // cause Vite to look for transitive deps in e2e/node_modules where they
    // don't exist (pnpm strict isolation).
    alias: {
      '@0xobelisk/sui-common': path.resolve(__dirname, '../packages/sui-common/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/schemagen/**/*.test.ts', 'tests/move-test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    testTimeout: 120000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
