import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: configDir,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: configDir
  }
};

export default nextConfig;
