import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join as pathJoin } from 'path';
import * as readline from 'readline';
import { SUI_PRIVATE_KEY_PREFIX } from '@mysten/sui/cryptography';
import { FsIibError } from './errors';
import * as fs from 'fs';
import chalk from 'chalk';
import { spawn } from 'child_process';
import {
  Dubhe,
  NetworkType,
  SuiMoveNormalizedModules,
  loadMetadata,
  getDefaultConfig
} from '@0xobelisk/sui-client';
import { DubheCliError } from './errors';
import { Component, MoveType, DubheConfig } from '@0xobelisk/sui-common';

export type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  startCheckpoint: string;
  packageId: string;
  /** Object ID of the Dubhe framework's DappHub shared object. */
  dappHubId: string;
  /**
   * Published package ID of the Dubhe framework used by this deployment.
   * Populated for localnet (ephemeral deploy); undefined for testnet/mainnet
   * where the SDK already knows the well-known constant.
   */
  frameworkPackageId?: string;
  /**
   * Object ID of the DappStorage shared object created by genesis::run.
   * Required for calling migrate_to_vN during upgrades.
   */
  dappStorageId?: string;
  upgradeCap: string;
  version: number;
  resources: Record<string, Component | MoveType>;
  enums?: Record<string, string[]>;
};

export function validatePrivateKey(privateKey: string): false | string {
  if (privateKey.startsWith(SUI_PRIVATE_KEY_PREFIX)) {
    if (privateKey.length === 70) {
      return privateKey;
    } else {
      return false;
    }
  } else if (privateKey.startsWith('0x')) {
    const strippedPrivateKey = privateKey.slice(2);
    if (strippedPrivateKey.length === 64) {
      return strippedPrivateKey;
    } else {
      return false;
    }
  } else {
    if (privateKey.length === 64) {
      return privateKey;
    } else {
      return false;
    }
  }
}

export async function updateVersionInFile(projectPath: string, newVersion: string) {
  try {
    const filePath = `${projectPath}/sources/script/migrate.move`;
    const data = await fsAsync.readFile(filePath, 'utf8');

    // update version data
    const updatedData = data.replace(
      /const VERSION: u64 = \d+;/,
      `const VERSION: u64 = ${newVersion};`
    );

    // write new version
    writeOutput(updatedData, filePath, 'Update package version');
  } catch {
    throw new FsIibError('Fs update version failed.');
  }
}

export async function getDeploymentJson(
  projectPath: string,
  network: string
): Promise<DeploymentJsonType> {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/.history/sui_${network}/latest.json`,
      'utf8'
    );
    return JSON.parse(data) as DeploymentJsonType;
  } catch (error) {
    throw new Error(`read .history/sui_${network}/latest.json failed. ${error}`);
  }
}

export async function getDeploymentDappHubId(
  projectPath: string,
  network: string
): Promise<string> {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/.history/sui_${network}/latest.json`,
      'utf8'
    );
    const deployment = JSON.parse(data) as DeploymentJsonType;
    return deployment.dappHubId;
  } catch (_error) {
    return '';
  }
}

export async function getDubheDappHubId(network: string) {
  const path = process.cwd();
  const contractPath = `${path}/src/dubhe`;

  if (network === 'localnet') {
    return await getDeploymentDappHubId(contractPath, 'localnet');
  }

  const config = getDefaultConfig(network as NetworkType);
  if (!config.dappHubId) {
    throw new Error(
      `DappHub object ID is not configured for network "${network}". ` +
        `Update MAINNET_DUBHE_HUB_OBJECT_ID / TESTNET_DUBHE_HUB_OBJECT_ID in @0xobelisk/sui-client.`
    );
  }
  return config.dappHubId;
}

export async function getOriginalDubhePackageId(network: string) {
  const path = process.cwd();
  const contractPath = `${path}/src/dubhe`;

  if (network === 'localnet') {
    return await getOldPackageId(contractPath, network);
  }

  const config = getDefaultConfig(network as NetworkType);
  if (!config.frameworkPackageId) {
    throw new Error(
      `Framework package ID is not configured for network "${network}". ` +
        `Update MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID / TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID in @0xobelisk/sui-client.`
    );
  }
  return config.frameworkPackageId;
}
export async function getOnchainResources(
  projectPath: string,
  network: string
): Promise<Record<string, Component | MoveType>> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.resources;
}

