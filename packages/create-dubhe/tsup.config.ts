import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/cli.ts'],
  target: 'esnext',
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true
});
