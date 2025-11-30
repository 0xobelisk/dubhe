import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'sui/index': 'src/sui/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: [
    '@0xobelisk/sui-client',
    '@0xobelisk/graphql-client',
    '@0xobelisk/grpc-client',
    '@0xobelisk/ecs'
  ]
});
