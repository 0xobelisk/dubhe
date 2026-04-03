import { Dubhe, Transaction } from '@0xobelisk/sui-client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import {
  saveContractData,
  updateMoveTomlAddress,
  switchEnv,
  delay,
  getDubheDappHub,
  initializeDubhe,
  saveMetadata,
  getOriginalDubhePackageId,
  updatePublishedToml,
  updateEphemeralPubFile,
  getEphemeralPubFilePath,
  getPublishedTomlEntry,
  clearPublishedTomlEntry,
  restorePublishedTomlEntry
} from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Temporarily add localnet to Move.toml [environments] section before building.
 * Sui CLI 1.40+ requires the active environment to be declared in Move.toml even
 * when --build-env is specified. This patches the file and returns the original
 * content so the caller can restore it in a finally block.
 * Returns null if no changes were needed.
 */
function patchMoveTomlWithLocalnetEnv(moveTomlPath: string, chainId: string): string | null {
  if (!fs.existsSync(moveTomlPath)) return null;
  const content = fs.readFileSync(moveTomlPath, 'utf-8');

  if (content.includes('localnet')) {
    return null;
  }

  let updatedContent: string;
  if (content.includes('[environments]')) {
    updatedContent = content.replace('[environments]', `[environments]\nlocalnet = "${chainId}"`);
  } else {
    updatedContent = content.trimEnd() + `\n\n[environments]\nlocalnet = "${chainId}"\n`;
  }

  fs.writeFileSync(moveTomlPath, updatedContent, 'utf-8');
  return content;
}

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

/**
 * Build a Move package and return [modules, dependencies] as base64 arrays.
 *
 * For localnet (ephemeral) networks:
 *   - Uses --build-env testnet so dependency addresses are resolved via testnet
 *     Published.toml (no need to add 'localnet' to Move.toml [environments]).
 *   - Optionally reads a Pub.localnet.toml pubfile for already-published local deps.
 *   - This matches the Sui docs approach:
 *     https://docs.sui.io/guides/developer/packages/move-package-management
 *
 * For persistent networks (testnet/mainnet/devnet): uses -e <network> as before.
 */