export async function getVersion(projectPath: string, network: string): Promise<number> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.version;
}

export async function getNetwork(
  projectPath: string,
  network: string
): Promise<'mainnet' | 'testnet' | 'devnet' | 'localnet'> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.network;
}

export async function getOldPackageId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.packageId;
}

export async function getDappHubId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.dappHubId;
}

export async function getFrameworkPackageIdFromDeployment(
  projectPath: string,
  network: string
): Promise<string | undefined> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.frameworkPackageId;
}

export async function getDappStorageId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.dappStorageId ?? '';
}

export async function getUpgradeCap(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.upgradeCap;
}

export async function getStartCheckpoint(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.startCheckpoint;
}

export async function saveContractData(
  projectName: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  startCheckpoint: string,
  packageId: string,
  dappHubId: string,
  upgradeCap: string,
  version: number,
  resources: Record<string, Component | MoveType>,
  enums?: Record<string, string[]>,
  frameworkPackageId?: string,
  dappStorageId?: string
) {
  const DeploymentData: DeploymentJsonType = {
    projectName,
    network,
    startCheckpoint,
    packageId,
    dappHubId,
    frameworkPackageId,
    dappStorageId,
    upgradeCap,
    version,
    resources,
    enums
  };

  const path = process.cwd();
  const storeDeploymentData = JSON.stringify(DeploymentData, null, 2);
  await writeOutput(
    storeDeploymentData,
    `${path}/src/${projectName}/.history/sui_${network}/latest.json`,
    'Update deploy log'
  );
}

export async function saveMetadata(
  projectName: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId: string
) {
  const path = process.cwd();

  // Save metadata files
  try {
    const metadata = await loadMetadata(network, packageId);
    if (metadata) {
      const metadataJson = JSON.stringify(metadata, null, 2);

      // Save packageId-specific metadata file
      await writeOutput(
        metadataJson,
        `${path}/src/${projectName}/.history/sui_${network}/${packageId}.json`,
        'Save package metadata'
      );

      // Save latest metadata.json
      await writeOutput(metadataJson, `${path}/metadata.json`, 'Save latest metadata');
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Failed to save metadata: ${error}`));
  }
}

export async function writeOutput(
  output: string,
  fullOutputPath: string,
  logPrefix?: string
): Promise<void> {
  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, output);
  if (logPrefix !== undefined) {
    console.log(`${logPrefix}: ${fullOutputPath}`);
  }
}

export async function updateDubheDependency(
  filePath: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  // With the new --build-env mechanism, we keep Dubhe as local dependency for all networks.
  // The Published.toml in ../dubhe resolves the correct on-chain address per environment.
  // This function is kept for backward compatibility but is a no-op for non-localnet.
  if (network === 'localnet') {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const localDependency = 'Dubhe = { local = "../dubhe" }';
    if (!fileContent.includes(localDependency)) {
      const updatedContent = fileContent.replace(/Dubhe = \{[^}]*\}/, localDependency);
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`Ensured local Dubhe dependency in ${filePath} for localnet.`);
    }
  }
}

// Published.toml management for the new Sui CLI (v1.44+) publishing mechanism.
// Published.toml tracks on-chain package addresses per environment.
// It SHOULD be committed to source control.

interface PublishedEntry {
  chainId: string;
  publishedAt: string;
  originalId: string;
  version: number;
}

export function readPublishedToml(packagePath: string): Record<string, PublishedEntry> {
  const filePath = pathJoin(packagePath, 'Published.toml');
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, PublishedEntry> = {};

  const sectionRegex = /\[published\.(\w+)\]([\s\S]*?)(?=\[published\.|$)/g;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const env = match[1];
    const body = match[2];
    const getValue = (key: string) => {
      const m = body.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`));
      return m ? m[1] : '';
    };
    const versionMatch = body.match(/version\s*=\s*(\d+)/);
    result[env] = {
      chainId: getValue('chain-id'),
      publishedAt: getValue('published-at'),
      originalId: getValue('original-id'),
      version: versionMatch ? parseInt(versionMatch[1], 10) : 1
    };
  }
  return result;
}

