#!/usr/bin/env tsx

/**
 * Development Environment Setup Script
 *
 * This script sets up the development environment for the Dubhe project.
 * It installs dependencies, sets up databases, and configures the environment.
 */

import { execSync } from 'child_process';
import { copyFileSync, existsSync, writeFileSync } from 'fs';

interface SetupStep {
  name: string;
  description: string;
  execute: () => void;
  skipIf?: () => boolean;
}

class DevSetup {
  private steps: SetupStep[] = [];

  constructor() {
    this.initializeSteps();
  }

  private initializeSteps() {
    this.steps = [
      {
        name: 'Check Node.js Version',
        description: 'Verifying Node.js version compatibility',
        execute: () => this.checkNodeVersion(),
      },
      {
        name: 'Install Dependencies',
        description: 'Installing project dependencies',
        execute: () => this.installDependencies(),
        skipIf: () => existsSync('node_modules'),
      },
      {
        name: 'Setup Environment Variables',
        description: 'Creating local environment configuration',
        execute: () => this.setupEnvironment(),
        skipIf: () => existsSync('.env.local'),
      },
      {
        name: 'Setup Database',
        description: 'Setting up local database',
        execute: () => this.setupDatabase(),
      },
      {
        name: 'Setup Redis',
        description: 'Setting up local Redis instance',
        execute: () => this.setupRedis(),
      },
      {
        name: 'Run Type Check',
        description: 'Verifying TypeScript configuration',
        execute: () => this.runTypeCheck(),
      },
      {
        name: 'Run Linting',
        description: 'Checking code quality',
        execute: () => this.runLinting(),
      },
      {
        name: 'Run Tests',
        description: 'Running test suite',
        execute: () => this.runTests(),
      },
      {
        name: 'Build Project',
        description: 'Building all packages',
        execute: () => this.buildProject(),
      },
    ];
  }

  private checkNodeVersion() {
    console.log('🔍 Checking Node.js version...');
    const version = process.version;
    console.log(`✅ Node.js version: ${version}`);

    // Check if version matches .nvmrc
    if (existsSync('.nvmrc')) {
      const requiredVersion = require('fs')
        .readFileSync('.nvmrc', 'utf8')
        .trim();
      if (!version.includes(requiredVersion)) {
        console.warn(
          `⚠️  Warning: Node.js version ${version} may not match required version ${requiredVersion}`
        );
      }
    }
  }

  private installDependencies() {
    console.log('📦 Installing dependencies...');
    try {
      execSync('pnpm install', { stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      throw error;
    }
  }

  private setupEnvironment() {
    console.log('⚙️  Setting up environment variables...');

    if (existsSync('env.example') && !existsSync('.env.local')) {
      copyFileSync('env.example', '.env.local');
      console.log('✅ Created .env.local from env.example');
      console.log('📝 Please edit .env.local with your configuration values');
    } else if (existsSync('.env.local')) {
      console.log('✅ .env.local already exists');
    } else {
      console.log('⚠️  No env.example found, creating basic .env.local');
      writeFileSync('.env.local', 'NODE_ENV=development\n');
    }
  }

  private setupDatabase() {
    console.log('🗄️  Setting up database...');

    // Check if Docker is available
    try {
      execSync('docker --version', { stdio: 'pipe' });
      console.log(
        '🐳 Docker detected, starting database with Docker Compose...'
      );

      try {
        execSync('docker-compose up -d postgres redis', { stdio: 'inherit' });
        console.log('✅ Database services started');
      } catch (error) {
        console.warn(
          '⚠️  Failed to start database with Docker Compose, skipping...'
        );
      }
    } catch (error) {
      console.log(
        'ℹ️  Docker not available, please ensure PostgreSQL and Redis are running manually'
      );
    }
  }

  private setupRedis() {
    console.log('🔴 Setting up Redis...');

    // Redis setup is handled in setupDatabase for Docker
    // For manual setup, provide instructions
    console.log(
      'ℹ️  If not using Docker, please ensure Redis is running on localhost:6379'
    );
  }

  private runTypeCheck() {
    console.log('🔍 Running TypeScript type check...');
    try {
      execSync('pnpm type-check', { stdio: 'inherit' });
      console.log('✅ Type check passed');
    } catch (error) {
      console.error('❌ Type check failed:', error);
      throw error;
    }
  }

  private runLinting() {
    console.log('🧹 Running linting...');
    try {
      execSync('pnpm lint', { stdio: 'inherit' });
      console.log('✅ Linting passed');
    } catch (error) {
      console.error('❌ Linting failed:', error);
      throw error;
    }
  }

  private runTests() {
    console.log('🧪 Running tests...');
    try {
      execSync('pnpm test', { stdio: 'inherit' });
      console.log('✅ Tests passed');
    } catch (error) {
      console.error('❌ Tests failed:', error);
      throw error;
    }
  }

  private buildProject() {
    console.log('🏗️  Building project...');
    try {
      execSync('pnpm build', { stdio: 'inherit' });
      console.log('✅ Build completed successfully');
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  public async run() {
    console.log('🚀 Starting Dubhe development environment setup...\n');

    for (const step of this.steps) {
      console.log(`\n📋 ${step.name}`);
      console.log(`   ${step.description}`);

      if (step.skipIf && step.skipIf()) {
        console.log('   ⏭️  Skipped (already completed)');
        continue;
      }

      try {
        step.execute();
        console.log(`   ✅ ${step.name} completed`);
      } catch (error) {
        console.error(`   ❌ ${step.name} failed`);
        console.error('   Error:', error);
        process.exit(1);
      }
    }

    console.log('\n🎉 Development environment setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Edit .env.local with your configuration');
    console.log('   2. Start the development server: pnpm dev');
    console.log('   3. Open http://localhost:3000 in your browser');
    console.log('\n📚 For more information, see the README.md file');
  }
}

// Run the setup
if (require.main === module) {
  const setup = new DevSetup();
  setup.run().catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export default DevSetup;
