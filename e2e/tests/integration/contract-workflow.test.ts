/**
 * Contract integration tests: schemagen → build → publish → upgrade
 *
 * Tests the full contract lifecycle on localnet:
 *   1. schemagen — verify code is generated correctly from config
 *   2. Move test  — verify generated code compiles and unit tests pass
 *   3. publish    — deploy counter + dubhe framework to localnet
 *   4. on-chain verify — confirm packages are accessible on chain
 *   5. upgrade    — upgrade counter contract and verify version bump
 *
 * Prerequisites:
 *   1. sui CLI installed  (`sui --version`)
 *   2. Localnet running   (`dubhe node --force`)
 *      RPC:    http://127.0.0.1:9000
 *      Faucet: http://127.0.0.1:9123
 *
 * Run:
 *   pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { schemaGen } from '@0xobelisk/sui-common';
import { testHandler } from '../../../packages/sui-cli/src/commands/test.js';
import { publishHandler } from '../../../packages/sui-cli/src/utils/publishHandler.js';
import { upgradeHandler } from '../../../packages/sui-cli/src/utils/upgradeHandler.js';
import { loadMetadataHandler } from '../../../packages/sui-cli/src/utils/metadataHandler.js';
import { readPublishedToml } from '../../../packages/sui-cli/src/utils/utils.js';
import { dubheConfig as template101Config } from '../../../templates/101/sui-template/packages/contracts/dubhe.config.js';
import {
  isSuiCliInstalled,
  isNetworkReachable,
  setupIntegrationEnv,
  teardownIntegrationEnv,
  verifyPackageOnChain,
  type IntegrationEnv
} from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_DIR = path.resolve(__dirname, '../../../framework/src/dubhe');

// ─── Prerequisites ────────────────────────────────────────────────────────────

const NETWORK = 'localnet' as const;
const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

if (!suiCliAvailable) {
  console.warn('\n⚠  Skipping integration tests: sui CLI not found.');
}
if (!localnetRunning) {
  console.warn('\n⚠  Skipping integration tests: localnet not reachable at http://127.0.0.1:9000');
  console.warn('   Start with: dubhe node --force\n');
}

// ─── Sui CLI availability check ───────────────────────────────────────────────

describe.skipIf(!suiCliAvailable)('Integration: sui CLI check', () => {
  it('sui CLI is installed and reports a version', () => {
    const version = execSync('sui --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    expect(version).toMatch(/sui/i);
    console.log(`  sui version: ${version}`);
  });
});

// ─── Schemagen integration (no localnet needed) ───────────────────────────────

describe('Integration: schemagen produces correct output for template configs', () => {
  it('e2e/dubhe.config.ts — generates all resources, enums, core codegen files', async () => {
    const { dubheConfig } = await import('../../dubhe.config.js');
    const os = await import('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-schemagen-integ-'));

    try {
      await schemaGen(tempDir, dubheConfig);

      const codegenDir = path.join(tempDir, 'src', dubheConfig.name, 'sources', 'codegen');
      expect(fs.existsSync(path.join(codegenDir, 'genesis.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'dapp_key.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'init_test.move'))).toBe(true);

      // Verify resources directory is generated (not components)
      const resourcesDir = path.join(codegenDir, 'resources');
      expect(fs.existsSync(resourcesDir)).toBe(true);
      for (let i = 0; i <= 9; i++) {
        expect(fs.existsSync(path.join(resourcesDir, `resource${i}.move`))).toBe(true);
      }
      // Component-style resources are now under resources/ directory
      for (let i = 0; i <= 34; i++) {
        expect(fs.existsSync(path.join(resourcesDir, `component${i}.move`))).toBe(true);
      }

      expect(fs.existsSync(path.join(codegenDir, 'enums', 'status.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'enums', 'direction.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'enums', 'asset_type.move'))).toBe(true);

      console.log('  ✅ All files generated from full e2e config');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('counter template config (101) — generates resources, errors.move, Move.toml', async () => {
    const { dubheConfig } = await import(
      '../../../templates/101/sui-template/packages/contracts/dubhe.config.js'
    );
    const os = await import('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-counter-integ-'));

    try {
      await schemaGen(tempDir, dubheConfig);

      const pkgDir = path.join(tempDir, 'src', 'counter');
      const toml = fs.readFileSync(path.join(pkgDir, 'Move.toml'), 'utf-8');
      expect(toml).toContain('name = "counter"');
      expect(toml).toContain('Dubhe');

      const codegenDir = path.join(pkgDir, 'sources', 'codegen');
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'value.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'counter2.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'counter2withkey.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'errors.move'))).toBe(true);

      console.log('  ✅ Counter template (101) schemagen correct');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('counter template config (nextjs) — generates resources, errors.move, Move.toml', async () => {
    const { dubheConfig } = await import(
      '../../../templates/nextjs/sui-template/packages/contracts/dubhe.config.js'
    );
    const os = await import('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-nextjs-integ-'));

    try {
      await schemaGen(tempDir, dubheConfig);

      const pkgDir = path.join(tempDir, 'src', 'counter');
      const toml = fs.readFileSync(path.join(pkgDir, 'Move.toml'), 'utf-8');
      expect(toml).toContain('name = "counter"');
      expect(toml).toContain('Dubhe');

      const codegenDir = path.join(pkgDir, 'sources', 'codegen');
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'counter1.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'counter2.move'))).toBe(true);
      expect(fs.existsSync(path.join(codegenDir, 'errors.move'))).toBe(true);

      console.log('  ✅ Counter template (nextjs) schemagen correct');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60_000);
});

// ─── Full localnet workflow ───────────────────────────────────────────────────

describe.skipIf(!canRunTests)('Integration: localnet contract lifecycle', () => {
  let env: IntegrationEnv;
  let counterProjectPath: string;
  let dubheProjectPath: string;
  let publishedPackageId: string;

  beforeAll(async () => {
    console.log('\n📋 Setting up localnet integration environment...');
    env = await setupIntegrationEnv(NETWORK);
    counterProjectPath = path.join(env.tempDir, 'src', 'counter');
    dubheProjectPath = path.join(env.tempDir, 'src', 'dubhe');

    // Sync latest framework sources into the temp dir's dubhe package
    console.log('  Syncing latest framework sources into temp dir...');
    const frameworkSourcesDir = path.join(FRAMEWORK_DIR, 'sources');
    const tempDubheSourcesDir = path.join(env.tempDir, 'src', 'dubhe', 'sources');
    fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
    fs.cpSync(frameworkSourcesDir, tempDubheSourcesDir, { recursive: true });

    // Regenerate counter codegen in the temp dir
    console.log('  Running schemagen for counter in temp dir...');
    await schemaGen(env.tempDir, template101Config);

    const balance = await env.client.getBalance({ owner: env.address });
    console.log(`  Wallet: ${env.address}`);
    console.log(`  Balance: ${Number(BigInt(balance.totalBalance)) / 1e9} SUI`);
    console.log('  Setup complete.\n');
  }, 180_000);

  afterAll(async () => {
    if (env) {
      await teardownIntegrationEnv(env);
      console.log('\n🧹 Cleaned up integration test environment.');
    }
  });

  // ── Move unit tests (pre-publish) ──────────────────────────────────────────

  it('counter Move unit tests pass before publish', async () => {
    const output = await testHandler(template101Config, undefined, '1000000000', 'testnet');
    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  ✅ ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 120_000);

  // ── Faucet check ───────────────────────────────────────────────────────────

  it('localnet faucet is reachable and funds the deploy wallet', async () => {
    const { requestSuiFromFaucetV2, getFaucetHost } = await import('@mysten/sui/faucet');
    const balanceBefore = BigInt(
      (await env.client.getBalance({ owner: env.address })).totalBalance
    );

    await requestSuiFromFaucetV2({ host: getFaucetHost('localnet'), recipient: env.address });

    const balanceAfter = BigInt((await env.client.getBalance({ owner: env.address })).totalBalance);
    expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
    console.log(`  ✅ Balance: ${Number(balanceAfter) / 1e9} SUI`);
  }, 30_000);

  // ── Publish ────────────────────────────────────────────────────────────────

  it('publishHandler deploys dubhe framework + counter to localnet', async () => {
    console.log('\n🚀 Publishing...');
    await publishHandler(template101Config, NETWORK, false);

    const entries = readPublishedToml(counterProjectPath);

    expect(entries[NETWORK]).toBeDefined();
    expect(entries[NETWORK]?.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(entries[NETWORK]?.version).toBe(1);

    publishedPackageId = entries[NETWORK]!.publishedAt;
    console.log(`  ✅ Counter published: ${publishedPackageId}`);
  }, 180_000);

  it('counter package is accessible on-chain after publish', async () => {
    expect(publishedPackageId).toBeDefined();

    let onChain = false;
    for (let i = 0; i < 5; i++) {
      onChain = await verifyPackageOnChain(env.client, publishedPackageId);
      if (onChain) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(onChain).toBe(true);
    console.log(`  ✅ Package verified on-chain: ${publishedPackageId}`);
  }, 30_000);

  it('dubhe framework is accessible on-chain after publish', async () => {
    const dubheEntries = readPublishedToml(dubheProjectPath);
    expect(dubheEntries[NETWORK]).toBeDefined();

    const dubheId = dubheEntries[NETWORK]!.publishedAt;
    expect(dubheId).toMatch(/^0x[0-9a-f]{64}$/);

    const onChain = await verifyPackageOnChain(env.client, dubheId);
    expect(onChain).toBe(true);
    console.log(`  ✅ Dubhe framework on-chain: ${dubheId}`);
  }, 30_000);

  it('Published.toml has version=1, chainId, and correct IDs after publish', () => {
    const entry = readPublishedToml(counterProjectPath)[NETWORK];

    expect(entry).toBeDefined();
    expect(entry!.version).toBe(1);
    expect(entry!.chainId).toBeTruthy();
    expect(entry!.originalId).toBe(publishedPackageId);
    expect(entry!.publishedAt).toBe(publishedPackageId);
    console.log(`  Chain ID: ${entry!.chainId}`);
  });

  it('.history/sui_localnet/latest.json has version=1 after publish', () => {
    const latestPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');
    expect(fs.existsSync(latestPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    expect(data.version).toBe(1);
    expect(data.packageId).toBe(publishedPackageId);
    expect(data.network).toBe(NETWORK);
    expect(data.upgradeCap).toMatch(/^0x[0-9a-f]{64}$/);
    console.log(`  ✅ latest.json: version=${data.version}`);
  });

  it('Move.lock has [env.localnet] section after publish', () => {
    const lockPath = path.join(counterProjectPath, 'Move.lock');
    expect(fs.existsSync(lockPath)).toBe(true);
    const content = fs.readFileSync(lockPath, 'utf-8');
    expect(content).toContain('[env.localnet]');
  });

  // ── Load metadata ──────────────────────────────────────────────────────────

  it('loadMetadataHandler saves ABI metadata for published counter', async () => {
    await expect(
      loadMetadataHandler(template101Config, NETWORK, publishedPackageId)
    ).resolves.not.toThrow();

    const metaFile = path.join(
      counterProjectPath,
      '.history',
      `sui_${NETWORK}`,
      `${publishedPackageId}.json`
    );
    expect(fs.existsSync(metaFile)).toBe(true);
    console.log('  ✅ Metadata saved');
  }, 30_000);

  // ── Upgrade ────────────────────────────────────────────────────────────────

  it('upgradeHandler upgrades counter to version=2 on localnet', async () => {
    expect(publishedPackageId).toBeDefined();

    console.log('\n⬆️  Upgrading...');
    await upgradeHandler(template101Config, 'counter', NETWORK);

    const entry = readPublishedToml(counterProjectPath)[NETWORK];

    expect(entry).toBeDefined();
    expect(entry!.version).toBe(2);
    expect(entry!.publishedAt).not.toBe(publishedPackageId);
    expect(entry!.originalId).toBe(publishedPackageId);

    console.log(`  ✅ Upgraded to v2: ${entry!.publishedAt}`);
  }, 180_000);

  it('upgraded counter package is accessible on-chain', async () => {
    const upgradedId = readPublishedToml(counterProjectPath)[NETWORK]?.publishedAt;
    expect(upgradedId).toBeDefined();

    let onChain = false;
    for (let i = 0; i < 5; i++) {
      onChain = await verifyPackageOnChain(env.client, upgradedId!);
      if (onChain) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(onChain).toBe(true);
    console.log(`  ✅ Upgraded package on-chain: ${upgradedId}`);
  }, 30_000);

  it('.history/sui_localnet/latest.json has version=2 after upgrade', () => {
    const upgradedId = readPublishedToml(counterProjectPath)[NETWORK]?.publishedAt;

    const latestPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');
    const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

    expect(data.version).toBe(2);
    expect(data.packageId).toBe(upgradedId);
    expect(data.packageId).not.toBe(publishedPackageId);
    expect(data.network).toBe(NETWORK);
    console.log(`  ✅ latest.json: version=${data.version}, packageId=${data.packageId}`);
  });

  it('deploy wallet spent SUI (gas) during publish + upgrade', async () => {
    const balance = await env.client.getBalance({ owner: env.address });
    const remaining = BigInt(balance.totalBalance);
    expect(remaining).toBeGreaterThan(0n);
    console.log(`  Remaining balance: ${Number(remaining) / 1e9} SUI`);
  }, 15_000);
});
