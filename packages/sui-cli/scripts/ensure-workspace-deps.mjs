#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const shouldSkip = process.env.DUBHE_SKIP_WORKSPACE_PREBUILD === '1';
if (shouldSkip) {
  process.exit(0);
}

const pkgDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(pkgDir, '..', '..');

const checks = [
  {
    name: '@0xobelisk/sui-common',
    marker: path.join(repoRoot, 'packages', 'sui-common', 'dist', 'index.js')
  },
  {
    name: '@0xobelisk/sui-client',
    marker: path.join(repoRoot, 'packages', 'sui-client', 'dist', 'index.js')
  }
];

for (const item of checks) {
  if (fs.existsSync(item.marker)) continue;
  console.log(`[ensure:workspace-deps] missing build for ${item.name}, building...`);
  execSync(`pnpm --filter ${item.name} build`, {
    cwd: repoRoot,
    stdio: 'inherit'
  });
}
