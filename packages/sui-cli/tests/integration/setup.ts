/**
 * Shared setup utilities for integration tests.
 * Each test suite should call setupIntegrationEnv() in beforeAll.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// ────────────────────────────────────────────────────────────────────────────
// Well-known test accounts pre-funded by `dubhe node` on every localnet start.
// These keys are ONLY for testing — never use on mainnet.
// Source: packages/sui-cli/src/utils/startNode.ts
// ────────────────────────────────────────────────────────────────────────────
export const LOCALNET_TEST_KEYS = [
  'suiprivkey1qq3ez3dje66l8pypgxynr7yymwps6uhn7vyczespj84974j3zya0wdpu76v', // Account #0
  'suiprivkey1qp6vcyg8r2x88fllmjmxtpzjl95gd9dugqrgz7xxf50w6rqdqzetg7x4d7s', // Account #1
  'suiprivkey1qpy3a696eh3m55fwa8h38ss063459u4n2dm9t24w2hlxxzjp2x34q8sdsnc', // Account #2
  'suiprivkey1qzxwp29favhzrjd95f6uj9nskjwal6nh9g509jpun395y6g72d6jqlmps4c', // Account #3
  'suiprivkey1qzhq4lv38sesah4uzsqkkmeyjx860xqjdz8qgw36tmrdd5tnle3evxpng57', // Account #4
  'suiprivkey1qzez45sjjsepjgtksqvpq6jw7dzw3zq0dx7a4sulfypd73acaynw5jl9x2c' // Account #5 (default deploy key)
] as const;

// The deploy key used by `dubhe node` and integration tests
export const LOCALNET_DEPLOY_KEY = LOCALNET_TEST_KEYS[5];

// Path to the template contracts (the real project to test)
export const TEMPLATE_CONTRACTS_DIR = path.resolve(
  __dirname,
  '../../../../templates/101/sui-template/packages/contracts'
);

export type NetworkType = 'localnet' | 'testnet' | 'devnet' | 'mainnet';

export interface IntegrationEnv {
  tempDir: string;
  keypair: Ed25519Keypair;
  address: string;
  privateKey: string;
  client: SuiClient;
  originalCwd: string;
  originalPrivateKey: string | undefined;
}

// ────────────────────────────────────────────
// Prerequisite checks
// ────────────────────────────────────────────

export function isSuiCliInstalled(): boolean {
  try {
    execSync('sui --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function isNetworkReachable(network: NetworkType): boolean {
  const rpcUrl = getNetworkRpcUrl(network);
  // Sui RPC requires a JSON-RPC POST request — a plain GET returns 4xx/5xx.
  // Use sui_getChainIdentifier as the health probe.
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

export function getFaucetUrl(network: NetworkType): string {
  switch (network) {
    case 'localnet':
      return 'http://127.0.0.1:9123/gas';
    case 'testnet':
      return 'https://faucet.testnet.sui.io/v2/gas';
    case 'devnet':
      return 'https://faucet.devnet.sui.io/v2/gas';
    default:
      throw new Error(`No faucet available for ${network}`);
  }
}

// ────────────────────────────────────────────
// Contract project setup
// ────────────────────────────────────────────

/**
 * Copy the template contracts directory to a fresh temp directory.
 * Returns the path to the new temp directory.
 */
export function createTempContractsDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-integration-test-'));
  copyDirRecursive(TEMPLATE_CONTRACTS_DIR, tempDir);
  return tempDir;
}

function copyDirRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip build artifacts and node_modules
    if (['node_modules', '.git', 'build'].includes(entry.name)) continue;

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Reset the dubhe package Move.toml to use address "0x0" for fresh localnet deploys.
 * This is needed because the template has testnet addresses pre-filled.
 */
export function resetDubheMoveTomlForLocalnet(contractsDir: string): void {
  const dubheMoveToml = path.join(contractsDir, 'src', 'dubhe', 'Move.toml');
  if (!fs.existsSync(dubheMoveToml)) return;

  let content = fs.readFileSync(dubheMoveToml, 'utf-8');
  // Remove published-at line so it can be freshly published
  content = content.replace(/^published-at\s*=\s*"[^"]*"\n?/m, '');
  // Reset dubhe address to 0x0
  content = content.replace(/^dubhe\s*=\s*"[^"]*"/m, 'dubhe = "0x0"');
  fs.writeFileSync(dubheMoveToml, content, 'utf-8');
}

