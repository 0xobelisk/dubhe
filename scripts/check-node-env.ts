#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Expected unified configuration
const EXPECTED_CONFIG = {
  nodeVersion: '>=18.19.0',
  pnpmVersion: '>=8.0.0',
  typesNodeVersion: '^18.19.0'
} as const;

// Package paths that need to be checked
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

interface Issue {
  file: string;
  issue: string;
}

function checkPackageJson(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg: PackageJson = JSON.parse(content);
    const issues: string[] = [];

    // Check engines field
    if (pkg.engines) {
      if (pkg.engines.node !== EXPECTED_CONFIG.nodeVersion) {
        issues.push(`Node version mismatch: expected "${EXPECTED_CONFIG.nodeVersion}", got "${pkg.engines.node}"`);
      }
      if (pkg.engines.pnpm && pkg.engines.pnpm !== EXPECTED_CONFIG.pnpmVersion) {
        issues.push(`PNPM version mismatch: expected "${EXPECTED_CONFIG.pnpmVersion}", got "${pkg.engines.pnpm}"`);
      }
    } else {
      issues.push('Missing engines field');
    }

    // Check @types/node version
    if (pkg.devDependencies && pkg.devDependencies['@types/node']) {
      const currentVersion = pkg.devDependencies['@types/node'];
      if (currentVersion !== EXPECTED_CONFIG.typesNodeVersion) {
        issues.push(`@types/node version mismatch: expected "${EXPECTED_CONFIG.typesNodeVersion}", got "${currentVersion}"`);
      }
    }

    return issues;
  } catch (error) {
    return [`Error reading file: ${(error as Error).message}`];
  }
}

async function main(): Promise<void> {
  console.log('🔍 Checking Node environment consistency...\n');

  let totalFiles = 0;
  let filesWithIssues = 0;
  const allIssues: Issue[] = [];

  for (const pattern of PACKAGE_PATHS) {
    const files = await glob(pattern);
    for (const file of files) {
      totalFiles++;
      const issues = checkPackageJson(file);
      
      if (issues.length > 0) {
        filesWithIssues++;
        console.log(`❌ ${file}:`);
        issues.forEach(issue => {
          console.log(`   - ${issue}`);
          allIssues.push({ file, issue });
        });
        console.log('');
      } else {
        console.log(`✅ ${file}`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total files checked: ${totalFiles}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   Total issues found: ${allIssues.length}`);
  
  if (filesWithIssues === 0) {
    console.log(`\n🎉 All files are using consistent Node environment!`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Found ${allIssues.length} issues across ${filesWithIssues} files.`);
    console.log(`   Run 'pnpm run unify-node-env' to fix these issues.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkPackageJson, EXPECTED_CONFIG }; 