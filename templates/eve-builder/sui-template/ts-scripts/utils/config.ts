import path from 'node:path';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// --- Deployment file paths ---
export const EXTRACTED_OBJECT_IDS_FILENAME = 'extracted-object-ids.json';
export const PUBLISH_OUTPUT_FILENAME = 'publish.json';

export type WorldObjectIds = {
  governorCap: string;
  serverAddressRegistry: string;
  objectRegistry: string;
  adminAcl: string;
  energyConfig: string;
  fuelConfig: string;
  gateConfig: string;
};

export type ExtractedObjectIds = {
  network: string;
  world: WorldObjectIds & { packageId: string };
  builder?: {
    packageId: string;
    extensionConfigId: string;
    adminCapId?: string;
  };
};

export type WorldConfig = {
  url: string;
  packageId: string;
} & WorldObjectIds;

export type HydratedWorldConfig = WorldConfig;

export type Network = 'localnet' | 'testnet' | 'devnet' | 'mainnet';

export const DEFAULT_RPC_URLS: Record<Network, string> = {
  localnet: 'http://127.0.0.1:9000',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443'
};

export function getExtractedObjectIdsPath(network: string): string {
  return path.resolve(process.cwd(), 'deployments', network, EXTRACTED_OBJECT_IDS_FILENAME);
}

export function getPublishOutputPath(network: string): string {
  return path.resolve(process.cwd(), 'deployments', network, PUBLISH_OUTPUT_FILENAME);
}

export function createClient(network: Network = 'localnet'): SuiJsonRpcClient {
  const config = getConfig(network);
  return new SuiJsonRpcClient({ url: config.url, network });
}

export function keypairFromPrivateKey(privateKey: string): Ed25519Keypair {
  const { scheme, secretKey } = decodeSuiPrivateKey(privateKey);
  if (scheme !== 'ED25519') {
    throw new Error('Only ED25519 keys are supported');
  }
  return Ed25519Keypair.fromSecretKey(secretKey);
}

export function getConfig(network: Network = 'localnet'): WorldConfig {
  const url = process.env.SUI_RPC_URL || DEFAULT_RPC_URLS[network];
  const packageId = process.env.WORLD_PACKAGE_ID || '';

  return {
    url,
    packageId,
    governorCap: '',
    serverAddressRegistry: '',
    objectRegistry: '',
    adminAcl: '',
    energyConfig: '',
    fuelConfig: '',
    gateConfig: ''
  };
}

// World package module names
export const MODULES = {
  WORLD: 'world',
  ACCESS: 'access',
  SIG_VERIFY: 'sig_verify',
  LOCATION: 'location',
  CHARACTER: 'character',
  NETWORK_NODE: 'network_node',
  ASSEMBLY: 'assembly',
  STORAGE_UNIT: 'storage_unit',
  GATE: 'gate',
  FUEL: 'fuel',
  ENERGY: 'energy'
} as const;
