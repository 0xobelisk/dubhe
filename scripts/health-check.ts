#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  description: string;
}

class HealthChecker {
  private checks: HealthCheck[] = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    this.checks = [
      {
        name: 'Node.js Version',
        description: 'Check if Node.js version is compatible',
        check: async () => {
          try {
            const version = process.version;
            const major = parseInt(version.slice(1).split('.')[0]);
            return major >= 18;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'pnpm Installation',
        description: 'Check if pnpm is installed',
        check: async () => {
          try {
            execSync('pnpm --version', { stdio: 'ignore' });
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Dependencies',
        description: 'Check if all dependencies are installed',
        check: async () => {
          try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
            const nodeModulesExist = require('fs').existsSync('node_modules');
            return nodeModulesExist;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'TypeScript Configuration',
        description: 'Check TypeScript configuration',
        check: async () => {
          try {
            const tsConfigExists = require('fs').existsSync('tsconfig.json');
            const tsConfigBaseExists = require('fs').existsSync('tsconfig.base.json');
            return tsConfigExists && tsConfigBaseExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'ESLint Configuration',
        description: 'Check ESLint configuration',
        check: async () => {
          try {
            const eslintConfigExists = require('fs').existsSync('.eslintrc.js');
            return eslintConfigExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Prettier Configuration',
        description: 'Check Prettier configuration',
        check: async () => {
          try {
            const prettierConfigExists = require('fs').existsSync('.prettierrc');
            return prettierConfigExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Turbo Configuration',
        description: 'Check Turbo build system configuration',
        check: async () => {
          try {
            const turboConfigExists = require('fs').existsSync('turbo.json');
            return turboConfigExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Husky Configuration',
        description: 'Check Husky git hooks configuration',
        check: async () => {
          try {
            const huskyExists = require('fs').existsSync('.husky');
            return huskyExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Docker Configuration',
        description: 'Check Docker configuration',
        check: async () => {
          try {
            const dockerfileExists = require('fs').existsSync('Dockerfile');
            const dockerComposeExists = require('fs').existsSync('docker-compose.yml');
            return dockerfileExists && dockerComposeExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Kubernetes Configuration',
        description: 'Check Kubernetes configuration',
        check: async () => {
          try {
            const k8sDirExists = require('fs').existsSync('k8s');
            return k8sDirExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Documentation',
        description: 'Check documentation structure',
        check: async () => {
          try {
            const docsDirExists = require('fs').existsSync('docs');
            const readmeExists = require('fs').existsSync('docs/README.md');
            return docsDirExists && readmeExists;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Monitoring Configuration',
        description: 'Check monitoring setup',
        check: async () => {
          try {
            const monitoringDirExists = require('fs').existsSync('monitoring');
            const prometheusConfigExists = require('fs').existsSync('monitoring/prometheus.yml');
            return monitoringDirExists && prometheusConfigExists;
          } catch (error) {
            return false;
          }
        }
      }
    ];
  }

  async runChecks(): Promise<void> {
    console.log('🏥 Dubhe Health Check');
    console.log('====================\n');

    const results: Array<{ name: string; status: boolean; description: string }> = [];

    for (const check of this.checks) {
      try {
        const status = await check.check();
        results.push({
          name: check.name,
          status,
          description: check.description
        });

        const icon = status ? '✅' : '❌';
        console.log(`${icon} ${check.name}`);
      } catch (error) {
        results.push({
          name: check.name,
          status: false,
          description: check.description
        });
        console.log(`❌ ${check.name}`);
      }
    }

    console.log('\n📊 Health Check Summary');
    console.log('=======================');

    const passed = results.filter(r => r.status).length;
    const total = results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`Passed: ${passed}/${total} (${percentage}%)`);

    if (passed === total) {
      console.log('🎉 All health checks passed! Your Dubhe environment is healthy.');
    } else {
      console.log('\n⚠️  Some health checks failed:');
      results
        .filter(r => !r.status)
        .forEach(r => {
          console.log(`   ❌ ${r.name}: ${r.description}`);
        });

      console.log('\n🔧 To fix issues:');
      console.log('   1. Run: pnpm install');
      console.log('   2. Run: pnpm build');
      console.log('   3. Check the documentation for setup instructions');
    }
  }
}

async function main() {
  const checker = new HealthChecker();
  await checker.runChecks();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });
} 