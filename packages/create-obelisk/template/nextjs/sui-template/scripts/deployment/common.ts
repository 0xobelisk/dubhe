import { spawn } from 'child_process';
import chalk from 'chalk';
import { obeliskConfig } from '../../obelisk.config';
import * as fsAsync from 'fs/promises';
import { DeploymentJsonType } from './types';

export async function deployContract(
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  dappsObjectId?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`\n📦 Deploying ${obeliskConfig.name} contract...`));

    let args = ['obelisk', 'publish', '--network', network, '--configPath', './obelisk.config.ts'];
    if (dappsObjectId) {
      args.push('--dappsObjectId', dappsObjectId);
    }

    const childProcess = spawn('pnpm', args, {
      shell: true,
      stdio: 'inherit',
    });

    childProcess.on('exit', code => {
      if (code === 0) {
        console.log(chalk.green(`  ✅ ${obeliskConfig.name} contract deployed successfully`));
        console.log(chalk.blue('\n💾 Storing configuration...'));
        const storeConfigProcess = spawn('ts-node', ['scripts/storeConfig.ts', network], {
          stdio: 'inherit',
          shell: true,
        });

        storeConfigProcess.on('exit', storeConfigCode => {
          if (storeConfigCode === 0) {
            console.log(chalk.green('  ✅ Configuration stored successfully'));
            resolve();
          } else {
            console.error(chalk.red(`  ❌ Failed to store configuration. Exit code: ${storeConfigCode}`));
            reject(new Error(`Failed to store configuration. Exit code: ${storeConfigCode}`));
          }
        });
      } else {
        console.error(chalk.red(`  ❌ Deployment failed. Exit code: ${code}`));
        reject(new Error(`Deployment failed. Exit code: ${code}`));
      }
    });
  });
}

export async function getContractDeploymentJson(projectPath: string, network: string): Promise<DeploymentJsonType> {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/contracts/${obeliskConfig.name}/.history/sui_${network}/latest.json`,
      'utf8',
    );
    return JSON.parse(data) as DeploymentJsonType;
  } catch {
    throw new Error('Failed to read deployment history file');
  }
}
