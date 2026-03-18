import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    // Map @0xobelisk workspace packages to their TypeScript sources so Vite
    // resolves transitive deps (debug, find-up, …) from each package's own
    // node_modules regardless of which directory the import originates from.
    alias: {
      '@0xobelisk/sui-common': path.resolve(__dirname, '../packages/sui-common/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    // Blockchain operations are slow: build + publish + upgrade each take 5-30s
    testTimeout: 180000,
    hookTimeout: 120000,
    // Disable worker threads so process.chdir() works
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Run integration tests sequentially to avoid nonce/gas conflicts
    sequence: {
      concurrent: false
    }
  }
});
