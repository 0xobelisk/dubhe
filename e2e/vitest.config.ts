import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    },
    server: {
      deps: {
        // 'debug' is a CJS-only package; inline it so Vite can transform it
        // to ESM instead of failing with "Failed to load url debug"
        inline: ['debug']
      }
    }
  }
});
