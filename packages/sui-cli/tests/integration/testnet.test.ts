/**
 * Testnet Integration Tests
 *
 * ⚠️  ALL TESTS IN THIS FILE ARE CURRENTLY SKIPPED.
 *
 * These tests will be enabled once:
 *   1. The Dubhe framework has been published to testnet at a stable address
 *   2. A funded test wallet is available (via .env TESTNET_PRIVATE_KEY)
 *   3. The contract publish/upgrade flow has been validated on localnet
 *
 * To enable: replace `it.skip` with `it`, and ensure TESTNET_PRIVATE_KEY is set in .env
 *
 * Run (when enabled):
 *   pnpm test:testnet
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'path';
import {
  isNetworkReachable,
  setupIntegrationEnv,
  teardownIntegrationEnv,
  verifyPackageOnChain,
  type IntegrationEnv
} from './setup';
import { readPublishedToml } from '../../src/utils/utils';

vi.mock('../../src/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/utils')>();
  return {
    ...actual,
    switchEnv: vi.fn().mockResolvedValue(undefined)
  };
});

const NETWORK = 'testnet' as const;

// Well-known Dubhe testnet package ID (update when a new version is deployed)
export const DUBHE_TESTNET_PACKAGE_ID =
  '0x8817b4976b6c607da01cea49d728f71d09274c82e9b163fa20c2382586f8aefc';

let env: IntegrationEnv;
let publishedPackageId: string;

// ────────────────────────────────────────────────────────────────────────────
// Testnet Deploy & Upgrade (ALL SKIPPED)
// ────────────────────────────────────────────────────────────────────────────

describe('Testnet Deploy & Upgrade', () => {
  beforeAll(async () => {
    // Skip setup entirely since all tests are skipped
  });

  afterAll(async () => {
    if (env) {
      await teardownIntegrationEnv(env);
    }
  });

  it.skip('should verify Dubhe framework is deployed on testnet', async () => {
    // TODO: enable when testnet is stable
    env = await setupIntegrationEnv(NETWORK);

    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    const onChain = await verifyPackageOnChain(client, DUBHE_TESTNET_PACKAGE_ID);
    expect(onChain).toBe(true);
  }, 30_000);

  it.skip('should publish counter contract to testnet', async () => {
    // TODO: enable when testnet deployment is ready
    // Requires TESTNET_PRIVATE_KEY env var with funded testnet wallet
    env = await setupIntegrationEnv(NETWORK);

    const { publishHandler } = await import('../../src/utils/publishHandler');
    const { dubheConfig } = await import(path.join(env.tempDir, 'dubhe.config'));

    await publishHandler(dubheConfig, NETWORK, false);

    const counterProjectPath = path.join(env.tempDir, 'src', 'counter');
    const entries = readPublishedToml(counterProjectPath);
    expect(entries[NETWORK]).toBeDefined();
    expect(entries[NETWORK]?.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);

    publishedPackageId = entries[NETWORK]!.publishedAt;
    console.log(`  ✅ Published counter on testnet: ${publishedPackageId}`);
  }, 120_000);

  it.skip('should have counter package accessible on testnet after publish', async () => {
    // TODO: enable after publish test passes
    expect(publishedPackageId).toBeDefined();

    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    const onChain = await verifyPackageOnChain(client, publishedPackageId);
    expect(onChain).toBe(true);
  }, 30_000);

  it.skip('Published.toml should contain testnet chain-id after publish', () => {
    // TODO: enable after publish test passes
    const counterProjectPath = path.join(env.tempDir, 'src', 'counter');
    const entries = readPublishedToml(counterProjectPath);
    const entry = entries[NETWORK];

    expect(entry).toBeDefined();
    expect(entry!.chainId).toBeTruthy();
    expect(entry!.version).toBe(1);
    // Testnet chain ID is fixed
    expect(entry!.chainId).toBe('4c78adac');
  });

  it.skip('should upgrade counter contract on testnet', async () => {
    // TODO: enable after publish test passes
    expect(publishedPackageId).toBeDefined();

    const { upgradeHandler } = await import('../../src/utils/upgradeHandler');
    const { dubheConfig } = await import(
      /* @vite-ignore */ path.join(env.tempDir, 'dubhe.config') + '?t=' + Date.now()
    );

    await upgradeHandler(dubheConfig, 'counter', NETWORK);

    const counterProjectPath = path.join(env.tempDir, 'src', 'counter');
    const entries = readPublishedToml(counterProjectPath);
    expect(entries[NETWORK]?.version).toBe(2);
    expect(entries[NETWORK]?.originalId).toBe(publishedPackageId);
  }, 120_000);
});

// ────────────────────────────────────────────────────────────────────────────
// Testnet Read-Only Tests (no wallet needed, verify existing deployments)
// ────────────────────────────────────────────────────────────────────────────

describe('Testnet Read-Only Verification', () => {
  it.skip('should verify Dubhe framework modules exist on testnet', async () => {
    // TODO: enable when ready
    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

    const modules = await client.getNormalizedMoveModulesByPackage({
      package: DUBHE_TESTNET_PACKAGE_ID
    });
    const moduleNames = Object.keys(modules);
    expect(moduleNames.length).toBeGreaterThan(0);
    expect(moduleNames).toContain('dapp_service');
    console.log(`  Dubhe modules on testnet: ${moduleNames.join(', ')}`);
  }, 30_000);

  it.skip('should verify testnet RPC is reachable', async () => {
    // TODO: enable when ready
    const reachable = isNetworkReachable(NETWORK);
    expect(reachable).toBe(true);
  });
});
