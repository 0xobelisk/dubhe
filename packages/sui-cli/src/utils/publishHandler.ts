import { Dubhe, Transaction } from '@0xobelisk/sui-client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DubheCliError } from './errors';
import {
  saveContractData,
  validatePrivateKey,
  updateDubheDependency,
  switchEnv,
  delay
} from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import * as fs from 'fs';
import * as path from 'path';

const PluginSchemaId = {
  merak: '0x492e9c4c945d1b148d7e9958c0bc932219c02af3f994fd4073a4e7c3553e08d3'
};

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

async function publishContract(
  dubhe: Dubhe,
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  projectPath: string,
  gasBudget?: number
) {
  const chainId = await dubhe.suiInteractor.currentClient.getChainIdentifier();
  await removeEnvContent(`${projectPath}/Move.lock`, network);
  console.log('\n🚀 Starting Contract Publication...');
  console.log(`  ├─ Project: ${projectPath}`);
  console.log(`  ├─ Network: ${network}`);
  console.log(`  ├─ ChainId: ${chainId}`);
  console.log('  ├─ Validating Environment...');

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

  let result;
  try {
    result = await dubhe.signAndSendTxn({ tx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Publication failed'));
    console.error(error.message);
    process.exit(1);
  }

  if (result.effects?.status.status === 'failure') {
    console.log(chalk.red('  └─ Publication failed'));
    process.exit(1);
  }

  console.log('  ├─ Processing publication results...');
  let version = 1;
  let packageId = '';
  let schemaId = '';
  let schemas = dubheConfig.schemas;
  let upgradeCapId = '';

  result.objectChanges!.map((object) => {
    if (object.type === 'published') {
      console.log(`  ├─ Package ID: ${object.packageId}`);
      packageId = object.packageId;
    }
    if (object.type === 'created' && object.objectType === '0x2::package::UpgradeCap') {
      console.log(`  ├─ Upgrade Cap: ${object.objectId}`);
      upgradeCapId = object.objectId;
    }
  });

  console.log(`  └─ Transaction: ${result.digest}`);

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);

  console.log('\n⚡ Executing Deploy Hook...');
  await delay(5000);

  const deployHookTx = new Transaction();
  let args = [deployHookTx.object('0x6')];
  if (dubheConfig.plugins) {
    dubheConfig.plugins.forEach((plugin) => {
      args.push(deployHookTx.object(PluginSchemaId[plugin]));
    });
  }
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

    console.log('\n📋 Created Schemas:');
    deployHookResult.objectChanges?.map((object) => {
      if (object.type === 'created' && object.objectType.includes('schema::Schema')) {
        schemaId = object.objectId;
      }
      if (
        object.type === 'created' &&
        object.objectType.includes('schema') &&
        !object.objectType.includes('dynamic_field')
      ) {
        console.log(`  ├─ Type: ${object.objectType}`);
        console.log(`  └─ ID: ${object.objectId}`);
      }
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
    console.log(chalk.yellow('  │  1. Create directory: mkdir -p contracts/dubhe-framework'));
    console.log(
      chalk.yellow(
        '  │  2. Clone repository: git clone https://github.com/0xobelisk/dubhe-framework contracts/dubhe-framework'
      )
    );
    console.log(
      chalk.yellow('  │  3. Or download from: https://github.com/0xobelisk/dubhe-framework')
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
  const projectPath = `${path}/contracts/dubhe-framework`;

  if (!(await checkDubheFramework(projectPath))) {
    return;
  }

  // const chainId = await client.getChainIdentifier();
  const chainId = await dubhe.suiInteractor.currentClient.getChainIdentifier();
  await removeEnvContent(`${projectPath}/Move.lock`, network);
  const [modules, dependencies] = buildContract(projectPath);
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], dubhe.getAddress());

  let result;
  try {
    result = await dubhe.signAndSendTxn({ tx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Publication failed'));
    console.error(error.message);
    process.exit(1);
  }

  if (result.effects?.status.status === 'failure') {
    console.log(chalk.red('  └─ Publication failed'));
    process.exit(1);
  }
  let packageId = '';

  result.objectChanges!.map((object) => {
    if (object.type === 'published') {
      packageId = object.packageId;
    }
  });

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);
  await delay(1000);
}

export async function publishHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  gasBudget?: number
) {
  await switchEnv(network);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new DubheCliError(
      `Missing PRIVATE_KEY environment variable.
Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
in your contracts directory to use the default sui private key.`
    );
  }
  const privateKeyFormat = validatePrivateKey(privateKey);
  if (privateKeyFormat === false) {
    throw new DubheCliError(`Please check your privateKey.`);
  }

  const dubhe = new Dubhe({
    secretKey: privateKeyFormat,
    networkType: network
  });

  if (network === 'localnet') {
    await publishDubheFramework(dubhe, network);
  }

  const path = process.cwd();
  const projectPath = `${path}/contracts/${dubheConfig.name}`;
  await updateDubheDependency(`${projectPath}/Move.toml`, network);
  await publishContract(dubhe, dubheConfig, network, projectPath, gasBudget);
}