function buildContract(
  projectPath: string,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  pubfilePath?: string
): string[][] {
  let modules: any, dependencies: any;
  try {
    let buildEnvFlag: string;
    if (network === 'localnet') {
      // Ephemeral approach: resolve deps via testnet configuration.
      // --pubfile-path supplies already-published local dep addresses (e.g. dubhe).
      buildEnvFlag = ' --build-env testnet';
      if (pubfilePath) {
        buildEnvFlag += ` --pubfile-path ${pubfilePath}`;
      }
    } else {
      buildEnvFlag = network ? ` -e ${network}` : '';
    }

    // --no-tree-shaking avoids on-chain RPC calls during build.
    const buildResult = JSON.parse(
      execSync(
        `sui move build --dump-bytecode-as-base64 --no-tree-shaking${buildEnvFlag} --path ${projectPath}`,
        {
          encoding: 'utf-8',
          stdio: 'pipe'
        }
      )
    );
    modules = buildResult.modules;
    dependencies = buildResult.dependencies;
  } catch (error: any) {
    console.error(chalk.red('  └─ Build failed'));
    console.error(error.stdout || error.stderr);
    throw new Error(`Build failed: ${error.stdout || error.stderr || error.message}`);
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
  const chainId = await dubhe.suiInteractor.currentClient.getChainIdentifier();
  console.log(`  ├─ ChainId: ${chainId}`);
  const address = dubhe.getAddress();
  const coins = await dubhe.suiInteractor.currentClient.getCoins({
    owner: address,
    coinType: '0x2::sui::SUI'
  });

  if (coins.data.length > 0) {
    const balance = coins.data.reduce((sum, coin) => sum + Number(coin.balance), 0);
    if (balance > 0) {
      console.log(`  ├─ Deployer balance: ${balance / 10 ** 9} SUI`);
      return chainId;
    } else {
      console.log(
        chalk.yellow(
          `  ├─ Deployer balance: 0 SUI, please ensure your account has sufficient SUI balance`
        )
      );
    }
  }
  return chainId;
}

async function publishContract(
  dubhe: Dubhe,
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  projectPath: string,
  gasBudget?: number,
  force?: boolean
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
  // For localnet: pass the ephemeral pubfile so the build system can resolve
  // the dubhe dependency that was just published in publishDubheFramework().
  const pubfilePath =
    network === 'localnet' ? getEphemeralPubFilePath(process.cwd(), network) : undefined;

  // Move.toml paths — declared early so both the Published.toml handling block and
  // the localnet env-patching block can reference them.
  const contractMoveTomlPath = `${projectPath}/Move.toml`;
  const dubheMoveTomlPath = path.join(path.dirname(projectPath), 'dubhe', 'Move.toml');
  let savedContractMoveToml: string | null = null;
  let savedDubheMoveToml: string | null = null;

  // So the build uses package address 0x0: for localnet always remove the contract's
  // Published.toml; for testnet/mainnet/devnet only when --force (clear current network entry).
  // Otherwise Sui CLI bakes the existing [published.<network>] address into the bytecode and
  // the chain rejects with PublishErrorNonZeroAddress.
  const contractPublishedTomlPath = `${projectPath}/Published.toml`;
  let savedContractPublishedToml: string | null = null;
  let savedContractPublishedEntry: {
    network: string;
    entry: Exclude<ReturnType<typeof getPublishedTomlEntry>, undefined>;
  } | null = null;
  if (network === 'localnet' && fs.existsSync(contractPublishedTomlPath)) {
    savedContractPublishedToml = fs.readFileSync(contractPublishedTomlPath, 'utf-8');
    fs.unlinkSync(contractPublishedTomlPath);
  } else if (network === 'testnet' || network === 'mainnet' || network === 'devnet') {
    const entry = getPublishedTomlEntry(projectPath, network);
    if (entry && force) {
      // Existing entry + --force: clear it so the build uses 0x0 instead of the old address.
      savedContractPublishedEntry = { network, entry };
      clearPublishedTomlEntry(projectPath, network);
    } else if (!entry) {
      // No Published.toml entry for this network (first-time deploy to this network).
      // The Sui CLI has no per-network override and falls back to Move.toml's [addresses]
      // value, which may be non-zero from a previous deployment on a different network,
      // causing PublishErrorNonZeroAddress.
      // Temporarily zero out Move.toml before building so the self-address is 0x0.
      savedContractMoveToml = fs.readFileSync(contractMoveTomlPath, 'utf-8');
      updateMoveTomlAddress(projectPath, '0x0');
    }
  }

  // For localnet: also temporarily remove dubhe's Published.toml when building the
  // contract package. After publishDubheFramework restores dubhe/Published.toml, its
  // testnet entry's original-id may be "0x0", which collides with the contract package's
  // own address (also 0x0 before publish), triggering a spurious cyclic-dependency error.
  const dubhePublishedTomlPath = path.join(path.dirname(projectPath), 'dubhe', 'Published.toml');
  let savedDubhePublishedToml: string | null = null;
  if (network === 'localnet' && fs.existsSync(dubhePublishedTomlPath)) {
    savedDubhePublishedToml = fs.readFileSync(dubhePublishedTomlPath, 'utf-8');
    fs.unlinkSync(dubhePublishedTomlPath);
  }

  // Sui CLI 1.40+ checks that the active environment is declared in Move.toml
  // even when --build-env is specified. Temporarily inject localnet into [environments]
  // for both the contract and its dubhe dependency.
  if (network === 'localnet') {
    savedContractMoveToml = patchMoveTomlWithLocalnetEnv(contractMoveTomlPath, chainId);
    savedDubheMoveToml = patchMoveTomlWithLocalnetEnv(dubheMoveTomlPath, chainId);
  }

  let modules: any, dependencies: any;
  try {
    [modules, dependencies] = buildContract(projectPath, network, pubfilePath);
  } finally {
    if (savedContractPublishedToml !== null) {
      fs.writeFileSync(contractPublishedTomlPath, savedContractPublishedToml, 'utf-8');
    }
    if (savedContractPublishedEntry !== null) {
      restorePublishedTomlEntry(
        projectPath,
        savedContractPublishedEntry.network,
        savedContractPublishedEntry.entry
      );
    }
    if (savedDubhePublishedToml !== null) {
      fs.writeFileSync(dubhePublishedTomlPath, savedDubhePublishedToml, 'utf-8');
    }
    if (savedContractMoveToml !== null) {
      fs.writeFileSync(contractMoveTomlPath, savedContractMoveToml, 'utf-8');
    }
    if (savedDubheMoveToml !== null) {
      fs.writeFileSync(dubheMoveTomlPath, savedDubheMoveToml, 'utf-8');
    }
  }

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
    if (
      !force &&
      (network === 'testnet' || network === 'mainnet' || network === 'devnet') &&
      /PublishErrorNonZeroAddress/i.test(String(error?.message))
    ) {
      console.error(
        chalk.yellow(
          '  Tip: This package may already be published on this network. Use --force to clear the stored address and publish as new, or use "dubhe upgrade" to update the existing package.'
        )
      );
    }
    throw new Error(`Contract publication failed: ${error.message}`);
  }

  if (!result || result.effects?.status.status === 'failure') {
    throw new Error('Contract publication transaction failed');
  }

  console.log('  ├─ Processing publication results...');
  let version = 1;
  let packageId = '';
  let dappHub = '';
  let resources = dubheConfig.resources ?? {};
  let enums = dubheConfig.enums;
  let upgradeCapId = '';
  let startCheckpoint = '';

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
    if (
      object.type === 'created' &&
      object.objectType &&
      object.objectType.includes('dapp_service::DappHub')
    ) {
      dappHub = object.objectId || '';
    }
    if (object.type === 'created') {
      printObjects.push(object);
    }
  });

  console.log(`  └─ Transaction: ${result.digest}`);

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);
  updatePublishedToml(projectPath, network, chainId, packageId, packageId, 1);

  console.log('\n⚡ Executing Deploy Hook...');
  await delay(5000);

  startCheckpoint = await dubhe.suiInteractor.currentClient.getLatestCheckpointSequenceNumber();

  const deployHookTx = new Transaction();
  let args = [];
  let dubheDappHub = dubheConfig.name === 'dubhe' ? dappHub : await getDubheDappHub(network);
  args.push(deployHookTx.object(dubheDappHub));
  // Dubhe framework genesis::run(dapp_hub, ctx) does not take clock.
  // DApp genesis::run(dapp_hub, clock, ctx) still takes clock.
  if (dubheConfig.name !== 'dubhe') {
    args.push(deployHookTx.object('0x6'));
  }
  deployHookTx.moveCall({
    target: `${packageId}::genesis::run`,
    arguments: args
  });

  let deployHookResult;
  try {
    deployHookResult = await dubhe.signAndSendTxn({ tx: deployHookTx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Deploy hook execution failed'));
    console.error(error.message);
    throw new Error(`genesis::run failed: ${error.message}`);
  }

  if (deployHookResult.effects?.status.status === 'success') {
    console.log('  ├─ Hook execution successful');
    console.log(`  ├─ Transaction: ${deployHookResult.digest}`);

    // Capture the DappStorage object created by genesis::run so we can persist
    // its ID for later use in migrate_to_vN transactions during upgrades.
    let dappStorageId = '';
    deployHookResult.objectChanges!.map((object: ObjectChange) => {
      if (
        object.type === 'created' &&
        object.objectType &&
        object.objectType.includes('dapp_service::DappStorage')
      ) {
        dappStorageId = object.objectId || '';
        console.log(`  ├─ DappStorage: ${dappStorageId}`);
      }
    });

    console.log('\n📋 Created Objects:');
    printObjects.map((object: ObjectChange) => {
      console.log(`  ├─ ID: ${object.objectId}`);
      console.log(`  └─ Type: ${object.objectType}`);
    });

    await saveContractData(
      dubheConfig.name,
      network,
      startCheckpoint,
      packageId,
      dubheDappHub,
      upgradeCapId,
      version,
      resources,
      enums,
      // localnet: persist the locally deployed framework ID so the SDK can be
      // initialised without hardcoding it.  testnet/mainnet use a well-known
      // constant already embedded in the SDK defaults, so we store undefined.
      network === 'localnet' ? await getOriginalDubhePackageId(network) : undefined,
      dappStorageId || undefined
    );

    await saveMetadata(dubheConfig.name, network, packageId);

    // Insert package id to dubhe config
    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/dubhe.config.json`, 'utf-8'));
    config.original_package_id = packageId;
    config.dubhe_object_id = dubheDappHub;
    // When deploying the dubhe framework itself, the "original dubhe package ID" is
    // the package we just published. For user packages, look up the well-known
    // framework address for the target network from the client config.
    config.original_dubhe_package_id =
      dubheConfig.name === 'dubhe' ? packageId : await getOriginalDubhePackageId(network);
    config.start_checkpoint = startCheckpoint;

    fs.writeFileSync(`${process.cwd()}/dubhe.config.json`, JSON.stringify(config, null, 2));

    console.log('\n✅ Contract Publication Complete\n');
  } else {
    throw new Error(`genesis::run transaction failed. Digest: ${deployHookResult.digest}`);
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
    console.log(chalk.yellow('  │  3. Or download from: https://github.com/0xobelisk/dubhe'));
    console.log(chalk.yellow('  └─ After setup, restart the local node'));
    return false;
  }
  return true;
}

export async function publishDubheFramework(
  dubhe: Dubhe,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  const cwd = process.cwd();
  const projectPath = `${cwd}/src/dubhe`;

  if (!(await checkDubheFramework(projectPath))) {
    return;
  }

  console.log('\n🚀 Starting Dubhe Framework Publication...');
  console.log('  ├─ Waiting for node...');

  const chainId = await waitForNode(dubhe);

  await removeEnvContent(`${projectPath}/Move.lock`, network);
  if (network === 'localnet') {
    // When building with --build-env testnet, Sui CLI reads Move.lock's [env.testnet] section
    // and bakes its original-published-id (non-zero for a previously published dubhe) into the
    // bytecode as the package self-address. Publishing then fails with PublishErrorNonZeroAddress
    // because Sui requires the self-address to be 0x0 for a first-time publish.
    // Fix: clear the testnet env section before building so the CLI uses 0x0 from Move.toml.
    await removeEnvContent(`${projectPath}/Move.lock`, 'testnet');
  }
  await updateMoveTomlAddress(projectPath, '0x0');

  const startCheckpoint =
    await dubhe.suiInteractor.currentClient.getLatestCheckpointSequenceNumber();

  // For localnet: --build-env testnet is used to resolve git dependencies, but the
  // Move CLI will also read Published.toml and use any existing testnet address for
  // dubhe — causing PublishErrorNonZeroAddress if a testnet entry already exists.
  // Fix: temporarily remove Published.toml before the build, then restore it.
  // This ensures the dubhe package compiles with address 0x0 (from Move.toml).
  const publishedTomlPath = `${projectPath}/Published.toml`;
  let savedPublishedTomlContent: string | null = null;
  if (network === 'localnet' && fs.existsSync(publishedTomlPath)) {
    savedPublishedTomlContent = fs.readFileSync(publishedTomlPath, 'utf-8');
    fs.unlinkSync(publishedTomlPath);
  }

  // Sui CLI 1.40+ checks that the active environment is declared in Move.toml
  // even when --build-env is specified. Temporarily inject localnet into [environments].
  const moveTomlPath = `${projectPath}/Move.toml`;
  let savedMoveTomlContent: string | null = null;
  if (network === 'localnet') {
    savedMoveTomlContent = patchMoveTomlWithLocalnetEnv(moveTomlPath, chainId);
  }

  let modules: any, dependencies: any;
  try {
    // For localnet: use --build-env testnet (no pubfile needed — dubhe has no local deps).
    // For testnet/mainnet: use -e <network> as usual.
    [modules, dependencies] = buildContract(projectPath, network);
  } finally {
    // Always restore Published.toml and Move.toml (successful build or error)
    if (savedPublishedTomlContent !== null) {
      fs.writeFileSync(publishedTomlPath, savedPublishedTomlContent, 'utf-8');
    }
    if (savedMoveTomlContent !== null) {
      fs.writeFileSync(moveTomlPath, savedMoveTomlContent, 'utf-8');
    }
  }

  const tx = new Transaction();
  const [upgradeCap] = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], dubhe.getAddress());

  let result;
  try {
    result = await dubhe.signAndSendTxn({ tx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Publication failed'));
    console.error(error.message);
    throw new Error(`Dubhe framework publication failed: ${error.message}`);
  }

  if (!result || result.effects?.status.status === 'failure') {
    throw new Error('Dubhe framework publication transaction failed');
  }

  let version = 1;
  let packageId = '';
  let dappHub = '';
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
    if (
      object.type === 'created' &&
      object.objectType &&
      object.objectType.includes('dapp_service::DappHub')
    ) {
      dappHub = object.objectId || '';
    }
  });

  await delay(3000);
  const deployHookTx = new Transaction();
  // Dubhe framework genesis::run(dapp_hub, ctx) — clock no longer required.
  deployHookTx.moveCall({
    target: `${packageId}::genesis::run`,
    arguments: [deployHookTx.object(dappHub)]
  });

  let deployHookResult;
  try {
    deployHookResult = await dubhe.signAndSendTxn({ tx: deployHookTx });
  } catch (error: any) {
    console.error(chalk.red('  └─ Deploy hook execution failed'));
    console.error(error.message);
    throw new Error(`Dubhe genesis::run failed: ${error.message}`);
  }

  if (deployHookResult.effects?.status.status !== 'success') {
    throw new Error('Deploy hook execution failed');
  }

  await updateMoveTomlAddress(projectPath, packageId);
  await saveContractData(
    'dubhe',
    network,
    startCheckpoint,
    packageId,
    dappHub,
    upgradeCapId,
    version,
    {},
    {},
    // Store the localnet framework package ID so other packages can read it
    // from deployment JSON and pass it to the Dubhe client constructor.
    network === 'localnet' ? packageId : undefined
  );

  updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);
  updatePublishedToml(projectPath, network, chainId, packageId, packageId, 1);

  // For localnet: write dubhe's published address to Pub.localnet.toml so that
  // the counter package build (next step) can resolve the dubhe dependency.
  if (network === 'localnet') {
    const pubfilePath = getEphemeralPubFilePath(cwd, network);
    updateEphemeralPubFile(pubfilePath, chainId, 'testnet', {
      source: projectPath,
      publishedAt: packageId,
      originalId: packageId,
      upgradeCap: upgradeCapId
    });
  }
}

export async function publishHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  force: boolean,
  gasBudget?: number
) {
  await switchEnv(network);

  const dubhe = initializeDubhe({
    network
  });

  const path = process.cwd();
  const projectPath = `${path}/src/${dubheConfig.name}`;

  if (network === 'localnet' && dubheConfig.name !== 'dubhe') {
    await publishDubheFramework(dubhe, network);
  }

  await publishContract(dubhe, dubheConfig, network, projectPath, gasBudget, force);
}
