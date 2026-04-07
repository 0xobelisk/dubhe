/**
 * Localnet Integration Tests
 *
 * Covers the following dubhe CLI commands on localnet:
 *   dubhe test, dubhe faucet, dubhe check-balance, dubhe generate-key,
 *   dubhe switch-env, dubhe build, dubhe publish (handler), dubhe upgrade (handler),
 *   dubhe load-metadata, dubhe config-store
 *
 * Prerequisites:
 *   1. Sui CLI installed  (`sui --version`)
 *   2. Local Sui node running (`sui start` or `dubhe node --force`)
 *      Default RPC:    http://127.0.0.1:9000
 *      Default Faucet: http://127.0.0.1:9123
 *
 * Run:
 *   pnpm test:localnet
 *
 * Tests are automatically skipped when prerequisites are not met.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import {
  isSuiCliInstalled,
  isNetworkReachable,
  setupIntegrationEnv,
  teardownIntegrationEnv,
  verifyPackageOnChain,
  LOCALNET_DEPLOY_KEY,
  type IntegrationEnv
} from './setup';
import { readPublishedToml, writePublishedToml } from '../../src/utils/utils';

// ────────────────────────────────────────────────────────────────────────────
// Mock switchEnv so that publish/upgrade handlers don't interfere with the
// test's active Sui client environment. All other utils use real implementations.
// ────────────────────────────────────────────────────────────────────────────
vi.mock('../../src/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/utils')>();
  return {
    ...actual,
    switchEnv: vi.fn().mockResolvedValue(undefined)
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Check prerequisites once before any tests run
// ────────────────────────────────────────────────────────────────────────────
const NETWORK = 'localnet' as const;
const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

if (!suiCliAvailable) {
  console.warn('\n⚠  Skipping localnet tests: sui CLI not found.');
}
if (!localnetRunning) {
  console.warn('\n⚠  Skipping localnet tests: localnet not reachable at http://127.0.0.1:9000');
  console.warn('   Start with: sui start  OR  dubhe node --force\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Sui CLI version check (only requires sui CLI, no localnet needed)
// ────────────────────────────────────────────────────────────────────────────
describe.skipIf(!suiCliAvailable)('Sui CLI availability', () => {
  it('sui CLI should be installed and report a version', () => {
    const version = execSync('sui --version', { encoding: 'utf-8' }).trim();
    expect(version).toMatch(/sui/i);
    console.log(`  Sui version: ${version}`);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// All localnet tests share a single setup (env injection + funded wallet).
// The entire block is skipped when localnet is not running — no fake passes.
// ────────────────────────────────────────────────────────────────────────────
describe.skipIf(!canRunTests)('Localnet (requires running localnet)', () => {
  let env: IntegrationEnv;
  let counterProjectPath: string;
  let dubheProjectPath: string;
  let publishedPackageId: string;
  let balanceBeforeTests: bigint;
  let balanceBeforePublish: bigint;
  // Captured after publish to verify immutability across upgrade
  let publishedDappHubId: string;
  let publishedDappStorageId: string;

  beforeAll(async () => {
    console.log('\n📋 Setting up localnet integration test environment...');
    env = await setupIntegrationEnv(NETWORK);
    counterProjectPath = path.join(env.tempDir, 'src', 'counter');
    dubheProjectPath = path.join(env.tempDir, 'src', 'dubhe');
    console.log(`  Temp contracts dir: ${env.tempDir}`);
    console.log(`  Test wallet (known deploy key): ${env.address}`);
    console.log(`  Private key: ${LOCALNET_DEPLOY_KEY}`);

    const balance = await env.client.getBalance({ owner: env.address });
    balanceBeforeTests = BigInt(balance.totalBalance);
    console.log(`  Initial balance: ${Number(balanceBeforeTests) / 1e9} SUI`);
  }, 60_000);

  afterAll(async () => {
    if (env) {
      await teardownIntegrationEnv(env);
      console.log('\n🧹 Integration test environment cleaned up.');
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRE-PUBLISH: commands that do not require a deployed package
  // ══════════════════════════════════════════════════════════════════════════

  // ── dubhe test ────────────────────────────────────────────────────────────
  // Runs Move unit tests locally — no published packages needed.
  // Counter test file: sources/tests/counter.move

  it('dubhe test: should run Move unit tests in counter package', async () => {
    const { testHandler } = await import('../../src/commands/test');
    const { dubheConfig } = await import(path.join(env.tempDir, 'dubhe.config'));

    // testHandler runs `sui move test --path src/counter` with local compilation.
    // Use --build-env testnet so dependency resolution doesn't check the active
    // Sui client env (which may be 'localnet' from a previous run but not in Move.toml).
    const output = await testHandler(dubheConfig, { buildEnv: 'testnet' });
    expect(output).toMatch(/Test result: OK/i);
    console.log('  ✅ Move unit tests passed for counter package');
    console.log(
      `  Output: ${output
        .split('\n')
        .find((l) => l.includes('Test result'))
        ?.trim()}`
    );
  }, 60_000);

  it('dubhe test: filter runs a single matching Move test', async () => {
    const { testHandler } = await import('../../src/commands/test');
    const { dubheConfig } = await import(path.join(env.tempDir, 'dubhe.config'));

    const output = await testHandler(dubheConfig, {
      filter: 'test_inc',
      buildEnv: 'testnet'
    });
    expect(output).toMatch(/Test result:\s*OK/i);
    expect(output).toMatch(/Total tests:\s*1/i);
    console.log('  ✅ Filtered Move test run (single test)');
  }, 120_000);

  // ── dubhe faucet ─────────────────────────────────────────────────────────
  // Verifies the localnet faucet endpoint is reachable and funds an address.

  it('dubhe faucet: should request SUI from localnet faucet', async () => {
    const balanceBefore = BigInt(
      (await env.client.getBalance({ owner: env.address })).totalBalance
    );

    await requestSuiFromFaucetV2({
      host: getFaucetHost('localnet'),
      recipient: env.address
    });

    // After faucet, balance should be >= balance before (might be same if rate-limited)
    const balanceAfter = BigInt((await env.client.getBalance({ owner: env.address })).totalBalance);
    expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
    console.log(`  ✅ Faucet request succeeded. Balance: ${Number(balanceAfter) / 1e9} SUI`);
  }, 30_000);

  // ── dubhe check-balance ───────────────────────────────────────────────────
  // Verifies checkBalanceHandler reads PRIVATE_KEY from env and queries RPC.

  it('dubhe check-balance: should report positive balance for deploy account', async () => {
    const { checkBalanceHandler } = await import('../../src/utils/checkBalance');

    // PRIVATE_KEY is set in env by setupIntegrationEnv; balance should be > 0
    await expect(checkBalanceHandler(NETWORK)).resolves.not.toThrow();
    console.log('  ✅ check-balance reported positive SUI balance');
  }, 15_000);

  // ── dubhe generate-key ────────────────────────────────────────────────────
  // Verifies that a new keypair is generated and written to .env in process.cwd().
  // force=true ensures a new key is always created regardless of existing state.

  it('dubhe generate-key: should write a new keypair to .env file in cwd', async () => {
    const { generateAccountHandler } = await import('../../src/utils/generateAccount');
    const envFile = path.join(env.tempDir, '.env');

    // force=true: generate even if PRIVATE_KEY is already set in process.env
    await generateAccountHandler(true, false);

    expect(fs.existsSync(envFile)).toBe(true);
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain('PRIVATE_KEY=');
    // The generated key should be a suiprivkey or hex string
    const match = content.match(/PRIVATE_KEY=(.+)/);
    expect(match).not.toBeNull();
    expect(match![1].trim().length).toBeGreaterThan(0);
    console.log('  ✅ .env written with new PRIVATE_KEY');

    // IMPORTANT: process.env.PRIVATE_KEY is NOT changed by generateAccountHandler.
    // Subsequent tests continue using the original deploy key.
  }, 15_000);

  // ── dubhe switch-env ──────────────────────────────────────────────────────
  // Verifies that the Sui client active environment can be set to localnet.
  // switchEnv is mocked at the module level so publish/upgrade handlers don't
  // accidentally switch envs during tests. Here we use vi.importActual to get
  // the real implementation and exercise the actual switch behavior.

  it('dubhe switch-env: should switch Sui client active env to localnet', async () => {
    const { switchEnv: realSwitchEnv } = await vi.importActual<
      typeof import('../../src/utils/utils')
    >('../../src/utils/utils');

    // switchEnv adds the env alias if missing, then switches to it
    await expect(realSwitchEnv('localnet')).resolves.not.toThrow();

    const active = execSync('sui client active-env', { encoding: 'utf-8', stdio: 'pipe' });
    expect(active.trim()).toBe('localnet');
    console.log('  ✅ Sui client active env is now: localnet');
  }, 30_000);

  // ── dubhe build (dubhe package, pre-publish) ──────────────────────────────
  // Build the dubhe package with --build-env testnet. Dubhe has no local deps
  // so it can be built before anything is published on localnet.

  it('dubhe build: should build dubhe package with --build-env testnet', () => {
    const output = execSync(
      `sui move build --dump-bytecode-as-base64 --no-tree-shaking --build-env testnet --path ${dubheProjectPath}`,
      { encoding: 'utf-8', stdio: 'pipe', cwd: env.tempDir }
    );
    const parsed = JSON.parse(output);
    expect(parsed.modules).toBeDefined();
    expect(parsed.modules.length).toBeGreaterThan(0);
    expect(parsed.dependencies).toBeDefined();
    console.log(
      `  ✅ Dubhe modules: ${parsed.modules.length}, Dependencies: ${parsed.dependencies.length}`
    );
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLISH: deploy dubhe framework + counter contract
  // ══════════════════════════════════════════════════════════════════════════

  it('dubhe publish: should publish dubhe framework + counter contract to localnet', async () => {
    const { publishHandler } = await import('../../src/utils/publishHandler');
    const { dubheConfig } = await import(path.join(env.tempDir, 'dubhe.config'));

    // Capture balance right before publish/upgrade to correctly measure gas consumed.
    // (faucet test may have added SUI, so balanceBeforeTests would be inaccurate)
    const balanceSnapshot = await env.client.getBalance({ owner: env.address });
    balanceBeforePublish = BigInt(balanceSnapshot.totalBalance);

    console.log('\n🚀 Running publishHandler...');
    await publishHandler(dubheConfig, NETWORK, false);

    const entries = readPublishedToml(counterProjectPath);
    expect(entries[NETWORK]).toBeDefined();
    expect(entries[NETWORK]?.publishedAt).not.toBe('0x0');
    expect(entries[NETWORK]?.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);

    publishedPackageId = entries[NETWORK]!.publishedAt;
    console.log(`  ✅ Published counter at: ${publishedPackageId}`);
  }, 120_000);

  it('counter package should be accessible on-chain after publish', async () => {
    expect(publishedPackageId).toBeDefined();

    let onChain = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      onChain = await verifyPackageOnChain(env.client, publishedPackageId);
      if (onChain) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(onChain).toBe(true);
    console.log(`  ✅ Counter package verified on-chain: ${publishedPackageId}`);
  }, 30_000);

  it('dubhe framework should be accessible on-chain after publish', async () => {
    const dubheEntries = readPublishedToml(dubheProjectPath);
    expect(dubheEntries[NETWORK]).toBeDefined();
    const dubhePackageId = dubheEntries[NETWORK]!.publishedAt;
    expect(dubhePackageId).toMatch(/^0x[0-9a-f]{64}$/);

    const onChain = await verifyPackageOnChain(env.client, dubhePackageId);
    expect(onChain).toBe(true);
    console.log(`  ✅ Dubhe framework verified on-chain: ${dubhePackageId}`);
  }, 30_000);

  it('Published.toml should contain correct localnet chain-id and version=1 after publish', () => {
    const entries = readPublishedToml(counterProjectPath);
    const entry = entries[NETWORK];

    expect(entry).toBeDefined();
    expect(entry!.chainId).toBeTruthy();
    expect(entry!.version).toBe(1);
    expect(entry!.originalId).toBe(publishedPackageId);
    expect(entry!.publishedAt).toBe(publishedPackageId);
    console.log(`  Chain ID: ${entry!.chainId}`);
    console.log(`  Package ID: ${entry!.publishedAt}`);
  });

  it('Move.lock should contain [env.localnet] section after publish', () => {
    const moveLockPath = path.join(counterProjectPath, 'Move.lock');
    expect(fs.existsSync(moveLockPath)).toBe(true);

    const content = fs.readFileSync(moveLockPath, 'utf-8');
    expect(content).toContain('[env.localnet]');
    expect(content).toContain('latest-published-id');
  });

  it('.history/sui_localnet/latest.json should have version=1 and correct packageId after publish', () => {
    const latestJsonPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');
    expect(fs.existsSync(latestJsonPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf-8'));
    expect(data.version).toBe(1);
    expect(data.packageId).toBe(publishedPackageId);
    expect(data.network).toBe(NETWORK);
    expect(data.upgradeCap).toMatch(/^0x[0-9a-f]{64}$/);
    expect(data.projectName).toBe('counter');
    // startCheckpoint should be a non-empty string
    expect(typeof data.startCheckpoint).toBe('string');
    expect(data.startCheckpoint.length).toBeGreaterThan(0);
    // dappHubId — object ID of the DappHub shared object
    expect(data.dappHubId).toMatch(/^0x[0-9a-f]+$/);
    // frameworkPackageId — present on localnet (ephemeral deploy)
    expect(data.frameworkPackageId).toMatch(/^0x[0-9a-f]+$/);
    // dappStorageId — object ID of the DappStorage shared object
    expect(data.dappStorageId).toMatch(/^0x[0-9a-f]+$/);
    // field order: dappHubId, frameworkPackageId, dappStorageId must appear before upgradeCap
    const raw = fs.readFileSync(latestJsonPath, 'utf-8');
    const idxDappHubId = raw.indexOf('"dappHubId"');
    const idxFrameworkPackageId = raw.indexOf('"frameworkPackageId"');
    const idxDappStorageId = raw.indexOf('"dappStorageId"');
    const idxUpgradeCap = raw.indexOf('"upgradeCap"');
    expect(idxDappHubId).toBeLessThan(idxUpgradeCap);
    expect(idxFrameworkPackageId).toBeLessThan(idxUpgradeCap);
    expect(idxDappStorageId).toBeLessThan(idxUpgradeCap);
    // resources — must reflect dubhe.config resources (non-empty, key names present)
    expect(typeof data.resources).toBe('object');
    expect(Object.keys(data.resources).length).toBeGreaterThan(0);
    // 101 template defines: value (u32), counter2 (struct), counter2withkey (struct with keys)
    expect(data.resources).toHaveProperty('value');
    expect(data.resources).toHaveProperty('counter2');
    expect(data.resources).toHaveProperty('counter2withkey');
    // Capture for upgrade-immutability checks
    publishedDappHubId = data.dappHubId;
    publishedDappStorageId = data.dappStorageId;
    console.log(`  ✅ .history/latest.json: version=${data.version}, packageId=${data.packageId}`);
    console.log(`     dappHubId=${data.dappHubId}`);
    console.log(`     frameworkPackageId=${data.frameworkPackageId}`);
    console.log(`     dappStorageId=${data.dappStorageId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST-PUBLISH: commands that require a deployed package
  // ══════════════════════════════════════════════════════════════════════════

  // ── dubhe build (counter package, post-publish) ───────────────────────────
  // After publishDubheFramework writes Pub.localnet.toml, we can build counter
  // with --build-env testnet --pubfile-path, which resolves dubhe's address.

  it('dubhe build: should build counter package using Pub.localnet.toml after publish', async () => {
    const { buildHandler } = await import('../../src/commands/build');
    const { dubheConfig } = await import(
      /* @vite-ignore */ path.join(env.tempDir, 'dubhe.config') + '?b=' + Date.now()
    );

    const pubfilePath = path.join(env.tempDir, 'Pub.localnet.toml');
    expect(fs.existsSync(pubfilePath)).toBe(true);

    // buildHandler for localnet uses --build-env testnet --pubfile-path automatically
    const output = await buildHandler(dubheConfig, NETWORK);
    // sui move build outputs build status lines
    expect(output).toBeDefined();
    console.log('  ✅ Counter package built successfully after publish');
  }, 60_000);

  // ── dubhe load-metadata ───────────────────────────────────────────────────
  // Loads ABI metadata for the published counter package from the chain and
  // writes it to .history/sui_localnet/<packageId>.json and metadata.json.

  it('dubhe load-metadata: should fetch and save metadata for published counter', async () => {
    const { loadMetadataHandler } = await import('../../src/utils/metadataHandler');
    const { dubheConfig } = await import(
      /* @vite-ignore */ path.join(env.tempDir, 'dubhe.config') + '?m=' + Date.now()
    );

    expect(publishedPackageId).toBeDefined();
    await expect(
      loadMetadataHandler(dubheConfig, NETWORK, publishedPackageId)
    ).resolves.not.toThrow();

    // Verify metadata file was written
    const metadataFile = path.join(
      env.tempDir,
      'src',
      'counter',
      '.history',
      `sui_${NETWORK}`,
      `${publishedPackageId}.json`
    );
    expect(fs.existsSync(metadataFile)).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    expect(metadata).toBeDefined();
    console.log('  ✅ Metadata saved to .history/sui_localnet/<packageId>.json');
  }, 30_000);

  // ── dubhe config-store ────────────────────────────────────────────────────
  // Generates a TypeScript config file with Network, PackageId, DappHubId,
  // DappStorageId and FrameworkPackageId constants.

  it('dubhe config-store: should generate TypeScript config file', async () => {
    const { storeConfigHandler } = await import('../../src/utils/storeConfig');
    const { dubheConfig } = await import(
      /* @vite-ignore */ path.join(env.tempDir, 'dubhe.config') + '?s=' + Date.now()
    );

    const outputPath = path.join(env.tempDir, 'src', 'config', 'generated.ts');

    await expect(storeConfigHandler(dubheConfig, NETWORK, outputPath)).resolves.not.toThrow();

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf-8');

    // Basic shape
    expect(content).toContain('export const Network');
    expect(content).toContain('export const PackageId');
    expect(content).toContain('export const DappHubId');
    expect(content).toContain('export const DappStorageId');
    expect(content).toContain('export const FrameworkPackageId');

    // Values
    expect(content).toContain("'localnet'");
    expect(content).toContain(publishedPackageId);

    // DappHubId / DappStorageId / FrameworkPackageId must be non-trivial hex addresses
    const dappHubIdMatch = content.match(/export const DappHubId\s*=\s*'(0x[0-9a-f]+)'/);
    expect(dappHubIdMatch).not.toBeNull();
    expect(dappHubIdMatch![1].length).toBeGreaterThan(4);

    const dappStorageIdMatch = content.match(/export const DappStorageId\s*=\s*'(0x[0-9a-f]+)'/);
    expect(dappStorageIdMatch).not.toBeNull();
    expect(dappStorageIdMatch![1].length).toBeGreaterThan(4);

    // FrameworkPackageId is set on localnet (ephemeral deploy)
    const fwPkgMatch = content.match(/export const FrameworkPackageId[^=]*=\s*'(0x[0-9a-f]+)'/);
    expect(fwPkgMatch).not.toBeNull();
    expect(fwPkgMatch![1].length).toBeGreaterThan(4);

    console.log(`  ✅ TypeScript config generated at: ${outputPath}`);
    console.log(`     PackageId:         ${publishedPackageId}`);
    console.log(`     DappHubId:         ${dappHubIdMatch![1]}`);
    console.log(`     DappStorageId:     ${dappStorageIdMatch![1]}`);
    console.log(`     FrameworkPackageId:${fwPkgMatch![1]}`);
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // UPGRADE: upgrade the counter contract
  // ══════════════════════════════════════════════════════════════════════════

  it('dubhe upgrade: should upgrade counter contract on localnet', async () => {
    expect(publishedPackageId).toBeDefined();

    // We do NOT modify dubhe.config.ts here (no new schema fields).
    // This tests a bug-fix upgrade scenario: same schema, new package ID.
    // Schema-change upgrades require running `dubhe schemagen` first.

    const { upgradeHandler } = await import('../../src/utils/upgradeHandler');
    const { dubheConfig } = await import(
      /* @vite-ignore */ path.join(env.tempDir, 'dubhe.config') + '?t=' + Date.now()
    );

    console.log('\n⬆️  Running upgradeHandler...');
    await upgradeHandler(dubheConfig, 'counter', NETWORK);

    const entries = readPublishedToml(counterProjectPath);
    const entry = entries[NETWORK];
    expect(entry).toBeDefined();
    expect(entry!.version).toBe(2);
    expect(entry!.publishedAt).not.toBe(publishedPackageId);
    expect(entry!.originalId).toBe(publishedPackageId);

    console.log(`  ✅ Upgraded counter to v2: ${entry!.publishedAt}`);
    console.log(`  Original package ID preserved: ${entry!.originalId}`);
  }, 120_000);

  it('upgraded counter package should be accessible on-chain', async () => {
    const entries = readPublishedToml(counterProjectPath);
    const upgradedId = entries[NETWORK]?.publishedAt;
    expect(upgradedId).toBeDefined();

    let onChain = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      onChain = await verifyPackageOnChain(env.client, upgradedId!);
      if (onChain) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(onChain).toBe(true);
    console.log(`  ✅ Upgraded package verified on-chain: ${upgradedId}`);
  }, 30_000);

  it('Published.toml should have version=2 and originalId pointing to v1 after upgrade', () => {
    const entries = readPublishedToml(counterProjectPath);
    const entry = entries[NETWORK];

    expect(entry).toBeDefined();
    expect(entry!.version).toBe(2);
    expect(entry!.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(entry!.originalId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(entry!.publishedAt).not.toBe(entry!.originalId);
  });

  it('.history/sui_localnet/latest.json should have version=2 and new packageId after upgrade', () => {
    const latestJsonPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');
    expect(fs.existsSync(latestJsonPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf-8'));

    const entries = readPublishedToml(counterProjectPath);
    const upgradedPackageId = entries[NETWORK]!.publishedAt;

    expect(data.version).toBe(2);
    expect(data.packageId).toBe(upgradedPackageId);
    expect(data.packageId).not.toBe(publishedPackageId);
    expect(data.network).toBe(NETWORK);
    expect(data.upgradeCap).toMatch(/^0x[0-9a-f]{64}$/);
    // dappHubId must be identical to the value captured at publish time
    // (the DappHub shared object never changes address)
    expect(data.dappHubId).toBe(publishedDappHubId);
    // dappStorageId must be inherited from the publish deployment unchanged
    expect(data.dappStorageId).toBe(publishedDappStorageId);
    // frameworkPackageId remains the same ephemeral localnet deploy
    expect(data.frameworkPackageId).toMatch(/^0x[0-9a-f]+$/);
    // resources — bug-fix upgrade has no schema changes; stored resources must
    // still reflect the full config (same keys as after publish)
    expect(typeof data.resources).toBe('object');
    expect(Object.keys(data.resources).length).toBeGreaterThan(0);
    expect(data.resources).toHaveProperty('value');
    expect(data.resources).toHaveProperty('counter2');
    expect(data.resources).toHaveProperty('counter2withkey');
    console.log(`  ✅ .history/latest.json: version=${data.version}, packageId=${data.packageId}`);
    console.log(`     (v1 packageId was: ${publishedPackageId})`);
    console.log(`     dappHubId=${data.dappHubId} (same as publish: ✅)`);
  });

  // ── Gas verification ──────────────────────────────────────────────────────

  it('deploy wallet should have spent SUI (gas) during publish + upgrade', async () => {
    const balance = await env.client.getBalance({ owner: env.address });
    const remaining = BigInt(balance.totalBalance);
    expect(remaining).toBeGreaterThan(0n);
    // Gas check is measured from balanceBeforePublish (captured right before publishing),
    // so faucet SUI added in earlier tests does not inflate the starting balance.
    expect(remaining).toBeLessThan(balanceBeforePublish);
    const consumed = Number(balanceBeforePublish - remaining) / 1e9;
    console.log(`  Balance before publish: ${Number(balanceBeforePublish) / 1e9} SUI`);
    console.log(`  Balance after upgrade:  ${Number(remaining) / 1e9} SUI`);
    console.log(`  Gas consumed:           ~${consumed.toFixed(4)} SUI`);
  }, 15_000);
});

// ────────────────────────────────────────────────────────────────────────────
// Localnet - Published.toml lifecycle tests (no localnet required)
// ────────────────────────────────────────────────────────────────────────────
describe('Published.toml round-trip with real file I/O', () => {
  it('readPublishedToml should survive a write → read round-trip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-rt-'));

    writePublishedToml(tmpDir, {
      localnet: {
        chainId: 'abc12345',
        publishedAt: '0x' + 'a'.repeat(64),
        originalId: '0x' + 'a'.repeat(64),
        version: 1
      }
    });

    const result = readPublishedToml(tmpDir);
    expect(result.localnet?.chainId).toBe('abc12345');
    expect(result.localnet?.version).toBe(1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Dirty-state localnet publish tests
//
// These tests simulate the REAL-WORLD scenario where the user has previously
// deployed to testnet (and has Published.toml with testnet entries) or has
// run a previous localnet (leaving an old Pub.localnet.toml with a stale
// chain-id). The clean test above missed these bugs because setupIntegrationEnv
// always deletes Published.toml and Pub.localnet.toml before each run.
// ────────────────────────────────────────────────────────────────────────────
describe.skipIf(!canRunTests)(
  'Localnet dirty-state: publish with pre-existing deployment files',
  () => {
    let dirtyEnv: IntegrationEnv;
    let dirtyCounterPath: string;
    let dirtyDubhePath: string;

    beforeAll(async () => {
      console.log('\n📋 Setting up dirty-state localnet test environment...');
      // Use raw setupIntegrationEnv which cleans up, then immediately inject
      // "dirty" pre-existing state to simulate a real user's project directory.
      dirtyEnv = await setupIntegrationEnv(NETWORK);
      dirtyCounterPath = path.join(dirtyEnv.tempDir, 'src', 'counter');
      dirtyDubhePath = path.join(dirtyEnv.tempDir, 'src', 'dubhe');
    }, 60_000);

    afterAll(async () => {
      if (dirtyEnv) await teardownIntegrationEnv(dirtyEnv);
    });

    it('dubhe publish: should succeed even when dubhe Published.toml already has a testnet entry', async () => {
      // ── Simulate real-world dirty state ──────────────────────────────────
      // A user who previously deployed to testnet has a Published.toml with a
      // non-zero testnet address. Without the fix in publishDubheFramework,
      // --build-env testnet picks up this address → PublishErrorNonZeroAddress.
      writePublishedToml(dirtyDubhePath, {
        testnet: {
          chainId: '4c78adac',
          publishedAt: '0x' + 'beef'.repeat(16),
          originalId: '0x' + 'beef'.repeat(16),
          version: 1
        }
      });
      writePublishedToml(dirtyCounterPath, {
        testnet: {
          chainId: '4c78adac',
          publishedAt: '0x' + 'cafe'.repeat(16),
          originalId: '0x' + 'cafe'.repeat(16),
          version: 1
        }
      });

      // Also pre-plant a Pub.localnet.toml with a STALE chain-id (different
      // localnet). Without the fix in updateEphemeralPubFile, the stale chain-id
      // is preserved → "chain-id mismatch" build error for counter.
      const pubfilePath = path.join(dirtyEnv.tempDir, 'Pub.localnet.toml');
      fs.writeFileSync(
        pubfilePath,
        [
          '# generated by dubhe cli',
          '# this file contains metadata from ephemeral publications',
          '',
          'build-env = "testnet"',
          'chain-id = "deadbeef"', // stale chain-id from a previous localnet
          '',
          '[[published]]',
          `source = { local = "${dirtyDubhePath}" }`,
          `published-at = "0x${'dead'.repeat(16)}"`,
          `original-id = "0x${'dead'.repeat(16)}"`,
          `upgrade-cap = "0x${'dead'.repeat(16)}"`,
          'version = 1'
        ].join('\n'),
        'utf-8'
      );

      console.log('  Injected dirty state:');
      console.log('    dubhe Published.toml  → testnet entry with non-zero address');
      console.log('    counter Published.toml → testnet entry with non-zero address');
      console.log('    Pub.localnet.toml     → stale chain-id "deadbeef"');

      // ── Run publish and verify it succeeds ───────────────────────────────
      const { publishHandler } = await import('../../src/utils/publishHandler');
      const { dubheConfig } = await import(
        /* @vite-ignore */ path.join(dirtyEnv.tempDir, 'dubhe.config') + '?dirty=' + Date.now()
      );

      await expect(publishHandler(dubheConfig, NETWORK, false)).resolves.not.toThrow();

      // Verify localnet entry was written correctly
      const entries = readPublishedToml(dirtyCounterPath);
      expect(entries[NETWORK]).toBeDefined();
      expect(entries[NETWORK]?.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);
      // testnet entry must still be intact (we only wrote localnet)
      expect(entries['testnet']?.publishedAt).toBe('0x' + 'cafe'.repeat(16));

      // Verify Pub.localnet.toml was updated with the current chain-id
      const pubfileContent = fs.readFileSync(pubfilePath, 'utf-8');
      const chainIdMatch = pubfileContent.match(/^chain-id\s*=\s*"([^"]*)"/m);
      expect(chainIdMatch?.[1]).not.toBe('deadbeef');

      console.log(
        `  ✅ Publish succeeded despite pre-existing testnet addresses and stale Pub.localnet.toml`
      );
      console.log(`  ✅ Pub.localnet.toml chain-id updated to: ${chainIdMatch?.[1]}`);
    }, 120_000);
  }
);
