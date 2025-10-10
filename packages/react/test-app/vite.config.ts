import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
