import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**', '**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
