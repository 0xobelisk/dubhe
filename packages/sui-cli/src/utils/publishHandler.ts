import { Dubhe, Transaction } from '@0xobelisk/sui-client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import {
  saveContractData,
  updateDubheDependency,
  switchEnv,
  delay,
  getDubheSchemaId,
  initializeDubhe
} from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import * as fs from 'fs';
import * as path from 'path';

const MAX_RETRIES = 60; // 60s timeout
const RETRY_INTERVAL = 1000; // 1s retry interval
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

async function removeEnvContent(
  filePath: string,
  networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp(`\\[env\\.${networkType}\\][\\s\\S]*?(?=\\[|$)`, 'g');
  const updatedContent = content.replace(regex, '');
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

interface EnvConfig {
  chainId: string;
  originalPublishedId: string;
  latestPublishedId: string;
  publishedVersion: number;
}

function updateEnvFile(
  filePath: string,
  networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  operation: 'publish' | 'upgrade',
  chainId: string,
  publishedId: string
): void {
  const envFilePath = path.resolve(filePath);
  const envContent = fs.readFileSync(envFilePath, 'utf-8');
  const envLines = envContent.split('\n');

  const networkSectionIndex = envLines.findIndex((line) => line.trim() === `[env.${networkType}]`);
  const config: EnvConfig = {
    chainId: chainId,
    originalPublishedId: '',
    latestPublishedId: '',
    publishedVersion: 0
  };

  if (networkSectionIndex === -1) {
    // If network section is not found, add a new section
    if (operation === 'publish') {
      config.originalPublishedId = publishedId;
      config.latestPublishedId = publishedId;
      config.publishedVersion = 1;
    } else {
      throw new Error(
        `Network type [env.${networkType}] not found in the file and cannot upgrade.`
      );
    }
  } else {
    for (let i = networkSectionIndex + 1; i < envLines.length; i++) {
      const line = envLines[i].trim();
      if (line.startsWith('[')) break; // End of the current network section

      const [key, value] = line.split('=').map((part) => part.trim().replace(/"/g, ''));
      switch (key) {
        case 'original-published-id':
          config.originalPublishedId = value;
          break;
        case 'latest-published-id':
          config.latestPublishedId = value;
          break;
        case 'published-version':
          config.publishedVersion = parseInt(value, 10);
          break;
      }
    }

    if (operation === 'publish') {
      config.originalPublishedId = publishedId;
      config.latestPublishedId = publishedId;
      config.publishedVersion = 1;
    } else if (operation === 'upgrade') {
      config.latestPublishedId = publishedId;
      config.publishedVersion += 1;
    }
  }

  const updatedSection = `
[env.${networkType}]
chain-id = "${config.chainId}"
original-published-id = "${config.originalPublishedId}"
latest-published-id = "${config.latestPublishedId}"
published-version = "${config.publishedVersion}"
`;

  const newEnvContent =
    networkSectionIndex === -1
      ? envContent + updatedSection
      : envLines.slice(0, networkSectionIndex).join('\n') + updatedSection;

  fs.writeFileSync(envFilePath, newEnvContent, 'utf-8');
}
// function capitalizeAndRemoveUnderscores(input: string): string {
// 	return input
// 		.split('_')
// 		.map((word, index) => {
// 			return index === 0
// 				? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
// 				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
// 		})
// 		.join('');
// }
//
// function getLastSegment(input: string): string {
// 	const segments = input.split('::');
// 	return segments.length > 0 ? segments[segments.length - 1] : '';
// }

function buildContract(projectPath: string): string[][] {
  let modules: any, dependencies: any;
  try {
    const buildResult = JSON.parse(
      execSync(`sui move build --dump-bytecode-as-base64 --path ${projectPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      })
    );
    modules = buildResult.modules;
    dependencies = buildResult.dependencies;
  } catch (error: any) {
    console.error(chalk.red('  └─ Build failed'));
    console.error(error.stdout);
    process.exit(1);
  }
  return [modules, dependencies];
}

interface ObjectChange {
  type: string;
  objectType?: string;
  packageId?: string;
  objectId?: string;
}

async function waitForNode(dubhe: Dubhe): Promise<string> {
  let retryCount = 0;
  let spinnerIndex = 0;
  const startTime = Date.now();
  let isInterrupted = false;
  let chainId = '';
  let hasShownBalanceWarning = false;

  const handleInterrupt = () => {
    isInterrupted = true;
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log('\n  └─ Operation cancelled by user');
    process.exit(0);
  };
  process.on('SIGINT', handleInterrupt);

  try {
    // Phase 1: Wait for getting chainId
    while (retryCount < MAX_RETRIES && !isInterrupted && !chainId) {
      try {
        chainId = await dubhe.suiInteractor.currentClient.getChainIdentifier();
      } catch (error) {
        // Ignore errors, continue retrying
      }

      if (isInterrupted) break;

      if (!chainId) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.log(chalk.red(`  └─ Failed to connect to node after ${MAX_RETRIES} attempts`));
          console.log(chalk.red('  └─ Please check if the Sui node is running.'));
          process.exit(1);
        }

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const spinner = SPINNER[spinnerIndex % SPINNER.length];
        spinnerIndex++;

        process.stdout.write(`\r  ├─ ${spinner} Waiting for node... (${elapsedTime}s)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }

    // Display chainId
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log(`  ├─ ChainId: ${chainId}`);

    // Phase 2: Check deployer account balance
    retryCount = 0;
    while (retryCount < MAX_RETRIES && !isInterrupted) {
      try {
        const address = dubhe.getAddress();
        const coins = await dubhe.suiInteractor.currentClient.getCoins({
          owner: address,
          coinType: '0x2::sui::SUI'
        });

        if (coins.data.length > 0) {
          const balance = coins.data.reduce((sum, coin) => sum + Number(coin.balance), 0);
          if (balance > 0) {
            process.stdout.write('\r' + ' '.repeat(50) + '\r');
            console.log(`  ├─ Deployer balance: ${balance / 10 ** 9} SUI`);
            return chainId;
          } else if (!hasShownBalanceWarning) {
            process.stdout.write('\r' + ' '.repeat(50) + '\r');
            console.log(
              chalk.yellow(
                `  ├─ Deployer balance: 0 SUI, please ensure your account has sufficient SUI balance`
              )
            );
            hasShownBalanceWarning = true;
          }
        } else if (!hasShownBalanceWarning) {
          process.stdout.write('\r' + ' '.repeat(50) + '\r');
          console.log(
            chalk.yellow(
              `  ├─ No SUI coins found in deployer account, please ensure your account has sufficient SUI balance`
            )
          );
          hasShownBalanceWarning = true;
        }

        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.log(
            chalk.red(`  └─ Deployer account has no SUI balance after ${MAX_RETRIES} attempts`)
          );
          console.log(chalk.red('  └─ Please ensure your account has sufficient SUI balance.'));
          process.exit(1);
        }

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const spinner = SPINNER[spinnerIndex % SPINNER.length];
        spinnerIndex++;

        process.stdout.write(`\r  ├─ ${spinner} Checking deployer balance... (${elapsedTime}s)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      } catch (error) {
        if (isInterrupted) break;

        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.log(
            chalk.red(`  └─ Failed to check deployer balance after ${MAX_RETRIES} attempts`)
          );
          console.log(chalk.red('  └─ Please check your account and network connection.'));
          process.exit(1);
        }

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const spinner = SPINNER[spinnerIndex % SPINNER.length];
        spinnerIndex++;

        process.stdout.write(`\r  ├─ ${spinner} Checking deployer balance... (${elapsedTime}s)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  } finally {
    process.removeListener('SIGINT', handleInterrupt);
  }

  if (isInterrupted) {
    process.exit(0);
  }

  throw new Error('Failed to connect to node');
}

async function publishContract(
  dubhe: Dubhe,
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  projectPath: string,
  gasBudget?: number
) {
  console.log('\n🚀 Starting Contract Publication...');
  console.log(`  ├─ Project: ${projectPath}`);
  console.log(`  ├─ Network: ${network}`);
  console.log('  ├─ Waiting for node...');

  const chainId = await waitForNode(dubhe);
  console.log('  ├─ Validating Environment...');

  await removeEnvContent(`${projectPath}/Move.lock`, network);
  console.log(`  └─ Account: ${dubhe.getAddress()}`);

  console.log('\n📦 Building Contract...');
  const [modules, dependencies] = buildContract(projectPath);

  console.log('\n🔄 Publishing Contract...');
  const tx = new Transaction();
  if (gasBudget) {
    tx.setGasBudget(gasBudget);
  }
  const [upgradeCap] = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], dubhe.getAddress());

  let result: any = null;
  let retryCount = 0;
  let spinnerIndex = 0;
  const startTime = Date.now();
  let isInterrupted = false;

  const handleInterrupt = () => {
    isInterrupted = true;
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log('\n  └─ Operation cancelled by user');
    process.exit(0);
  };
  process.on('SIGINT', handleInterrupt);

  try {
    while (retryCount < MAX_RETRIES && !result && !isInterrupted) {
      try {
        result = await dubhe.signAndSendTxn({ tx });
      } catch (error) {
        if (isInterrupted) break;

        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.log(chalk.red(`  └─ Publication failed after ${MAX_RETRIES} attempts`));
          console.log(chalk.red('  └─ Please check your network connection and try again later.'));
          process.exit(1);
        }

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const spinner = SPINNER[spinnerIndex % SPINNER.length];
        spinnerIndex++;

        process.stdout.write(`\r  ├─ ${spinner} Retrying... (${elapsedTime}s)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  } finally {
    process.removeListener('SIGINT', handleInterrupt);
  }

  if (isInterrupted) {
    process.exit(0);
  }

  process.stdout.write('\r' + ' '.repeat(50) + '\r');

  if (!result || result.effects?.status.status === 'failure') {
    console.log(chalk.red('  └─ Publication failed'));
    process.exit(1);
  }

  console.log('  ├─ Processing publication results...');
  let version = 1;
  let packageId = '';
  let schemaId = '';
  let schemas = dubheConfig.schemas;
  let upgradeCapId = '';

  let printObjects: any[] = [];

  result.objectChanges!.map((object: ObjectChange) => {
    if (object.type === 'published') {
      console.log(`  ├─ Package ID: ${object.packageId}`);
      packageId = object.packageId || '';
    }
    if (
      object.type === 'created' &&
      object.objectType &&
      object.objectType === '0x2::package::UpgradeCap'
    ) {
      console.log(`  ├─ Upgrade Cap: ${object.objectId}`);
      upgradeCapId = object.objectId || '';
    }
    if (object.type === 'created') {
      printObjects.push(object);
    }
  });

  console.log(`  └─ Transaction: ${result.digest}`);

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);

  console.log('\n⚡ Executing Deploy Hook...');
  await delay(5000);

  const deployHookTx = new Transaction();
  let args = [];
  if (dubheConfig.name !== 'dubhe') {
    let dubheSchemaId = await getDubheSchemaId(network);
    args.push(deployHookTx.object(dubheSchemaId));
  }
  args.push(deployHookTx.object('0x6'));
  deployHookTx.moveCall({
    target: `${packageId}::${dubheConfig.name}_genesis::run`,
    arguments: args
  });

  let deployHookResult;
  try {
    deployHookResult = await dubhe.signAndSendTxn({ tx: deployHookTx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Deploy hook execution failed'));
    console.error(error.message);
    process.exit(1);
  }

  if (deployHookResult.effects?.status.status === 'success') {
    console.log('  ├─ Hook execution successful');
    console.log(`  ├─ Transaction: ${deployHookResult.digest}`);

    console.log('\n📋 Created Objects:');
    deployHookResult.objectChanges?.map((object: ObjectChange) => {
      if (
        object.type === 'created' &&
        object.objectType &&
        object.objectType.includes('schema::Schema')
      ) {
        schemaId = object.objectId || '';
      }
      if (
        object.type === 'created' &&
        object.objectType &&
        object.objectType.includes('schema') &&
        !object.objectType.includes('dynamic_field')
      ) {
        printObjects.push(object);
      }
    });

    printObjects.map((object: ObjectChange) => {
      console.log(`  ├─ Type: ${object.objectType}`);
      console.log(`  └─ ID: ${object.objectId}`);
    });

    saveContractData(
      dubheConfig.name,
      network,
      packageId,
      schemaId,
      upgradeCapId,
      version,
      schemas
    );
    console.log('\n✅ Contract Publication Complete\n');
  } else {
    console.log(chalk.yellow('  └─ Deploy hook execution failed'));
    console.log(chalk.yellow('     Please republish or manually call deploy_hook::run'));
    console.log(chalk.yellow('     Please check the transaction digest:'));
    console.log(chalk.yellow(`     ${deployHookResult.digest}`));
    process.exit(1);
  }
}

async function checkDubheFramework(projectPath: string): Promise<boolean> {
  if (!fs.existsSync(projectPath)) {
    console.log(chalk.yellow('\nℹ️ Dubhe Framework Files Not Found'));
    console.log(chalk.yellow('  ├─ Expected Path:'), projectPath);
    console.log(chalk.yellow('  ├─ To set up Dubhe Framework:'));
    console.log(chalk.yellow('  │  1. Create directory: mkdir -p contracts/dubhe'));
    console.log(
      chalk.yellow(
        '  │  2. Clone repository: git clone https://github.com/0xobelisk/dubhe contracts/dubhe'
      )
    );
    console.log(
      chalk.yellow('  │  3. Or download from: https://github.com/0xobelisk/dubhe')
    );
    console.log(chalk.yellow('  └─ After setup, restart the local node'));
    return false;
  }
  return true;
}

export async function publishDubheFramework(
  dubhe: Dubhe,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  const path = process.cwd();
  const projectPath = `${path}/src/dubhe`;

  if (!(await checkDubheFramework(projectPath))) {
    return;
  }

  console.log('\n🚀 Starting Dubhe Framework Publication...');
  console.log('  ├─ Waiting for node...');

  const chainId = await waitForNode(dubhe);

  await removeEnvContent(`${projectPath}/Move.lock`, network);
  const [modules, dependencies] = buildContract(projectPath);
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], dubhe.getAddress());

  let result: any = null;
  let retryCount = 0;
  let spinnerIndex = 0;
  const startTime = Date.now();
  let isInterrupted = false;

  const handleInterrupt = () => {
    isInterrupted = true;
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log('\n  └─ Operation cancelled by user');
    process.exit(0);
  };
  process.on('SIGINT', handleInterrupt);

  try {
    while (retryCount < MAX_RETRIES && !result && !isInterrupted) {
      try {
        result = await dubhe.signAndSendTxn({ tx });
      } catch (error) {
        if (isInterrupted) break;

        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.log(chalk.red(`  └─ Publication failed after ${MAX_RETRIES} attempts`));
          console.log(chalk.red('  └─ Please check your network connection and try again later.'));
          process.exit(1);
        }

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const spinner = SPINNER[spinnerIndex % SPINNER.length];
        spinnerIndex++;

        process.stdout.write(`\r  ├─ ${spinner} Retrying... (${elapsedTime}s)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  } finally {
    process.removeListener('SIGINT', handleInterrupt);
  }

  if (isInterrupted) {
    process.exit(0);
  }

  process.stdout.write('\r' + ' '.repeat(50) + '\r');

  if (!result || result.effects?.status.status === 'failure') {
    console.log(chalk.red('  └─ Publication failed'));
    process.exit(1);
  }

  let version = 1;
  let packageId = '';
  let schemaId = '';
  let schemas: Record<string, string> = {};
  let upgradeCapId = '';

  result.objectChanges!.map((object: ObjectChange) => {
    if (object.type === 'published') {
      packageId = object.packageId || '';
    }
    if (
      object.type === 'created' &&
      object.objectType &&
      object.objectType === '0x2::package::UpgradeCap'
    ) {
      upgradeCapId = object.objectId || '';
    }
  });

  await delay(3000);

  const deployHookTx = new Transaction();
  deployHookTx.moveCall({
    target: `${packageId}::dubhe_genesis::run`,
    arguments: [deployHookTx.object('0x6')]
  });

  let deployHookResult;
  try {
    deployHookResult = await dubhe.signAndSendTxn({ tx: deployHookTx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Deploy hook execution failed'));
    console.error(error.message);
    process.exit(1);
  }

  if (deployHookResult.effects?.status.status === 'success') {
    deployHookResult.objectChanges?.map((object: ObjectChange) => {
      if (
        object.type === 'created' &&
        object.objectType &&
        object.objectType.includes('dubhe_schema::Schema')
      ) {
        schemaId = object.objectId || '';
      }
    });
  }

  saveContractData('dubhe', network, packageId, schemaId, upgradeCapId, version, schemas);

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);
  await delay(1000);
}

export async function publishHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  gasBudget?: number
) {
  await switchEnv(network);

  const dubhe = initializeDubhe({
    network
  });

  if (network === 'localnet') {
    await publishDubheFramework(dubhe, network);
  }

  const path = process.cwd();
  const projectPath = `${path}/src/${dubheConfig.name}`;
  await updateDubheDependency(`${projectPath}/Move.toml`, network);
  await publishContract(dubhe, dubheConfig, network, projectPath, gasBudget);
}