export function writePublishedToml(
  packagePath: string,
  entries: Record<string, PublishedEntry>
): void {
  const filePath = pathJoin(packagePath, 'Published.toml');
  let content =
    '# Generated by Move\n' +
    '# This file contains metadata about published versions of this package in different environments\n' +
    '# This file SHOULD be committed to source control\n';

  for (const [env, entry] of Object.entries(entries)) {
    content += `\n[published.${env}]\n`;
    content += `chain-id = "${entry.chainId}"\n`;
    content += `published-at = "${entry.publishedAt}"\n`;
    content += `original-id = "${entry.originalId}"\n`;
    content += `version = ${entry.version}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

export function updatePublishedToml(
  packagePath: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  chainId: string,
  packageId: string,
  originalId?: string,
  version?: number
): void {
  const entries = readPublishedToml(packagePath);
  const existing = entries[network];

  entries[network] = {
    chainId,
    publishedAt: packageId,
    originalId: originalId ?? existing?.originalId ?? packageId,
    version: version ?? (existing ? existing.version + 1 : 1)
  };

  writePublishedToml(packagePath, entries);
  console.log(`Updated Published.toml in ${packagePath} for ${network}.`);
}

export function getPublishedTomlEntry(
  packagePath: string,
  network: string
): PublishedEntry | undefined {
  const entries = readPublishedToml(packagePath);
  return entries[network];
}

export function clearPublishedTomlEntry(
  packagePath: string,
  network: string
): PublishedEntry | undefined {
  const entries = readPublishedToml(packagePath);
  const existing = entries[network];
  if (!existing) return undefined;

  entries[network] = {
    ...existing,
    publishedAt: '0x0000000000000000000000000000000000000000000000000000000000000000',
    originalId: '0x0000000000000000000000000000000000000000000000000000000000000000'
  };
  writePublishedToml(packagePath, entries);
  return existing;
}

export function restorePublishedTomlEntry(
  packagePath: string,
  network: string,
  entry: PublishedEntry
): void {
  const entries = readPublishedToml(packagePath);
  entries[network] = entry;
  writePublishedToml(packagePath, entries);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral publication file (Pub.<env>.toml)
//
// Per the Sui package management docs (v1.63+), localnet / devnet deployments
// should use ephemeral publication files rather than the shared Published.toml.
// The ephemeral file holds the localnet addresses so that subsequent builds
// (e.g. for upgrades) can resolve local dependencies correctly.
//
// Reference: https://docs.sui.io/guides/developer/packages/move-package-management
// ─────────────────────────────────────────────────────────────────────────────

export interface EphemeralPubEntry {
  /** Absolute path to the package source directory */
  source: string;
  /** Current on-chain address of the package */
  publishedAt: string;
  /** Address of the first published version (same as publishedAt for v1) */
  originalId: string;
  /** Object ID of the upgrade capability */
  upgradeCap: string;
  /** Package version (required by Sui CLI parser) */
  version?: number;
}

/**
 * Return the canonical path for the ephemeral publication file.
 * For localnet this is <contractsDir>/Pub.localnet.toml.
 */
export function getEphemeralPubFilePath(contractsDir: string, network: string): string {
  return pathJoin(contractsDir, `Pub.${network}.toml`);
}

/**
 * Update (or create) an entry in the ephemeral publication file.
 * Preserves existing entries for other packages.
 */
export function updateEphemeralPubFile(
  pubfilePath: string,
  chainId: string,
  buildEnv: string,
  entry: EphemeralPubEntry
): void {
  const existing: EphemeralPubEntry[] = [];
  // Always use the provided buildEnv and chainId parameters.
  // The chainId passed in comes from the live network and is authoritative.
  const currentBuildEnv = buildEnv;
  const currentChainId = chainId;

  if (fs.existsSync(pubfilePath)) {
    const content = fs.readFileSync(pubfilePath, 'utf-8');

    // Check if the file was written for a different chain (e.g. previous localnet run).
    // If chain-id changed, discard all existing entries — they belong to a dead chain.
    const chainIdMatch = content.match(/^chain-id\s*=\s*"([^"]*)"/m);
    const fileChainId = chainIdMatch ? chainIdMatch[1] : '';
    const chainChanged = fileChainId !== '' && fileChainId !== chainId;

    if (!chainChanged) {
      // Same chain: parse existing [[published]] blocks and preserve them.
      // source field is an inline table: source = { local = "..." }
      const blockRegex = /\[\[published\]\]([\s\S]*?)(?=\[\[published\]\]|$)/g;
      let blockMatch;
      while ((blockMatch = blockRegex.exec(content)) !== null) {
        const block = blockMatch[1];
        const get = (key: string) => {
          const m = block.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
          return m ? m[1] : '';
        };
        // source = { local = "/path/to/package" }
        const srcMatch = block.match(/^source\s*=\s*\{\s*local\s*=\s*"([^"]*)"\s*\}/m);
        const src = srcMatch ? srcMatch[1] : '';
        if (src) {
          existing.push({
            source: src,
            publishedAt: get('published-at'),
            originalId: get('original-id'),
            upgradeCap: get('upgrade-cap')
          });
        }
      }
    } else {
      console.log(`  Pub file chain-id changed (${fileChainId} → ${chainId}), resetting entries.`);
    }
  }

  // Update override or add the entry
  const idx = existing.findIndex((e) => e.source === entry.source);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }

  // Write the file
  let content =
    '# generated by dubhe cli\n' +
    '# this file contains metadata from ephemeral publications\n' +
    '# this file should NOT be committed to source control\n\n';
  content += `build-env = "${currentBuildEnv}"\n`;
  content += `chain-id = "${currentChainId}"\n`;

  for (const e of existing) {
    content += '\n[[published]]\n';
    // source must be a LocalDepInfo struct (not a plain string)
    content += `source = { local = "${e.source}" }\n`;
    content += `published-at = "${e.publishedAt}"\n`;
    content += `original-id = "${e.originalId}"\n`;
    content += `upgrade-cap = "${e.upgradeCap}"\n`;
    // version is required by Sui CLI parser (even though docs omit it)
    content += `version = 1\n`;
  }

  fs.writeFileSync(pubfilePath, content, 'utf-8');
  console.log(
    `  Updated ${pathJoin(pubfilePath.split('/').slice(-1)[0])} for ${
      entry.source.split('/').slice(-1)[0]
    }.`
  );
}

async function checkRpcAvailability(rpcUrl: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getLatestCheckpointSequenceNumber',
        params: []
      })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return !data.error;
  } catch (_error) {
    return false;
  }
}

export async function addEnv(
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
): Promise<void> {
  const rpcMap = {
    localnet: 'http://127.0.0.1:9000',
    devnet: 'https://fullnode.devnet.sui.io:443/',
    testnet: 'https://fullnode.testnet.sui.io:443/',
    mainnet: 'https://fullnode.mainnet.sui.io:443/'
  };

  const rpcUrl = rpcMap[network];

  // Check RPC availability first
  const isRpcAvailable = await checkRpcAvailability(rpcUrl);
  if (!isRpcAvailable) {
    throw new Error(
      `RPC endpoint ${rpcUrl} is not available. Please check your network connection or try again later.`
    );
  }

  return new Promise<void>((resolve, reject) => {
    let errorOutput = '';
    let stdoutOutput = '';

    const suiProcess = spawn(
      'sui',
      ['client', 'new-env', '--alias', network, '--rpc', rpcMap[network]],
      {
        env: { ...process.env },
        stdio: 'pipe'
      }
    );

    // Capture standard output
    suiProcess.stdout.on('data', (data) => {
      stdoutOutput += data.toString();
    });

    // Capture error output
    suiProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process errors (e.g., command not found)
    suiProcess.on('error', (error) => {
      console.error(chalk.red(`\n❌ Failed to execute sui command: ${error.message}`));
      reject(new Error(`Failed to execute sui command: ${error.message}`));
    });

    // Handle process exit
    suiProcess.on('exit', (code, signal) => {
      // Check if "already exists" message is present
      if (errorOutput.includes('already exists') || stdoutOutput.includes('already exists')) {
        console.log(chalk.yellow(`Environment ${network} already exists, proceeding...`));
        resolve();
        return;
      }

      if (code === 0) {
        console.log(chalk.green(`Successfully added environment ${network}`));
        resolve();
      } else {
        let finalError: string;
        if (code === null) {
          // Process was killed by a signal
          finalError =
            errorOutput ||
            stdoutOutput ||
            `Process was terminated by signal ${signal || 'unknown'}`;
        } else {
          finalError = errorOutput || stdoutOutput || `Process exited with code ${code}`;
        }
        console.error(chalk.red(`\n❌ Failed to add environment ${network}`));
        console.error(chalk.red(`  └─ ${finalError.trim()}`));
        reject(new Error(finalError));
      }
    });
  });
}

export type NetworkAlias = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export interface Endpoint {
  alias: NetworkAlias;
  rpc: string;
  ws: string | null;
  basic_auth: { username: string; password: string } | null;
}

// mainly is a tuple of [endpoint list, current active alias]
export type ConfigTuple = [Endpoint[], NetworkAlias];

export async function envsJSON(): Promise<ConfigTuple> {
  try {
    return new Promise<ConfigTuple>((resolve, reject) => {
      let errorOutput = '';
      let stdoutOutput = '';

      const suiProcess = spawn('sui', ['client', 'envs', '--json'], {
        env: { ...process.env },
        stdio: 'pipe'
      });

      suiProcess.stdout.on('data', (data) => {
        stdoutOutput += data.toString();
      });

      suiProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      suiProcess.on('error', (error) => {
        console.error(chalk.red(`\n❌ Failed to execute sui command: ${error.message}`));
        reject(new Error(`Failed to execute sui command: ${error.message}`));
      });

      suiProcess.on('exit', (code, signal) => {
        if (code === 0) {
          resolve(JSON.parse(stdoutOutput) as ConfigTuple);
        } else {
          let finalError: string;
          if (code === null) {
            // Process was killed by a signal
            finalError =
              errorOutput ||
              stdoutOutput ||
              `Process was terminated by signal ${signal || 'unknown'}`;
          } else {
            finalError = errorOutput || stdoutOutput || `Process exited with code ${code}`;
          }
          console.error(chalk.red(`\n❌ Failed to get envs`));
          console.error(chalk.red(`  └─ ${finalError.trim()}`));
          reject(new Error(finalError));
        }
      });
    });
  } catch (error) {
    // Re-throw the error for the caller to handle
    throw error;
  }
}

export async function getDefaultNetwork(): Promise<NetworkAlias> {
  const [_, currentAlias] = await envsJSON();
  return currentAlias as NetworkAlias;
}

export async function switchEnv(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
  try {
    // First, try to add the environment
    await addEnv(network);

    // Then switch to the specified environment
    return new Promise<void>((resolve, reject) => {
      let errorOutput = '';
      let stdoutOutput = '';

      const suiProcess = spawn('sui', ['client', 'switch', '--env', network], {
        env: { ...process.env },
        stdio: 'pipe'
      });

      suiProcess.stdout.on('data', (data) => {
        stdoutOutput += data.toString();
      });

      suiProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      suiProcess.on('error', (error) => {
        console.error(chalk.red(`\n❌ Failed to execute sui command: ${error.message}`));
        reject(new Error(`Failed to execute sui command: ${error.message}`));
      });

      suiProcess.on('exit', (code, signal) => {
        if (code === 0) {
          console.log(chalk.green(`Successfully switched to environment ${network}`));
          resolve();
        } else {
          let finalError: string;
          if (code === null) {
            // Process was killed by a signal
            finalError =
              errorOutput ||
              stdoutOutput ||
              `Process was terminated by signal ${signal || 'unknown'}`;
          } else {
            finalError = errorOutput || stdoutOutput || `Process exited with code ${code}`;
          }
          console.error(chalk.red(`\n❌ Failed to switch to environment ${network}`));
          console.error(chalk.red(`  └─ ${finalError.trim()}`));
          reject(new Error(finalError));
        }
      });
    });
  } catch (error) {
    // Re-throw the error for the caller to handle
    throw error;
  }
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function loadKey(): string {
  const privateKey = process.env.PRIVATE_KEY || process.env.NEXT_PUBLIC_PRIVATE_KEY;
  if (!privateKey) {
    throw new DubheCliError(
      `Missing private key environment variable.
  Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
  or 'echo "NEXT_PUBLIC_PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
  in your contracts directory to use the default sui private key.`
    );
  }
  const privateKeyFormat = validatePrivateKey(privateKey);
  if (privateKeyFormat === false) {
    throw new DubheCliError(`Please check your privateKey.`);
  }
  return privateKeyFormat;
}

export function initializeDubhe({
  network,
  packageId,
  metadata
}: {
  network: NetworkType;
  packageId?: string;
  metadata?: SuiMoveNormalizedModules;
}): Dubhe {
  const privateKey = loadKey();
  return new Dubhe({
    networkType: network,
    secretKey: privateKey,
    packageId,
    metadata
  });
}

export function generateConfigJson(config: DubheConfig): string {
  const resources = Object.entries(config.resources ?? {}).map(([name, resource]) => {
    // Simple type shorthand (e.g., counter1: 'u32') – entity-keyed by account (entity_id: String).
    if (typeof resource === 'string') {
      return {
        [name]: {
          fields: [{ entity_id: 'String' }, { value: resource }],
          keys: ['entity_id'],
          offchain: false
        }
      };
    }

    // Empty resource object – only the implicit entity key.
    if (Object.keys(resource as object).length === 0) {
      return {
        [name]: {
          fields: [{ entity_id: 'String' }],
          keys: ['entity_id'],
          offchain: false
        }
      };
    }

    const fields = (resource as any).fields || {};
    const keys = (resource as any).keys || [];
    const offchain = (resource as any).offchain ?? false;

    // Full Component format with no explicit keys: auto-inject 'entity_id: String'.
    if (keys.length === 0) {
      const fieldEntries = Object.entries(fields);
      const orderedFields: [string, unknown][] = [['entity_id', 'String'], ...fieldEntries];
      return {
        [name]: {
          fields: orderedFields.map(([fieldName, fieldType]) => ({
            [fieldName]: fieldType
          })),
          keys: ['entity_id'],
          offchain: offchain
        }
      };
    }

    // Full Component format with explicit custom keys: inject 'entity_id: String' as the first
    // field and first key so that key_tuple[0] (the BCS-encoded account injected by the indexer)
    // maps correctly, followed by the user-defined keys.
    const fieldEntries = Object.entries(fields);
    const orderedFields: [string, unknown][] = [['entity_id', 'String'], ...fieldEntries];
    return {
      [name]: {
        fields: orderedFields.map(([fieldName, fieldType]) => ({
          [fieldName]: fieldType
        })),
        keys: ['entity_id', ...keys],
        offchain: offchain
      }
    };
  });

  // Auto-append Dubhe framework fee state resource (entity-keyed by account string).
  if (!resources.some((resource) => 'dapp_fee_state' in resource)) {
    resources.push({
      dapp_fee_state: {
        fields: [
          { entity_id: 'String' },
          { base_fee: 'u256' },
          { bytes_fee: 'u256' },
          { free_credit: 'u256' },
          { credit_pool: 'u256' },
          { total_settled: 'u256' },
          { suspended: 'bool' }
        ],
        keys: ['entity_id'],
        offchain: false
      }
    });
  }

  // handle enums
  const enums = Object.entries(config.enums || {}).map(([name, enumFields]) => {
    // Sort enum values by first letter
    const sortedFields = enumFields.sort((a, b) => a.localeCompare(b)).map((value) => value);

    return {
      [name]: sortedFields
    };
  });

  return JSON.stringify(
    {
      resources,
      enums
    },
    null,
    2
  );
}

/**
 * Updates the dubhe address and published-at in Move.toml file
 * @param path - Directory path containing Move.toml file
 * @param packageAddress - New dubhe package address to set
 *
 * Logic:
 * - If packageAddress is "0x0": only set dubhe = "0x0", remove published-at line
 * - Otherwise: set both dubhe and published-at to packageAddress
 */
export function updateMoveTomlAddress(path: string, packageAddress: string) {
  const moveTomlPath = `${path}/Move.toml`;
  const moveTomlContent = fs.readFileSync(moveTomlPath, 'utf-8');

  let updatedContent = moveTomlContent;

  if (packageAddress === '0x0') {
    // Case 1: Address is "0x0" - set dubhe to "0x0" and remove published-at line
    updatedContent = updatedContent.replace(/dubhe\s*=\s*"[^"]*"/, `dubhe = "0x0"`);

    // Remove published-at line (including the line break)
    updatedContent = updatedContent.replace(/published-at\s*=\s*"[^"]*"\r?\n?/, '');
  } else {
    // Case 2: Address is not "0x0" - set both dubhe and published-at
    updatedContent = updatedContent.replace(/dubhe\s*=\s*"[^"]*"/, `dubhe = "${packageAddress}"`);

    // Check if published-at already exists
    if (/published-at\s*=\s*"[^"]*"/.test(updatedContent)) {
      // Replace existing published-at
      updatedContent = updatedContent.replace(
        /published-at\s*=\s*"[^"]*"/,
        `published-at = "${packageAddress}"`
      );
    } else {
      // Add published-at after [package] line if it doesn't exist
      updatedContent = updatedContent.replace(
        /(\[package\][^\n]*\n)/,
        `$1published-at = "${packageAddress}"\n`
      );
    }
  }

  fs.writeFileSync(moveTomlPath, updatedContent, 'utf-8');
}

export function updateGenesisUpgradeFunction(path: string, tables: string[]) {
  const genesisPath = `${path}/sources/codegen/genesis.move`;
  const genesisContent = fs.readFileSync(genesisPath, 'utf-8');

  // Match the first pair of // ========================================== lines (with any content, including empty, between them)
  const separatorRegex =
    /(\/\/ ==========================================)[\s\S]*?(\/\/ ==========================================)/;
  const match = genesisContent.match(separatorRegex);

  if (!match) {
    throw new Error('Could not find separator comments in genesis.move');
  }

  // Generate new table registration code
  const registerTablesCode = tables
    .map((table) => `    ${table}::register_table(dapp_hub, ctx);`)
    .join('\n');

  // Build new content, preserve separators, replace middle content
  const newContent = `${match[1]}\n${registerTablesCode}\n${match[2]}`;

  // Replace matched content
  const updatedContent = genesisContent.replace(separatorRegex, newContent);

  fs.writeFileSync(genesisPath, updatedContent, 'utf-8');
}

/**
 * Appends a `migrate_to_vN` entry function to the package's migrate.move and
 * bumps `ON_CHAIN_VERSION` to `newVersion`.
 *
 * Called by upgradeHandler when new resources are detected (pendingMigration.length > 0).
 * The generated function:
 *   1. Reads the new package ID via `dapp_key::package_id()` — available on the new package.
 *   2. Reads the target version via `migrate::on_chain_version()` — equals newVersion after
 *      this function bumps the constant.
 *   3. Calls `dapp_system::upgrade_dapp` to register the new package ID and bump
 *      `DappStorage.version`.
 *   4. Calls `genesis::migrate` for any custom migration logic (extension point).
 *
 * `upgrade_dapp` accepts the new package's DappKey because its check was changed to compare
 * the caller's package ID against the registered list OR the incoming new_package_id, rather
 * than doing a full type-string comparison that would always fail after an upgrade.
 */
export function appendMigrateFunction(
  projectPath: string,
  packageName: string,
  newVersion: number
): void {
  const migratePath = `${projectPath}/sources/scripts/migrate.move`;
  if (!fs.existsSync(migratePath)) {
    throw new Error(`migrate.move not found at ${migratePath}`);
  }

  let content = fs.readFileSync(migratePath, 'utf-8');

  // Idempotency: skip entirely if the function already exists
  if (content.includes(`migrate_to_v${newVersion}`)) {
    return;
  }

  // ── Step 1: bump ON_CHAIN_VERSION to newVersion ──────────────────────────────
  // Replace the first `ON_CHAIN_VERSION: u32 = <N>` constant in the file.
  // This ensures on_chain_version() returns the correct value when upgrade_dapp
  // reads it inside the generated migrate_to_vN function.
  content = content.replace(
    /const ON_CHAIN_VERSION:\s*u32\s*=\s*\d+\s*;/,
    `const ON_CHAIN_VERSION: u32 = ${newVersion};`
  );

  // ── Step 2: append migrate_to_vN ─────────────────────────────────────────────
  // new_package_id must be passed as a parameter because type_name::get<T>() in
  // Sui Move always returns the ORIGINAL (genesis) package ID, not the upgraded one.
  // The TypeScript upgradeHandler supplies the actual new package ID after the upgrade
  // transaction completes and the on-chain package address is known.
  const migrateFunction = `
    public entry fun migrate_to_v${newVersion}(
        dapp_hub: &mut dubhe::dapp_service::DappHub,
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        new_package_id: address,
        ctx: &mut TxContext
    ) {
        let new_version = ${packageName}::migrate::on_chain_version();
        dubhe::dapp_system::upgrade_dapp<${packageName}::dapp_key::DappKey>(
            dapp_hub, dapp_storage, new_package_id, new_version, ctx
        );
        ${packageName}::genesis::migrate(dapp_hub, dapp_storage, ctx);
    }
`;

  // Insert the new function before the closing brace of the module
  const closingBraceIdx = content.lastIndexOf('}');
  if (closingBraceIdx === -1) {
    throw new Error(`Could not find closing brace in ${migratePath}`);
  }

  const updated =
    content.slice(0, closingBraceIdx) + migrateFunction + content.slice(closingBraceIdx);
  fs.writeFileSync(migratePath, updated, 'utf-8');
}

// ---------------------------------------------------------------------------
// Guard lint
// ---------------------------------------------------------------------------

export type MissingGuardResult = {
  /** Relative path to the Move source file (for display). */
  file: string;
  /** Name of the entry function missing the guard. */
  fn: string;
};

/**
 * Scans every `*.move` file under `<projectPath>/sources/systems/` and returns
 * the list of `public entry fun` declarations that:
 *   1. Accept a `DappStorage` parameter (so a version check is applicable), AND
 *   2. Do NOT call `ensure_latest_version` anywhere in their body.
 *
 * The implementation uses brace-balancing to extract each function body rather
 * than a full AST parse, which is sufficient for this structural check.
 */
export function lintSystemGuards(projectPath: string): MissingGuardResult[] {
  const systemsDir = pathJoin(projectPath, 'sources', 'systems');
  if (!fs.existsSync(systemsDir)) return [];

  const results: MissingGuardResult[] = [];
  const files = fs.readdirSync(systemsDir).filter((f) => f.endsWith('.move'));

  for (const file of files) {
    const fullPath = pathJoin(systemsDir, file);
    const src = fs.readFileSync(fullPath, 'utf-8');

    // Find every `public entry fun <name>` position.
    const entryFunRe = /public\s+entry\s+fun\s+(\w+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = entryFunRe.exec(src)) !== null) {
      const fnName = match[1];
      const parenStart = match.index + match[0].length - 1; // position of '('

      // Extract the parameter list (between the outermost parentheses).
      let depth = 0;
      let parenEnd = parenStart;
      for (let i = parenStart; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
          depth--;
          if (depth === 0) {
            parenEnd = i;
            break;
          }
        }
      }
      const paramList = src.slice(parenStart + 1, parenEnd);

      // Only flag functions that receive a DappStorage parameter.
      if (!/DappStorage/.test(paramList)) continue;

      // Extract the function body (between the outermost braces after the params).
      const braceStart = src.indexOf('{', parenEnd);
      if (braceStart === -1) continue;

      depth = 0;
      let braceEnd = braceStart;
      for (let i = braceStart; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) {
            braceEnd = i;
            break;
          }
        }
      }
      const body = src.slice(braceStart, braceEnd + 1);

      if (!/ensure_latest_version/.test(body)) {
        results.push({ file, fn: fnName });
      }
    }
  }

  return results;
}

/**
 * Formats lint results as a human-readable warning block.
 * Returns an empty string when there are no issues.
 */
export function formatLintWarnings(results: MissingGuardResult[]): string {
  if (results.length === 0) return '';
  const lines: string[] = [
    chalk.yellow('⚠️  Missing ensure_latest_version in the following entry functions:'),
    chalk.yellow('   Old-package callers can still invoke these functions after an upgrade.'),
    ''
  ];
  for (const r of results) {
    lines.push(chalk.yellow(`   • ${r.file}  →  ${r.fn}()`));
  }
  lines.push('');
  lines.push(
    chalk.yellow(
      '   Fix: add  dubhe::dapp_system::ensure_latest_version(dapp_storage);  at the top of each function.'
    )
  );
  lines.push('');
  return lines.join('\n');
}

/**
 * Prompts the user for a yes/no confirmation on stdout/stdin.
 * Resolves `true` for "y/Y", `false` for everything else.
 */
export function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(chalk.yellow(`${question} [y/N] `), (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
