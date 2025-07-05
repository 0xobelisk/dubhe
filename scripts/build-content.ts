#!/usr/bin/env tsx

import chalk from 'chalk';
import { execa } from 'execa';

async function buildContent() {
  console.log(chalk.blue('🏗️  Building Dubhe content...'));

  try {
    // Build Paper (Documentation)
    console.log(chalk.yellow('📖 Building Paper (Documentation)...'));
    await execa('pnpm', ['build:paper'], { stdio: 'inherit' });
    console.log(chalk.green('✅ Paper built successfully'));

    // Build Site (Website)
    console.log(chalk.yellow('🌐 Building Site (Website)...'));
    await execa('pnpm', ['build:site'], { stdio: 'inherit' });
    console.log(chalk.green('✅ Site built successfully'));

    console.log(chalk.green('🎉 All content built successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), error);
    process.exit(1);
  }
}

buildContent();
