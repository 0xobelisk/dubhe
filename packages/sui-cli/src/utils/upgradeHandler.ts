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
  getStartCheckpoint,
  appendMigrateFunction,
  getDubheDappHub,
  updatePublishedToml,
  clearPublishedTomlEntry,
  restorePublishedTomlEntry,
  readPublishedToml,
  updateEphemeralPubFile,
  getEphemeralPubFilePath,
  updateMoveTomlAddress
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

  const dubhe = initializeDubhe({ network });

  let oldVersion = Number(await getVersion(projectPath, network));
  let oldPackageId = await getOldPackageId(projectPath, network);
  let upgradeCap = await getUpgradeCap(projectPath, network);
  let startCheckpoint = await getStartCheckpoint(projectPath, network);
  let dappHub = await getDubheDappHub(network);
  let onchainResources = await getOnchainResources(projectPath, network);

  let pendingMigration: Migration[] = [];
  Object.entries(config.resources).forEach(([key, value]) => {
    if (!onchainResources.hasOwnProperty(key)) {
      pendingMigration.push({ name: key, fields: value });
    }
  });

  const tables = pendingMigration.map((migration) => migration.name);
  // When new resources are detected, generate the migrate_to_vN entry function in
  // migrate.move so the on-chain migration transaction can register the new package
  // ID and version via dapp_system::upgrade_dapp.
  // Note: the current framework stores data as dynamic fields and does NOT use
  // register_table; genesis::migrate() is intentionally left empty and is called
  // from migrate_to_vN solely to keep the extension point for future use.
  if (tables.length > 0) {
    appendMigrateFunction(projectPath, config.name, oldVersion + 1);
  }

  const original_published_id = replaceEnvField(
    `${projectPath}/Move.lock`,
    network,
    'original-published-id',
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  // For persistent networks (testnet/mainnet): zero out Published.toml so the
  // package compiles with address 0x0 for upgrade.
  // For localnet: we use --build-env testnet + Pub.localnet.toml, so Published.toml
  // is not consulted during the build and does not need to be cleared.
  const savedPublishedEntry =
    network !== 'localnet' ? clearPublishedTomlEntry(projectPath, network) : undefined;

  // For localnet upgrades: refresh Pub.localnet.toml with dubhe's current address
  // so that the build can resolve the dubhe dependency.
  // Skip this step when upgrading dubhe itself — dubhe has no local dubhe dependency,
  // and adding its own address to the pubfile causes PublishErrorNonZeroAddress because
  // the Sui CLI treats the root package's pubfile entry as a non-zero self-address.
  const cwd = process.cwd();
  if (network === 'localnet' && name !== 'dubhe') {
    const dubheProjectPath = `${cwd}/src/dubhe`;
    const dubheEntries = readPublishedToml(dubheProjectPath);
    const dubheEntry = dubheEntries['localnet'];
    if (dubheEntry) {
      const pubfilePath = getEphemeralPubFilePath(cwd, network);
      const dubheUpgradeCap = await getUpgradeCap(dubheProjectPath, network).catch(() => '');
      updateEphemeralPubFile(pubfilePath, dubheEntry.chainId, 'testnet', {
        source: dubheProjectPath,
        publishedAt: dubheEntry.publishedAt,
        originalId: dubheEntry.originalId,
        upgradeCap: dubheUpgradeCap
      });
    }
  }

  try {
    let modules: any, dependencies: any, digest: any;
    // When upgrading dubhe itself on localnet, Move.toml has a non-zero 'dubhe' address
    // (the mainnet/testnet deploy address). This gets baked into the upgrade bytecode as the
    // self-address, causing PublishErrorNonZeroAddress. Zero it out before the build and
    // restore it afterwards — mirroring what publishDubheFramework does.
    let savedDubheMoveTomlContent: string | null = null;
    if (network === 'localnet' && name === 'dubhe') {
      const moveTomlPath = `${projectPath}/Move.toml`;
      savedDubheMoveTomlContent = fs.readFileSync(moveTomlPath, 'utf-8');
      updateMoveTomlAddress(projectPath, '0x0');
    }
    try {
      // For localnet: use --build-env testnet --pubfile-path Pub.localnet.toml
      // so the package compiles with address 0x0 (not in pubfile) and links
      // against the already-published dubhe dependency (from pubfile).
      // Exception: when upgrading dubhe itself, skip the pubfile — dubhe has no
      // local dubhe dependency and including itself in the pubfile causes
      // PublishErrorNonZeroAddress.
      // For testnet/mainnet: use -e <network> as usual.
      let buildCmd: string;
      if (network === 'localnet') {
        if (name !== 'dubhe') {
          const pubfilePath = getEphemeralPubFilePath(cwd, network);
          buildCmd = `sui move build --dump-bytecode-as-base64 --no-tree-shaking --build-env testnet --pubfile-path ${pubfilePath} --path ${path}/src/${name}`;
        } else {
          buildCmd = `sui move build --dump-bytecode-as-base64 --no-tree-shaking --build-env testnet --path ${path}/src/${name}`;
        }
      } else {
        buildCmd = `sui move build --dump-bytecode-as-base64 --no-tree-shaking -e ${network} --path ${path}/src/${name}`;
      }

      const {
        modules: extractedModules,
        dependencies: extractedDependencies,
        digest: extractedDigest
      } = JSON.parse(execSync(buildCmd, { encoding: 'utf-8', stdio: 'pipe' }));

      modules = extractedModules;
      dependencies = extractedDependencies;
      digest = extractedDigest;
    } catch (error: any) {
      // Restore Published.toml before throwing (only for persistent networks)
      if (savedPublishedEntry) {
        restorePublishedTomlEntry(projectPath, network, savedPublishedEntry);
      }
      throw new UpgradeError(error.stdout || error.stderr || error.message);
    } finally {
      // Always restore dubhe Move.toml after build (success or error)
      if (savedDubheMoveTomlContent !== null) {
        fs.writeFileSync(`${projectPath}/Move.toml`, savedDubheMoveTomlContent, 'utf-8');
      }
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

    // Update Published.toml with the new package ID after upgrade.
    // For localnet: savedPublishedEntry is undefined (we skip clearPublishedTomlEntry),
    // so fall back to reading the current Published.toml entry for chainId/originalId.
    const existingEntry = readPublishedToml(projectPath)[network];
    const chainId = savedPublishedEntry?.chainId ?? existingEntry?.chainId ?? '';
    updatePublishedToml(
      projectPath,
      network,
      chainId,
      newPackageId,
      savedPublishedEntry?.originalId ?? existingEntry?.originalId ?? original_published_id,
      oldVersion + 1
    );

    saveContractData(
      name,
      network,
      startCheckpoint,
      newPackageId,
      dappHub,
      upgradeCap,
      oldVersion + 1,
      config.resources,
      config.enums
    );

    // Only run the migration transaction if there are pending schema changes.
    // A "bug-fix" upgrade with no new fields does not need a migration call.
    // The migrate_to_vX function is only generated by `dubhe schemagen` when
    // new components / resources are added.
    if (pendingMigration.length > 0) {
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
    } else {
      console.log(`\n✅ No schema changes — migration step skipped.`);
      // Brief delay to allow localnet to index the upgraded package before
      // subsequent on-chain queries.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error: any) {
    // Restore Published.toml to original state on failure (persistent networks only)
    if (savedPublishedEntry) {
      restorePublishedTomlEntry(projectPath, network, savedPublishedEntry);
    }
    console.log(chalk.red('upgrade handler execution failed!'));
    throw error;
  }
}
