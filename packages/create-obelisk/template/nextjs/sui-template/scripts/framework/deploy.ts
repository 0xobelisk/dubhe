import { Obelisk, loadMetadata, Transaction } from '@0xobelisk/sui-client';
import { execSync } from 'child_process';
import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import chalk from 'chalk';
import { FrameworkDeploymentJsonType } from './types';
import { getFrameworkDeploymentJson } from './common';
import dotenv from 'dotenv';
dotenv.config();

export async function writeOutput(output: string, fullOutputPath: string, logPrefix?: string): Promise<void> {
  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, output);
  if (logPrefix !== undefined) {
    console.log(`${logPrefix}: ${fullOutputPath}`);
  }
}

export function saveContractData(
  projectName: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId: string,
  upgradeCap: string,
  dappsObjectId: string,
  version: number,
) {
  const DeploymentData: FrameworkDeploymentJsonType = {
    projectName,
    network,
    packageId,
    upgradeCap,
    dappsObjectId,
    version,
  };

  const path = process.cwd();
  const storeDeploymentData = JSON.stringify(DeploymentData, null, 2);
  writeOutput(
    storeDeploymentData,
    `${path}/localnet/obelisk-framework/.history/sui_${network}/latest.json`,
    'Updated deployment log',
  );
}

async function updateFrameworkMoveToml(frameworkPath: string, packageId: string | null = null) {
  const moveTomlPath = `${frameworkPath}/Move.toml`;

  try {
    let content = await fsAsync.readFile(moveTomlPath, 'utf8');

    if (packageId === null) {
      // Pre-deployment: Reset addresses to 0x0
      content = content.replace(/^published-at = "0x[0-9a-fA-F]+"/m, 'published-at = "0x0"');
      content = content.replace(/^obelisk = "0x[0-9a-fA-F]+"/m, 'obelisk = "0x0"');
      console.log(chalk.blue('Reset addresses in Move.toml to 0x0'));
    } else {
      // Post-deployment: Update to new packageId
      content = content.replace(/^published-at = "0x[0-9a-fA-F]+"/m, `published-at = "${packageId}"`);
      content = content.replace(/^obelisk = "0x[0-9a-fA-F]+"/m, `obelisk = "${packageId}"`);
      console.log(chalk.blue(`Updated addresses in Move.toml to ${packageId}`));
    }

    await fsAsync.writeFile(moveTomlPath, content);
  } catch (error) {
    console.error(chalk.red(`Failed to update Move.toml: ${error}`));
    throw error;
  }
}

export async function deployFramework() {
  const network = 'localnet';
  const path = process.cwd();
  const name = 'obelisk_framework';
  const frameworkPath = `${path}/localnet/obelisk-framework`;

  try {
    // Try to get historical deployment information
    const deploymentData = await getFrameworkDeploymentJson(path, network);

    // Check if the contract exists
    try {
      const metadata = await loadMetadata(network, deploymentData.packageId);
      if (metadata) {
        console.log(chalk.yellow('Framework contract already deployed on local network'));
        return; // Contract already exists, return directly
      }
    } catch (error) {
      console.log(
        chalk.yellow('Previous deployment found but contract not accessible, proceeding with new deployment'),
      );
    }
  } catch (error) {
    console.log(chalk.yellow('No previous deployment found, proceeding with new deployment'));
  }

  // Reset Move.toml addresses before compilation
  await updateFrameworkMoveToml(frameworkPath);

  // Check for private key in environment variables
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing PRIVATE_KEY environment variable');
  }

  // Initialize Obelisk client
  const obelisk = new Obelisk({
    networkType: network,
    secretKey: privateKey,
  });
  const keypair = obelisk.getKeypair();

  const balance = await obelisk.getBalance();
  console.log(chalk.blue(`Deployer Balance: ${(Number(balance.totalBalance) / 1_000_000_000).toFixed(4)} SUI`));

  if (BigInt(balance.totalBalance) < BigInt(1000000000)) {
    console.log(chalk.yellow('Balance is less than 1 SUI, requesting from faucet...'));
    await obelisk.requestFaucet();
    console.log(chalk.green('Successfully received SUI from faucet'));
  }

  // Compile and get bytecode
  let modules, dependencies;
  try {
    const buildResult = JSON.parse(
      execSync(`sui move build --dump-bytecode-as-base64 --path ${frameworkPath}`, {
        encoding: 'utf-8',
      }),
    );
    modules = buildResult.modules;
    dependencies = buildResult.dependencies;
  } catch (error: any) {
    console.error(chalk.red('Error executing sui move build:'));
    console.error(error.stdout);
    process.exit(1);
  }

  console.log(chalk.blue(`Deployer Address: ${keypair.toSuiAddress()}`));

  // Create publish transaction
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules,
    dependencies,
  });
  tx.transferObjects([upgradeCap], keypair.toSuiAddress());

  // Execute transaction
  try {
    const result = await obelisk.signAndSendTxn(tx);

    if (result.effects?.status.status === 'failure') {
      console.log(chalk.red(`Failed to execute publish`));
      process.exit(1);
    }

    let packageId = '';
    let upgradeCapId = '';
    let dappsObjectId = '';

    // Output deployment information
    result.objectChanges!.map(object => {
      if (object.type === 'published') {
        console.log(chalk.blue(`Framework PackageId: ${object.packageId}`));
        packageId = object.packageId;
      }
      if (object.type === 'created' && object.objectType === '0x2::package::UpgradeCap') {
        console.log(chalk.blue(`Framework UpgradeCap: ${object.objectId}`));
        upgradeCapId = object.objectId;
      }
      if (object.type === 'created' && object.objectType.includes('dapps_schema::Dapps')) {
        console.log(chalk.blue(`Framework Dapps ObjectId: ${object.objectId}`));
        dappsObjectId = object.objectId;
      }
    });

    // Update Move.toml addresses with new packageId
    await updateFrameworkMoveToml(frameworkPath, packageId);

    console.log(chalk.green(`Publish transaction digest: ${result.digest}`));

    // Save contract data
    saveContractData(
      name,
      network,
      packageId,
      upgradeCapId,
      dappsObjectId,
      1, // Initial version is 1
    );
  } catch (error: any) {
    console.error(chalk.red(`Failed to execute publish`));
    console.error(error.message);
    process.exit(1);
  }
}

// deployFramework();
