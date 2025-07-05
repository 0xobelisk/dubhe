#!/usr/bin/env tsx

/**
 * Project Cleanup Script
 *
 * This script cleans up temporary files, build artifacts, and other generated content.
 * Useful for maintaining a clean development environment.
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, statSync } from 'fs';

interface CleanupTarget {
  name: string;
  description: string;
  paths: string[];
  command?: string;
  dangerous?: boolean;
}

class ProjectCleanup {
  private targets: CleanupTarget[] = [];

  constructor() {
    this.initializeTargets();
  }

  private initializeTargets() {
    this.targets = [
      {
        name: 'Build Artifacts',
        description: 'Remove build outputs and compiled files',
        paths: [
          'dist',
          'build',
          'lib',
          'out',
          '.next',
          'coverage',
          '*.tsbuildinfo',
        ],
      },
      {
        name: 'Node Modules',
        description: 'Remove node_modules directories',
        paths: [
          'node_modules',
          'packages/*/node_modules',
          'site/node_modules',
          'site/packages/*/node_modules',
          'docs/node_modules',
          'paper/node_modules',
          'e2e-tests/node_modules',
        ],
      },
      {
        name: 'Cache Directories',
        description: 'Remove cache and temporary files',
        paths: [
          '.turbo',
          '.cache',
          '.eslintcache',
          '.prettiercache',
          '*.log',
          'npm-debug.log*',
          'yarn-debug.log*',
          'yarn-error.log*',
        ],
      },
      {
        name: 'Test Artifacts',
        description: 'Remove test outputs and reports',
        paths: [
          'test-results',
          'playwright-report',
          'cypress/videos',
          'cypress/screenshots',
          '*.lcov',
        ],
      },
      {
        name: 'Docker Artifacts',
        description: 'Remove Docker containers and images',
        command: 'docker system prune -f',
        dangerous: true,
      },
      {
        name: 'Git Clean',
        description: 'Remove untracked files from Git',
        command: 'git clean -fd',
        dangerous: true,
      },
    ];
  }

  private removePaths(paths: string[]) {
    for (const pattern of paths) {
      if (pattern.includes('*')) {
        // Handle glob patterns
        this.removeGlobPattern(pattern);
      } else {
        // Handle specific paths
        this.removePath(pattern);
      }
    }
  }

  private removeGlobPattern(pattern: string) {
    try {
      const glob = require('glob');
      const files = glob.sync(pattern, { dot: true });

      for (const file of files) {
        this.removePath(file);
      }
    } catch (error) {
      console.warn(`⚠️  Could not process glob pattern: ${pattern}`);
    }
  }

  private removePath(path: string) {
    if (!existsSync(path)) {
      return;
    }

    try {
      const stats = statSync(path);

      if (stats.isDirectory()) {
        rmSync(path, { recursive: true, force: true });
        console.log(`🗑️  Removed directory: ${path}`);
      } else {
        rmSync(path, { force: true });
        console.log(`🗑️  Removed file: ${path}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not remove ${path}:`, error);
    }
  }

  private executeCommand(command: string) {
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Executed: ${command}`);
    } catch (error) {
      console.error(`❌ Failed to execute: ${command}`, error);
    }
  }

  public async run(targets?: string[]) {
    console.log('🧹 Starting Dubhe project cleanup...\n');

    const targetsToRun = targets
      ? this.targets.filter((t) => targets.includes(t.name.toLowerCase()))
      : this.targets;

    if (targetsToRun.length === 0) {
      console.log('❌ No valid targets specified');
      this.showHelp();
      return;
    }

    // Show dangerous operations warning
    const dangerousTargets = targetsToRun.filter((t) => t.dangerous);
    if (dangerousTargets.length > 0) {
      console.log(
        '⚠️  WARNING: The following operations are potentially dangerous:'
      );
      dangerousTargets.forEach((t) => {
        console.log(`   - ${t.name}: ${t.description}`);
      });
      console.log('');
    }

    for (const target of targetsToRun) {
      console.log(`\n📋 ${target.name}`);
      console.log(`   ${target.description}`);

      if (target.dangerous) {
        console.log('   ⚠️  This is a dangerous operation');
      }

      try {
        if (target.command) {
          this.executeCommand(target.command);
        } else if (target.paths) {
          this.removePaths(target.paths);
        }
        console.log(`   ✅ ${target.name} completed`);
      } catch (error) {
        console.error(`   ❌ ${target.name} failed:`, error);
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(
      '\n💡 Tip: Run "pnpm install" to reinstall dependencies if needed'
    );
  }

  public showHelp() {
    console.log('🧹 Dubhe Project Cleanup Script\n');
    console.log('Usage:');
    console.log(
      '  pnpm tsx scripts/cleanup.ts                    # Clean everything'
    );
    console.log(
      '  pnpm tsx scripts/cleanup.ts build              # Clean build artifacts only'
    );
    console.log(
      '  pnpm tsx scripts/cleanup.ts cache              # Clean cache only'
    );
    console.log(
      '  pnpm tsx scripts/cleanup.ts docker             # Clean Docker artifacts only'
    );
    console.log(
      '  pnpm tsx scripts/cleanup.ts git                # Clean Git untracked files only'
    );
    console.log('\nAvailable targets:');

    this.targets.forEach((target) => {
      const dangerIcon = target.dangerous ? '⚠️ ' : '  ';
      console.log(
        `  ${dangerIcon}${target.name.toLowerCase()}: ${target.description}`
      );
    });
  }
}

// Run the cleanup
if (require.main === module) {
  const cleanup = new ProjectCleanup();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    cleanup.showHelp();
  } else {
    cleanup.run(args).catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
  }
}

export default ProjectCleanup;
