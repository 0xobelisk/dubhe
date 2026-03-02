import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    // Blockchain operations are slow: build + publish + upgrade each take 5-30s
    testTimeout: 120000,
    hookTimeout: 60000,
    // Disable worker threads so process.chdir() works (not supported in workers).
    // Vitest 0.31.x uses `threads: false` to run tests in the main process.
    threads: false,
    // Run integration tests sequentially to avoid nonce/gas conflicts
    sequence: {
      concurrent: false
    }
  }
});
