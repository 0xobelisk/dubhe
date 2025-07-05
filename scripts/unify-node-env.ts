#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Unified Node environment configuration
const UNIFIED_CONFIG = {
  nodeVersion: '>=18.19.0',
  pnpmVersion: '>=8.0.0',
  typesNodeVersion: '^18.19.0'
} as const;

// Package paths that need to be updated
const PACKAGE_PATHS = [
  'packages/*/package.json',
  'templates/*/package.json',
  'templates/*/packages/*/package.json',
  'examples/*/package.json',
  'examples/*/packages/*/package.json',
  'e2e-tests/package.json',
  'docs/package.json'
] as const;

interface PackageJson {
  engines?: {
    node?: string;
    pnpm?: string;
  };
  devDependencies?: {
    '@types/node'?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

function updatePackageJson(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg: PackageJson = JSON.parse(content);
    let updated = false;

    // Update engines field
    if (pkg.engines) {
      if (pkg.engines.node !== UNIFIED_CONFIG.nodeVersion) {
        pkg.engines.node = UNIFIED_CONFIG.nodeVersion;
        updated = true;
        console.log(`✅ Updated node version in ${filePath}`);
      }
      if (pkg.engines.pnpm && pkg.engines.pnpm !== UNIFIED_CONFIG.pnpmVersion) {
        pkg.engines.pnpm = UNIFIED_CONFIG.pnpmVersion;
        updated = true;
        console.log(`✅ Updated pnpm version in ${filePath}`);
      }
    }

    // Update @types/node version
    if (pkg.devDependencies && pkg.devDependencies['@types/node']) {
      const currentVersion = pkg.devDependencies['@types/node'];
      if (currentVersion !== UNIFIED_CONFIG.typesNodeVersion) {
        pkg.devDependencies['@types/node'] = UNIFIED_CONFIG.typesNodeVersion;
        updated = true;
        console.log(`✅ Updated @types/node version in ${filePath}`);
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    }

    return updated;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, (error as Error).message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🔄 Starting Node environment unification...\n');

  let totalUpdated = 0;
  let totalFiles = 0;

  for (const pattern of PACKAGE_PATHS) {
    const files = await glob(pattern);
    for (const file of files) {
      totalFiles++;
      if (updatePackageJson(file)) {
        totalUpdated++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total files processed: ${totalFiles}`);
  console.log(`   Files updated: ${totalUpdated}`);
  console.log(`   Files unchanged: ${totalFiles - totalUpdated}`);
  
  if (totalUpdated > 0) {
    console.log(`\n🎉 Node environment unification completed!`);
    console.log(`   Please run 'pnpm install' to update dependencies.`);
  } else {
    console.log(`\n✨ All files are already using unified Node environment!`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { updatePackageJson, UNIFIED_CONFIG }; 