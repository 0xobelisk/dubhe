/**
 * Shared setup utilities for e2e integration tests.
 *
 * Reuses the same patterns as packages/sui-cli/tests/integration/setup.ts
 * but adapted for the e2e package's test suite which focuses on the full
 * schemagen → build → publish → interact workflow.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const E2E_ROOT = path.resolve(__dirname, '../../');

/**
 * The template contracts directory used as the baseline for integration tests.
 * Copied fresh for each test run to avoid state pollution.
 */
export const TEMPLATE_CONTRACTS_DIR = path.resolve(
  __dirname,
  '../../../templates/101/sui-template/packages/contracts'
);

export type NetworkType = 'localnet' | 'testnet' | 'devnet' | 'mainnet';

// ─── Well-known test keys (pre-funded by `dubhe node` on every localnet start) ─

export const LOCALNET_TEST_KEYS = [
  'suiprivkey1qq3ez3dje66l8pypgxynr7yymwps6uhn7vyczespj84974j3zya0wdpu76v', // Account #0
  'suiprivkey1qp6vcyg8r2x88fllmjmxtpzjl95gd9dugqrgz7xxf50w6rqdqzetg7x4d7s', // Account #1
  'suiprivkey1qpy3a696eh3m55fwa8h38ss063459u4n2dm9t24w2hlxxzjp2x34q8sdsnc', // Account #2
  'suiprivkey1qzxwp29favhzrjd95f6uj9nskjwal6nh9g509jpun395y6g72d6jqlmps4c', // Account #3
  'suiprivkey1qzhq4lv38sesah4uzsqkkmeyjx860xqjdz8qgw36tmrdd5tnle3evxpng57', // Account #4
  'suiprivkey1qzez45sjjsepjgtksqvpq6jw7dzw3zq0dx7a4sulfypd73acaynw5jl9x2c' // Account #5 (deploy key)
] as const;

export const LOCALNET_DEPLOY_KEY = LOCALNET_TEST_KEYS[5];

// ─── Prerequisite checks ──────────────────────────────────────────────────────

