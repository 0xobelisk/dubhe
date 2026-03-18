import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    },
    server: {
      deps: {
        // @0xobelisk packages are pnpm workspace links; their transitive
        // dependencies (debug, find-up, chalk, execa, glob …) are not hoisted
        // into e2e/node_modules. Inlining them lets Vite resolve deps from
        // each package's own directory instead of failing with "Failed to load url".
        inline: [/@0xobelisk\//]
      }
    }
  }
});
