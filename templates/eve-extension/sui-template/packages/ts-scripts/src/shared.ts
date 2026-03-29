import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getFullnodeUrl, type NetworkType } from '@0xobelisk/sui-client';

const SUPPORTED_NETWORKS: NetworkType[] = ['localnet', 'testnet', 'mainnet', 'devnet'];

type GeneratedDeployment = {
  NETWORK?: NetworkType;
  PACKAGE_ID?: string;
  DUBHE_SCHEMA_ID?: string;
};

export type RuntimeConfig = {
  envPath?: string;
  network: NetworkType;
  rpcUrl: string;
  privateKey?: string;
  packageId?: string;
  dappHubId?: string;
};

export function scriptDir(importMetaUrl: string) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

function loadDotenv(scriptDirectory: string): string | undefined {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(scriptDirectory, '../../../.env')
  ];

  const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
  if (envPath) {
    dotenv.config({ path: envPath });
    return envPath;
  }

  dotenv.config();
  return undefined;
}

function readGeneratedDeployment(scriptDirectory: string): GeneratedDeployment {
  const deploymentPath = path.resolve(scriptDirectory, 'deployment.ts');
  if (!fs.existsSync(deploymentPath)) {
    return {};
  }

  const content = fs.readFileSync(deploymentPath, 'utf-8');
  const extract = (name: 'NETWORK' | 'PACKAGE_ID' | 'DUBHE_SCHEMA_ID') => {
    const match = content.match(new RegExp(`export const ${name} = ['\\\"]([^'\\\"]+)['\\\"]`));
    return match?.[1];
  };

  return {
    NETWORK: extract('NETWORK') as NetworkType | undefined,
    PACKAGE_ID: extract('PACKAGE_ID'),
    DUBHE_SCHEMA_ID: extract('DUBHE_SCHEMA_ID')
  };
}

export function getRuntimeConfig(scriptDirectory: string): RuntimeConfig {
  const envPath = loadDotenv(scriptDirectory);
  const deployment = readGeneratedDeployment(scriptDirectory);

  const networkRaw = process.env.SUI_NETWORK ?? deployment.NETWORK ?? 'testnet';
  if (!SUPPORTED_NETWORKS.includes(networkRaw as NetworkType)) {
    throw new Error(`Unsupported SUI_NETWORK: ${networkRaw}`);
  }
  const network = networkRaw as NetworkType;

  const rpcUrl = process.env.SUI_RPC_URL ?? getFullnodeUrl(network);

  return {
    envPath,
    network,
    rpcUrl,
    privateKey: process.env.PRIVATE_KEY,
    packageId: process.env.EXTENSION_PACKAGE_ID ?? deployment.PACKAGE_ID,
    dappHubId: process.env.DUBHE_SCHEMA_ID ?? deployment.DUBHE_SCHEMA_ID
  };
}

export function requireValue(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required value: ${name}`);
  }
  return value.trim();
}

export function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}

export function parseU64Env(name: string, fallback: bigint): bigint {
  const raw = process.env[name];
  if (!raw) return fallback;
  return BigInt(raw);
}

export function normalizeDubheAccountFromSuiAddress(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '');
  return hex.padStart(64, '0');
}
