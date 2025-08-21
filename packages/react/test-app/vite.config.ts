import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@0xobelisk/react': path.resolve(__dirname, '../src'),
      '@0xobelisk/react/sui': path.resolve(__dirname, '../src/sui'),
      '@0xobelisk/react/aptos': path.resolve(__dirname, '../src/aptos'),
      '@0xobelisk/react/initia': path.resolve(__dirname, '../src/initia'),
      '@0xobelisk/react/sui/contracts': path.resolve(__dirname, '../src/sui/contracts')
    }
  },
  define: {
    'process.env.NEXT_PUBLIC_PACKAGE_ID': JSON.stringify(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ),
    'process.env.NEXT_PUBLIC_PRIVATE_KEY': JSON.stringify('0x'),
    'process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT': JSON.stringify('http://localhost:4000/graphql'),
    'process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT': JSON.stringify('ws://localhost:4000/graphql')
  },
  server: {
    port: 3000
  }
});
