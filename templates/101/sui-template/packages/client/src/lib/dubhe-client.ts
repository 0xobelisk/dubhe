import { NETWORK, PACKAGE_ID, DUBHE_SCHEMA_ID } from 'contracts/deployment';
import metadata from 'contracts/metadata.json';
import { Dubhe, NetworkType, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';

export type DubheClient = {
  contract: Dubhe;
  metadata: SuiMoveNormalizedModules;
  networkType: NetworkType;
  packageId: string;
  dubheSchemaId: string;
  address: string;
};

export function createDubheClient({
  networkType,
  packageId,
  metadata,
  secretKey
}: {
  networkType: NetworkType;
  packageId: string;
  metadata: SuiMoveNormalizedModules;
  secretKey: string;
}): DubheClient {
  const contract = new Dubhe({
    networkType,
    packageId,
    metadata,
    secretKey
  });

  const address = contract.getAddress();

  return {
    contract,
    metadata,
    networkType,
    packageId,
    dubheSchemaId: DUBHE_SCHEMA_ID,
    address
  };
}

export const dubheClient = createDubheClient({
  networkType: NETWORK,
  packageId: PACKAGE_ID,
  metadata: metadata as SuiMoveNormalizedModules,
  secretKey: process.env.PRIVATE_KEY
});