export function isSuiCliInstalled(): boolean {
  try {
    execSync('sui --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getNetworkRpcUrl(network: NetworkType): string {
  switch (network) {
    case 'localnet':
      return 'http://127.0.0.1:9000';
    case 'testnet':
      return 'https://fullnode.testnet.sui.io:443';
    case 'devnet':
      return 'https://fullnode.devnet.sui.io:443';
    case 'mainnet':
      return 'https://fullnode.mainnet.sui.io:443';
  }
}

export function isNetworkReachable(network: NetworkType): boolean {
  const rpcUrl = getNetworkRpcUrl(network);
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'sui_getChainIdentifier',
    params: []
  });
  try {
    execSync(
      `curl -sf -X POST "${rpcUrl}" -H "Content-Type: application/json" -d '${payload}' --max-time 5 -o /dev/null`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Contract directory setup ─────────────────────────────────────────────────

function copyDirRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'build'].includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function createTempContractsDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-e2e-integration-'));
  copyDirRecursive(TEMPLATE_CONTRACTS_DIR, tempDir);
  return tempDir;
}

export function resetDubheMoveTomlForLocalnet(contractsDir: string): void {
  const dubheMoveToml = path.join(contractsDir, 'src', 'dubhe', 'Move.toml');
  if (!fs.existsSync(dubheMoveToml)) return;
  let content = fs.readFileSync(dubheMoveToml, 'utf-8');
  content = content.replace(/^published-at\s*=\s*"[^"]*"\n?/m, '');
  content = content.replace(/^dubhe\s*=\s*"[^"]*"/m, 'dubhe = "0x0"');
  fs.writeFileSync(dubheMoveToml, content, 'utf-8');
}

export function cleanMoveLockForNetwork(contractsDir: string, network: NetworkType): void {
  const moveLockPaths = [
    path.join(contractsDir, 'src', 'counter', 'Move.lock'),
    path.join(contractsDir, 'src', 'dubhe', 'Move.lock')
  ];
  for (const moveLockPath of moveLockPaths) {
    if (!fs.existsSync(moveLockPath)) continue;
    const content = fs.readFileSync(moveLockPath, 'utf-8');
    const regex = new RegExp(`\\[env\\.${network}\\][\\s\\S]*?(?=\\[|$)`, 'g');
    fs.writeFileSync(moveLockPath, content.replace(regex, ''), 'utf-8');
  }
}

export function cleanPublishedTomlForNetwork(contractsDir: string, network: NetworkType): void {
  const tomlPaths = [
    path.join(contractsDir, 'src', 'counter', 'Published.toml'),
    path.join(contractsDir, 'src', 'dubhe', 'Published.toml')
  ];
  for (const tomlPath of tomlPaths) {
    if (fs.existsSync(tomlPath)) fs.unlinkSync(tomlPath);
  }
  const ephemeral = path.join(contractsDir, `Pub.${network}.toml`);
  if (fs.existsSync(ephemeral)) fs.unlinkSync(ephemeral);
}

// ─── Wallet setup ─────────────────────────────────────────────────────────────

export async function getLocalnetDeployKeypair(
  client: SuiClient
): Promise<{ keypair: Ed25519Keypair; address: string; privateKey: string }> {
  const { secretKey } = decodeSuiPrivateKey(LOCALNET_DEPLOY_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`\n  Using localnet deploy key: ${address}`);
  try {
    await requestSuiFromFaucetV2({
      host: getFaucetHost('localnet'),
      recipient: address
    });
  } catch {
    // Rate-limited — check balance directly
  }

  await waitForBalance(client, address, 500_000_000n);
  return { keypair, address, privateKey: LOCALNET_DEPLOY_KEY };
}

async function waitForBalance(
  client: SuiClient,
  address: string,
  minBalance: bigint,
  maxWaitMs = 30_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const balance = await client.getBalance({ owner: address });
    if (BigInt(balance.totalBalance) >= minBalance) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for balance >= ${minBalance} MIST on ${address}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── On-chain verification ────────────────────────────────────────────────────

export async function verifyPackageOnChain(client: SuiClient, packageId: string): Promise<boolean> {
  try {
    const modules = await client.getNormalizedMoveModulesByPackage({ package: packageId });
    return Object.keys(modules).length > 0;
  } catch {
    return false;
  }
}

// ─── Integration environment ──────────────────────────────────────────────────

export interface IntegrationEnv {
  tempDir: string;
  keypair: Ed25519Keypair;
  address: string;
  privateKey: string;
  client: SuiClient;
  originalCwd: string;
  originalPrivateKey: string | undefined;
}

export async function setupIntegrationEnv(network: NetworkType): Promise<IntegrationEnv> {
  const rpcUrl = getNetworkRpcUrl(network);
  const client = new SuiClient({ url: rpcUrl });

  const { keypair, address, privateKey } = await getLocalnetDeployKeypair(client);

  const tempDir = createTempContractsDir();
  resetDubheMoveTomlForLocalnet(tempDir);
  cleanMoveLockForNetwork(tempDir, network);
  cleanPublishedTomlForNetwork(tempDir, network);

  const originalCwd = process.cwd();
  const originalPrivateKey = process.env.PRIVATE_KEY;

  process.chdir(tempDir);
  process.env.PRIVATE_KEY = privateKey;

  return { tempDir, keypair, address, privateKey, client, originalCwd, originalPrivateKey };
}

export async function teardownIntegrationEnv(env: IntegrationEnv): Promise<void> {
  process.chdir(env.originalCwd);
  if (env.originalPrivateKey !== undefined) {
    process.env.PRIVATE_KEY = env.originalPrivateKey;
  } else {
    delete process.env.PRIVATE_KEY;
  }
  if (fs.existsSync(env.tempDir)) {
    fs.rmSync(env.tempDir, { recursive: true, force: true });
  }
}
