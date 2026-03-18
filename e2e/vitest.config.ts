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
        // @0xobelisk packages are pnpm workspace links; their transitive
        // dependencies (debug, find-up, chalk, execa, glob …) are not hoisted
        // into e2e/node_modules. Inlining them lets Vite resolve deps from
        // each package's own directory instead of failing with "Failed to load url".
        // 'debug' is also listed explicitly because it is CJS-only and needs
        // Vite's CJS→ESM transform even after the parent package is inlined.
        inline: [/@0xobelisk\//, 'debug']
      }
    }
  }
});
