import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { SUI_PRIVATE_KEY_PREFIX } from '@mysten/sui/cryptography';
import { FsIibError } from './errors';
import * as fs from 'fs';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { Dubhe, NetworkType, SuiMoveNormalizedModules, loadMetadata } from '@0xobelisk/sui-client';
import { DubheCliError } from './errors';
import packageJson from '../../package.json';
import { Component, MoveType, EmptyComponent, DubheConfig } from '@0xobelisk/sui-common';

export type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  startCheckpoint: string;
  packageId: string;
  dappHub: string;
  upgradeCap: string;
  version: number;
  components: Record<string, Component | MoveType | EmptyComponent>;
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

export async function getDeploymentDappHub(projectPath: string, network: string): Promise<string> {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/.history/sui_${network}/latest.json`,
      'utf8'
    );
    const deployment = JSON.parse(data) as DeploymentJsonType;
    return deployment.dappHub;
  } catch (error) {
    return '';
  }
}

export async function getDubheDappHub(network: string) {
  const path = process.cwd();
  const contractPath = `${path}/src/dubhe`;

  switch (network) {
    case 'mainnet':
      return await getDeploymentDappHub(contractPath, 'mainnet');
    case 'testnet':
      return await getDeploymentDappHub(contractPath, 'testnet');
    case 'devnet':
      return await getDeploymentDappHub(contractPath, 'devnet');
    case 'localnet':
      return await getDeploymentDappHub(contractPath, 'localnet');
    default:
      throw new Error(`Invalid network: ${network}`);
  }
}

export async function getOnchainComponents(
  projectPath: string,
  network: string
): Promise<Record<string, Component | MoveType | EmptyComponent>> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.components;
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

export async function getDappHub(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.dappHub;
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
  dappHub: string,
  upgradeCap: string,
  version: number,
  components: Record<string, Component | MoveType | EmptyComponent>,
  resources: Record<string, Component | MoveType>,
  enums?: Record<string, string[]>
) {
  const DeploymentData: DeploymentJsonType = {
    projectName,
    network,
    startCheckpoint,
    packageId,
    dappHub,
    upgradeCap,
    version,
    components,
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

function getDubheDependency(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'): string {
  switch (network) {
    case 'localnet':
      return 'Dubhe = { local = "../dubhe" }';
    case 'testnet':
      return `Dubhe = { git = "https://github.com/0xobelisk/dubhe.git", subdir = "packages/sui-framework/src/dubhe", rev = "v${packageJson.version}" }`;
    case 'mainnet':
      return `Dubhe = { git = "https://github.com/0xobelisk/dubhe.git", subdir = "packages/sui-framework/src/dubhe", rev = "v${packageJson.version}" }`;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

export async function updateDubheDependency(
  filePath: string,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const newDependency = getDubheDependency(network);
  const updatedContent = fileContent.replace(/Dubhe = \{.*\}/, newDependency);
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
  console.log(`Updated Dubhe dependency in ${filePath} for ${network}.`);
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
  } catch (error) {
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
    suiProcess.on('exit', (code) => {
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
        const finalError = errorOutput || stdoutOutput || `Process exited with code ${code}`;
        console.error(chalk.red(`\n❌ Failed to add environment ${network}`));
        console.error(chalk.red(`  └─ ${finalError.trim()}`));
        reject(new Error(finalError));
      }
    });
  });
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

      suiProcess.on('exit', (code) => {
        if (code === 0) {
          console.log(chalk.green(`Successfully switched to environment ${network}`));
          resolve();
        } else {
          const finalError = errorOutput || stdoutOutput || `Process exited with code ${code}`;
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
  const components = Object.entries(config.components).map(([name, component]) => {
    if (typeof component === 'string') {
      return {
        [name]: {
          fields: [{ entity_id: 'address' }, { value: component }],
          keys: ['entity_id'],
          offchain: false
        }
      };
    }

    if (Object.keys(component as object).length === 0) {
      return {
        [name]: {
          fields: [{ entity_id: 'address' }],
          keys: ['entity_id'],
          offchain: false
        }
      };
    }

    const fields = (component as any).fields || {};
    const keys = (component as any).keys || ['entity_id'];
    const offchain = (component as any).offchain ?? false;

    // ensure entity_id field exists
    if (!fields.entity_id && keys.includes('entity_id')) {
      fields.entity_id = 'address';
    }

    return {
      [name]: {
        fields: Object.entries(fields).map(([fieldName, fieldType]) => ({
          [fieldName]: fieldType
        })),
        keys: keys,
        offchain: offchain
      }
    };
  });

  const resources = Object.entries(config.resources).map(([name, resource]) => {
    if (typeof resource === 'string') {
      return {
        [name]: {
          fields: [{ value: resource }],
          keys: [],
          offchain: false
        }
      };
    }

    if (Object.keys(resource as object).length === 0) {
      return {
        [name]: {
          fields: [],
          keys: [],
          offchain: false
        }
      };
    }

    const fields = (resource as any).fields || {};
    const keys = (resource as any).keys || [];
    const offchain = (resource as any).offchain ?? false;

    return {
      [name]: {
        fields: Object.entries(fields).map(([fieldName, fieldType]) => ({
          [fieldName]: fieldType
        })),
        keys: keys,
        offchain: offchain
      }
    };
  });

  // handle enums
  const enums = Object.entries(config.enums || {}).map(([name, enumFields]) => {
    // Sort enum values by first letter
    let sortedFields = enumFields
      .sort((a, b) => a.localeCompare(b))
      .map((value, index) => ({
        [index]: value
      }));

    return {
      [name]: sortedFields
    };
  });

  return JSON.stringify(
    {
      components,
      resources,
      enums
    },
    null,
    2
  );
}

/**
 * Updates the dubhe address in Move.toml file
 * @param path - Directory path containing Move.toml file
 * @param packageAddress - New dubhe package address to set
 */
export function updateMoveTomlAddress(path: string, packageAddress: string) {
  const moveTomlPath = `${path}/Move.toml`;
  const moveTomlContent = fs.readFileSync(moveTomlPath, 'utf-8');
  // Use regex to match any dubhe address, not just "0x0"
  const updatedContent = moveTomlContent.replace(
    /dubhe\s*=\s*"[^"]*"/,
    `dubhe = "${packageAddress}"`
  );
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
    .map((table) => `    ${table}::register_table(dapp_hub, _ctx);`)
    .join('\n');

  // Build new content, preserve separators, replace middle content
  const newContent = `${match[1]}\n${registerTablesCode}\n${match[2]}`;

  // Replace matched content
  const updatedContent = genesisContent.replace(separatorRegex, newContent);

  fs.writeFileSync(genesisPath, updatedContent, 'utf-8');
}
