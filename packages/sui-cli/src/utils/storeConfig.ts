import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DubheConfig } from '@0xobelisk/sui-common';
import { getDeploymentJson, getDubheDappHubId, getOriginalDubhePackageId } from './utils';

/** Derive the stable dapp_key type string from the original (genesis) package ID.
 *  Matches the Move-side `type_name::with_defining_ids<DappKey>().into_string()` output:
 *  "<hex64>::dapp_key::DappKey"  (no "0x" prefix, address zero-padded to 64 hex chars).
 */
function buildDappKey(originalPackageId: string): string {
  const hex = originalPackageId.replace(/^0x/i, '').padStart(64, '0');
  return `${hex}::dapp_key::DappKey`;
}

async function storeConfig(
  network: string,
  packageId: string,
  originalPackageId: string,
  dappStorageId: string,
  outputPath: string
) {
  const dappHubId = await getDubheDappHubId(network);

  // Mirror getDubheDappHubId: for localnet the framework is deployed ephemerally so we
  // read its package ID from src/dubhe/.history/sui_localnet/latest.json.
  // For testnet/mainnet the hardcoded ID from @0xobelisk/sui-client defaultConfig is used.
  // devnet has no fixed framework deployment, so frameworkPackageId stays undefined.
  let frameworkPackageId: string | undefined;
  if (network !== 'devnet') {
    frameworkPackageId = await getOriginalDubhePackageId(network);
  }

  const frameworkIdLine =
    frameworkPackageId !== undefined
      ? `\n// Published package ID of the dubhe framework — required for proxy operations.\nexport const FrameworkPackageId: string | undefined = '${frameworkPackageId}';\n`
      : `\n// Published package ID of the dubhe framework — required for proxy operations.\n// Not available for devnet (no fixed framework deployment).\nexport const FrameworkPackageId: string | undefined = undefined;\n`;

  const dappKey = buildDappKey(originalPackageId);

  const code = `type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export const Network: NetworkType = '${network}';
export const PackageId = '${packageId}';
/** The first-published (original) package ID — stable across upgrades. Used for dapp_key and indexer filtering. */
export const OriginalPackageId = '${originalPackageId}';
/** Canonical dapp_key type string derived from OriginalPackageId. Pass to the Dubhe SDK and GraphQL queries. */
export const DappKey = '${dappKey}';
export const DappHubId = '${dappHubId}';
export const DappStorageId = '${dappStorageId}';
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
  // Prefer the persisted originalPackageId; fall back to packageId for old deployments
  // that were created before this field was introduced.
  const originalPackageId = deployment.originalPackageId ?? deployment.packageId;
  await storeConfig(
    deployment.network,
    deployment.packageId,
    originalPackageId,
    deployment.dappStorageId ?? '',
    outputPath
  );
}
