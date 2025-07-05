import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DubheConfig } from '@0xobelisk/sui-common';
import { getDeploymentJson, getDubheDappHub } from './utils';

async function storeConfig(network: string, packageId: string, outputPath: string) {
  const dubheDappHub = await getDubheDappHub(network);
  let code = `type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export const NETWORK: NetworkType = '${network}';
export const PACKAGE_ID = '${packageId}';
export const DUBHE_SCHEMA_ID = '${dubheDappHub}';
`;

  writeOutput(code, outputPath, 'storeConfig');
}

async function writeOutput(
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

export async function storeConfigHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  outputPath: string
) {
  const path = process.cwd();
  const contractPath = `${path}/src/${dubheConfig.name}`;
  const deployment = await getDeploymentJson(contractPath, network);
  await storeConfig(deployment.network, deployment.packageId, outputPath);
}
