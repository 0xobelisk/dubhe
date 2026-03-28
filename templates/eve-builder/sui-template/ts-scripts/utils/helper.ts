import * as fs from 'node:fs';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createClient,
  keypairFromPrivateKey,
  HydratedWorldConfig,
  WorldConfig,
  getConfig,
  Network,
  DEFAULT_RPC_URLS,
  ExtractedObjectIds,
  getExtractedObjectIdsPath
} from './config';
import { TENANT } from './constants';

export interface EnvConfig {
  network: Network;
  rpcUrl: string;
  packageId: string;
  adminExportedKey: string;
  tenant: string;
}

export interface InitializedContext {
  client: SuiJsonRpcClient;
  keypair: Ed25519Keypair;
  config: WorldConfig;
  address: string;
  network: Network;
}

export const DELAY_MS = Number(process.env.DELAY_SECONDS ?? 2) * 1000; // 2 seconds

export function fromHex(hex: string): Uint8Array {
  const stripped = hex.startsWith('0x') ? hex.slice(2) : hex;
  const normalized = stripped.length % 2 === 0 ? stripped : '0' + stripped;
  if (!/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substring(i, i + 2), 16);
  }
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** @deprecated Use fromHex instead */
export const hexToBytes = fromHex;

export function handleError(error: unknown): never {
  console.error('\n=== Error ===');
  console.error('Error:', error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error('Stack:', error.stack);
  }
  process.exit(1);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getEnvConfig(): EnvConfig {
  const network = (process.env.SUI_NETWORK as Network) || 'localnet';
  const rpcUrl = process.env.SUI_RPC_URL || DEFAULT_RPC_URLS[network];
  const packageId = getDefaultWorldPackageId(network);
  if (!packageId) {
    throw new Error('WORLD_PACKAGE_ID is required');
  }
  const adminExportedKey = requireEnv('ADMIN_PRIVATE_KEY');

  return {
    network,
    rpcUrl,
    packageId,
    adminExportedKey,
    tenant: TENANT
  };
}

export function initializeContext(network: Network, privateKey: string): InitializedContext {
  const client = createClient(network);
  const keypair = keypairFromPrivateKey(privateKey);
  const config = getConfig(network) as WorldConfig;
  const fromExtracted = getDefaultWorldPackageId(network);
  if (fromExtracted) config.packageId = fromExtracted;
  const address = keypair.getPublicKey().toSuiAddress();

  return { client, keypair, config, address, network };
}

export function extractEvent<T = unknown>(
  result: { events?: Array<{ type: string; parsedJson?: unknown }> | null | undefined },
  eventTypeSuffix: string
): T | null {
  const events = result.events || [];
  const event = events.find((event) => event.type.endsWith(eventTypeSuffix));
  return (event?.parsedJson as T) || null;
}

export async function hydrateWorldConfig(ctx: InitializedContext): Promise<HydratedWorldConfig> {
  const hasManualIds =
    !!ctx.config.governorCap &&
    !!ctx.config.serverAddressRegistry &&
    !!ctx.config.objectRegistry &&
    !!ctx.config.adminAcl &&
    !!ctx.config.energyConfig &&
    !!ctx.config.fuelConfig &&
    !!ctx.config.gateConfig;

  if (!hasManualIds) {
    const network = ctx.network;
    const extracted = loadExtractedObjectIds(network);
    if (!extracted?.world || extracted.world.packageId !== ctx.config.packageId) {
      const filePath = getExtractedObjectIdsPath(network);
      throw new Error(`Missing or mismatched ${filePath}. Deploy world-contracts first.`);
    }
    const { packageId: _p, ...ids } = extracted.world;
    ctx.config = { ...ctx.config, ...ids } as WorldConfig;
  }

  return ctx.config as HydratedWorldConfig;
}

export function loadExtractedObjectIds(network: string): ExtractedObjectIds | null {
  const filePath = getExtractedObjectIdsPath(network);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as ExtractedObjectIds;
  } catch {
    return null;
  }
}

export function getDefaultWorldPackageId(network: string): string {
  return process.env.WORLD_PACKAGE_ID || loadExtractedObjectIds(network)?.world?.packageId || '';
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
