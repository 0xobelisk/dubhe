import { Transaction, UpgradePolicy } from '@0xobelisk/sui-client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { UpgradeError } from './errors';
import {
  getOldPackageId,
  getVersion,
  getUpgradeCap,
  saveContractData,
  switchEnv,
  initializeDubhe,
  getOnchainResources,
  getOnchainComponents,
  getStartCheckpoint,
  updateGenesisUpgradeFunction,
  getDubheDappHub
} from './utils';
import * as fs from 'fs';
import * as path from 'path';
import { DubheConfig } from '@0xobelisk/sui-common';

type Migration = {
  name: string;
  fields: any;
};

function replaceEnvField(
  filePath: string,
  networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  field: 'original-published-id' | 'latest-published-id' | 'published-version',
  newValue: string
): string {
  const envFilePath = path.resolve(filePath);
  const envContent = fs.readFileSync(envFilePath, 'utf-8');
  const envLines = envContent.split('\n');

  const networkSectionIndex = envLines.findIndex((line) => line.trim() === `[env.${networkType}]`);
  if (networkSectionIndex === -1) {
    console.log(`Network type [env.${networkType}] not found in the file.`);
    return '';
  }

  let fieldIndex = -1;
  let previousValue: string = '';
  for (let i = networkSectionIndex + 1; i < envLines.length; i++) {
    const line = envLines[i].trim();
    if (line.startsWith('[')) break; // End of the current network section

    if (line.startsWith(field)) {
      fieldIndex = i;
      previousValue = line.split('=')[1].trim().replace(/"/g, '');
      break;
    }
  }

  if (fieldIndex !== -1) {
    envLines[fieldIndex] = `${field} = "${newValue}"`;
    const newEnvContent = envLines.join('\n');
    fs.writeFileSync(envFilePath, newEnvContent, 'utf-8');
  } else {
    console.log(`${field} not found for [env.${networkType}].`);
  }

  return previousValue;
}

export async function upgradeHandler(
  config: DubheConfig,
  name: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  await switchEnv(network);

  const path = process.cwd();
  const projectPath = `${path}/src/${name}`;

  const dubhe = initializeDubhe({network});

  let oldVersion = Number(await getVersion(projectPath, network));
  let oldPackageId = await getOldPackageId(projectPath, network);
  let upgradeCap = await getUpgradeCap(projectPath, network);
  let startCheckpoint = await getStartCheckpoint(projectPath, network);
  let dappHub = await getDubheDappHub(network);
  let onchainResources = await getOnchainResources(projectPath, network);
  let onchainComponents = await getOnchainComponents(projectPath, network);

  let pendingMigration: Migration[] = [];
  Object.entries(config.resources).forEach(([key, value]) => {
    if (!onchainResources.hasOwnProperty(key)) { 
      pendingMigration.push({ name: key, fields: value });
    }
  });
  Object.entries(config.components).forEach(([key, value]) => {
    if (!onchainComponents.hasOwnProperty(key)) { 
      pendingMigration.push({ name: key, fields: value });
    }
  });

  const tables = pendingMigration.map((migration) => migration.name);
  updateGenesisUpgradeFunction(projectPath, tables);

  const original_published_id = replaceEnvField(
      `${projectPath}/Move.lock`,
      network,
      'original-published-id',
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

  try {
    let modules: any, dependencies: any, digest: any;
    try {
      const {
        modules: extractedModules,
        dependencies: extractedDependencies,
        digest: extractedDigest
      } = JSON.parse(
        execSync(`sui move build --dump-bytecode-as-base64 --path ${path}/src/${name}`, {
          encoding: 'utf-8'
        })
      );

      modules = extractedModules;
      dependencies = extractedDependencies;
      digest = extractedDigest;
    } catch (error: any) {
      throw new UpgradeError(error.stdout);
    }

    console.log('\n🚀 Starting Upgrade Process...');
    console.log('📋 OldPackageId:', oldPackageId);
    console.log('📋 UpgradeCap Object Id:', upgradeCap);
    console.log('📋 OldVersion:', oldVersion);

    const tx = new Transaction();
    const ticket = tx.moveCall({
      target: '0x2::package::authorize_upgrade',
      arguments: [
        tx.object(upgradeCap),
        tx.pure.u8(UpgradePolicy.COMPATIBLE),
        tx.pure.vector('u8', digest)
      ]
    });

    const receipt = tx.upgrade({
      modules,
      dependencies,
      package: oldPackageId,
      ticket
    });

    tx.moveCall({
      target: '0x2::package::commit_upgrade',
      arguments: [tx.object(upgradeCap), receipt]
    });

    const result = await dubhe.signAndSendTxn({
      tx,
      onSuccess: (result) => {
        console.log(chalk.green(`Upgrade Transaction Digest: ${result.digest}`));
      },
      onError: (error) => {
        console.log(chalk.red('Upgrade Transaction failed!'));
        console.error(error);
      }
    });

    let newPackageId = '';
    result.objectChanges!.map((object) => {
      if (object.type === 'published') {
        console.log(chalk.blue(`${name} new PackageId: ${object.packageId}`));
        console.log(chalk.blue(`${name} new Version: ${oldVersion + 1}`));
        newPackageId = object.packageId;
      }
    });

    replaceEnvField(
      `${projectPath}/Move.lock`,
      network,
      'original-published-id',
      original_published_id
    );
    replaceEnvField(`${projectPath}/Move.lock`, network, 'latest-published-id', newPackageId);
    replaceEnvField(`${projectPath}/Move.lock`, network, 'published-version', oldVersion + 1 + '');

    saveContractData(
      name,
      network,
      startCheckpoint,
      newPackageId,
      dappHub,
      upgradeCap,
      oldVersion + 1,
      config.components,
      config.resources,
      config.enums
    );

    console.log(`\n🚀 Starting Migration Process...`);
    pendingMigration.forEach((migration) => {
      console.log('📋 Added Fields:', JSON.stringify(migration, null, 2));
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const migrateTx = new Transaction();
    const newVersion = oldVersion + 1;
    migrateTx.moveCall({
      target: `${newPackageId}::migrate::migrate_to_v${newVersion}`,
      arguments: [
        migrateTx.object(dappHub),
        migrateTx.pure.address(newPackageId),
        migrateTx.pure.u32(newVersion)
      ]
    });

    await dubhe.signAndSendTxn({
      tx: migrateTx,
      onSuccess: (result) => {
        console.log(chalk.green(`Migration Transaction Digest: ${result.digest}`));
      },
      onError: (error) => {
        console.log(
          chalk.red('Migration Transaction failed!, Please execute the migration manually.')
        );
        console.error(error);
      }
    });
  } catch (error: any) {
    console.log(chalk.red('upgrade handler execution failed!'));
    console.error(error.message);
  }
}