/**
 * Inject the localnet chain ID into the [environments] section of all Move.toml files
 * in the contracts directory. This is required by Sui CLI v1.66.2+ when using -e localnet.
 *
 * The chain ID is queried from the running localnet node.
 */
export async function injectLocalnetEnvironment(
  contractsDir: string,
  chainId: string
): Promise<void> {
  const moveTomlPaths = [
    path.join(contractsDir, 'src', 'dubhe', 'Move.toml'),
    path.join(contractsDir, 'src', 'counter', 'Move.toml')
  ];

  for (const moveTomlPath of moveTomlPaths) {
    if (!fs.existsSync(moveTomlPath)) continue;

    let content = fs.readFileSync(moveTomlPath, 'utf-8');

    if (content.includes('[environments]')) {
      // Environments section exists — add or update localnet entry
      if (content.includes('localnet')) {
        // Already has localnet — update the chain ID
        content = content.replace(/^localnet\s*=\s*"[^"]*"/m, `localnet = "${chainId}"`);
      } else {
        // Append localnet to the existing [environments] section
        content = content.replace(
          /(\[environments\][\s\S]*?)(\n\[|$)/,
          `$1\nlocalnet = "${chainId}"$2`
        );
      }
    } else {
      // No [environments] section — add one at the end
      content += `\n[environments]\nlocalnet = "${chainId}"\n`;
    }

    fs.writeFileSync(moveTomlPath, content, 'utf-8');
  }
  console.log(`  Injected localnet chain ID (${chainId}) into Move.toml files.`);
}

/**
 * Clean up any existing Move.lock env sections so we start fresh.
 */
export function cleanMoveLockForNetwork(contractsDir: string, network: NetworkType): void {
  const moveLockPaths = [
    path.join(contractsDir, 'src', 'counter', 'Move.lock'),
    path.join(contractsDir, 'src', 'dubhe', 'Move.lock')
  ];

  for (const moveLockPath of moveLockPaths) {
    if (!fs.existsSync(moveLockPath)) continue;
    const content = fs.readFileSync(moveLockPath, 'utf-8');
    const regex = new RegExp(`\\[env\\.${network}\\][\\s\\S]*?(?=\\[|$)`, 'g');
    const updated = content.replace(regex, '');
    fs.writeFileSync(moveLockPath, updated, 'utf-8');
  }
}

/**
 * Clean up Published.toml for a given network so we start fresh.
 */
export function cleanPublishedTomlForNetwork(contractsDir: string, network: NetworkType): void {
  const publishedTomlPaths = [
    path.join(contractsDir, 'src', 'counter', 'Published.toml'),
    path.join(contractsDir, 'src', 'dubhe', 'Published.toml')
  ];

  for (const tomlPath of publishedTomlPaths) {
    if (fs.existsSync(tomlPath)) {
      fs.unlinkSync(tomlPath);
    }
  }

  // Also clean the ephemeral Pub.<network>.toml file (localnet / devnet).
  const ephemeralPubFile = path.join(contractsDir, `Pub.${network}.toml`);
  if (fs.existsSync(ephemeralPubFile)) {
    fs.unlinkSync(ephemeralPubFile);
  }
}

// ────────────────────────────────────────────
// Wallet setup
// ────────────────────────────────────────────

/**
 * For localnet: derive the well-known deploy keypair, request faucet funds,
 * and return immediately. No need to wait for slow faucet transactions.
 *
 * Using a fixed key avoids the overhead of generating a fresh wallet and
 * waiting for the faucet on every test run.
 */
export async function getLocalnetDeployKeypair(
  client: SuiClient
): Promise<{ keypair: Ed25519Keypair; address: string; privateKey: string }> {
  const { secretKey } = decodeSuiPrivateKey(LOCALNET_DEPLOY_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`\n  Using known localnet deploy key: ${address}`);
  console.log(`  Requesting faucet top-up...`);

  try {
    await requestSuiFromFaucetV2({
      host: getFaucetHost('localnet'),
      recipient: address
    });
  } catch {
    // Faucet may be rate-limited if called too frequently — check balance directly
  }

  await waitForBalance(client, address, 500_000_000n);
  console.log(`  Deploy key ready.`);

  return { keypair, address, privateKey: LOCALNET_DEPLOY_KEY };
}

/**
 * Generate a fresh Ed25519 keypair and fund it via the network faucet.
 * Used for testnet and devnet where we want isolated test wallets.
 */
export async function generateAndFundKeypair(
  network: NetworkType,
  client: SuiClient
): Promise<{ keypair: Ed25519Keypair; address: string; privateKey: string }> {
  if (network === 'mainnet') {
    throw new Error('Mainnet does not have a faucet. Use a funded wallet instead.');
  }

  const keypair = new Ed25519Keypair();
  const address = keypair.getPublicKey().toSuiAddress();
  const privateKeyBytes = keypair.getSecretKey();
  const privateKey = Buffer.from(privateKeyBytes).toString('hex');

  console.log(`\n  Generated test wallet: ${address}`);
  console.log(`  Requesting faucet funds on ${network}...`);

  await requestSuiFromFaucetV2({
    host: getFaucetHost(network as 'localnet' | 'testnet' | 'devnet'),
    recipient: address
  });

  await waitForBalance(client, address, 100_000_000n);
  console.log(`  Wallet funded successfully.`);

  return { keypair, address, privateKey };
}

/**
 * Poll until the address has at least minBalance MIST.
 */
async function waitForBalance(
  client: SuiClient,
  address: string,
  minBalance: bigint,
  maxWaitMs = 30_000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const balance = await client.getBalance({ owner: address });
    if (BigInt(balance.totalBalance) >= minBalance) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${address} to reach balance ${minBalance} MIST`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ────────────────────────────────────────────
// Full environment setup / teardown
// ────────────────────────────────────────────

/**
 * Set up a complete integration test environment:
 * 1. Copy template contracts to a temp directory
 * 2. Generate and fund a test wallet
 * 3. Set PRIVATE_KEY env var
 * 4. chdir to the temp contracts directory
 *
 * Call teardownIntegrationEnv() in afterAll to clean up.
 */
export async function setupIntegrationEnv(network: NetworkType): Promise<IntegrationEnv> {
  const rpcUrl = getNetworkRpcUrl(network);
  const client = new SuiClient({ url: rpcUrl });

  // For localnet: use the well-known deploy key (pre-funded by `dubhe node`).
  // For other networks: generate a fresh wallet and fund via faucet.
  const { keypair, address, privateKey } =
    network === 'localnet'
      ? await getLocalnetDeployKeypair(client)
      : await generateAndFundKeypair(network, client);

  const tempDir = createTempContractsDir();
  resetDubheMoveTomlForLocalnet(tempDir);
  cleanMoveLockForNetwork(tempDir, network);
  cleanPublishedTomlForNetwork(tempDir, network);

  // Note: We do NOT inject 'localnet' into Move.toml [environments].
  // Per Sui docs, localnet is ephemeral and uses Pub.localnet.toml instead.
  // publishHandler uses --build-env testnet --pubfile-path Pub.localnet.toml.

  const originalCwd = process.cwd();
  const originalPrivateKey = process.env.PRIVATE_KEY;

  // publishHandler reads process.cwd() internally
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

  // Clean up temp directory
  if (fs.existsSync(env.tempDir)) {
    fs.rmSync(env.tempDir, { recursive: true, force: true });
  }
}

// ────────────────────────────────────────────
// On-chain verification helpers
// ────────────────────────────────────────────

/**
 * Verify a package exists on-chain by checking its normalized modules.
 */
export async function verifyPackageOnChain(client: SuiClient, packageId: string): Promise<boolean> {
  try {
    const modules = await client.getNormalizedMoveModulesByPackage({ package: packageId });
    return Object.keys(modules).length > 0;
  } catch {
    return false;
  }
}
