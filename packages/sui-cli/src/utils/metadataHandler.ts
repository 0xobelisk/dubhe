import { DubheConfig } from '@0xobelisk/sui-common';
import { getOldPackageId, saveMetadata } from './utils';

export async function loadMetadataHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId?: string
) {
  if (packageId) {
    await saveMetadata(dubheConfig.name, network, packageId);
  } else {
    const projectPath = `${process.cwd()}/src/${dubheConfig.name}`;
    const packageId = await getOldPackageId(projectPath, network);
    await saveMetadata(dubheConfig.name, network, packageId);
  }
}
