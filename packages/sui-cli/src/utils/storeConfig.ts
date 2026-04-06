import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DubheConfig } from '@0xobelisk/sui-common';
import { getDeploymentJson, getDubheDappHub, getOriginalDubhePackageId } from './utils';

async function storeConfig(
  network: string,
  packageId: string,
  dappStorageId: string,
  outputPath: string
) {
  const dubheDappHub = await getDubheDappHub(network);

  // Mirror getDubheDappHub: for localnet the framework is deployed ephemerally so we
  // read its package ID from src/dubhe/.history/sui_localnet/latest.json (same source
  // as DUBHE_SCHEMA_ID above).  For testnet/mainnet the SDK resolves the framework
  // address automatically via getDefaultConfig(), so we emit undefined.
  let frameworkPackageId: string | undefined;
  if (network === 'localnet') {
    frameworkPackageId = await getOriginalDubhePackageId(network);
  }

  const frameworkIdLine =
    frameworkPackageId !== undefined
      ? `\n// Published package ID of the dubhe framework — required for proxy operations.\nexport const FRAMEWORK_PACKAGE_ID: string | undefined = '${frameworkPackageId}';\n`
      : `\n// Published package ID of the dubhe framework — required for proxy operations.\n// For testnet/mainnet the SDK resolves this automatically via getDefaultConfig().\nexport const FRAMEWORK_PACKAGE_ID: string | undefined = undefined;\n`;

  const code = `type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export const NETWORK: NetworkType = '${network}';
export const PACKAGE_ID = '${packageId}';
export const DUBHE_SCHEMA_ID = '${dubheDappHub}';
export const DAPP_STORAGE_ID = '${dappStorageId}';
${frameworkIdLine}`;

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
  await storeConfig(
    deployment.network,
    deployment.packageId,
    deployment.dappStorageId ?? '',
    outputPath
  );
}
