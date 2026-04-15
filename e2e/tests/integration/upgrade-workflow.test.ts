/**
 * Upgrade workflow integration tests
 *
 * Covers the following scenarios on localnet:
 *
 *   Suite 1 — Framework upgrade + codegen backward compat
 *     1. Publish dubhe framework + counter (template101)
 *     2. Upgrade the dubhe framework (code-only, no schema changes)
 *     3. Verify counter v1 is still accessible after framework upgrade
 *     4. Upgrade counter using the new dubhe v2 (system code change, no new resources)
 *
 *   Suite 2 — Codegen upgrade with new resource (schema migration)
 *     1. Publish dubhe framework + counter (template101)
 *     2. Add a new `score` resource to the counter config and re-run generate
 *     3. Upgrade counter — detects pending migration, generates migrate_to_v2,
 *        calls on-chain migrate::migrate_to_v2 to register the new package ID
 *     4. Verify counter v2 is on-chain and latest.json reflects the new resource
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
import { schemaGen } from '@0xobelisk/sui-common';
import { publishHandler } from '../../../packages/sui-cli/src/utils/publishHandler.js';
import { upgradeHandler } from '../../../packages/sui-cli/src/utils/upgradeHandler.js';
import { readPublishedToml } from '../../../packages/sui-cli/src/utils/utils.js';
import { dubheConfig as template101Config } from '../../../templates/101/sui-template/packages/contracts/dubhe.config.js';
import type { DubheConfig } from '@0xobelisk/sui-common';
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

const NETWORK = 'localnet' as const;
const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

// ─── Minimal config used to upgrade the dubhe framework (no schema changes) ──
//
// publishDubheFramework() saves history with resources: {}, so pendingMigration
// will always be empty — this is a pure binary upgrade.
const frameworkConfig: DubheConfig = {
  name: 'dubhe',
  description: 'Dubhe Protocol',
  resources: {}
};

// ─── Suite 1: Framework upgrade + codegen backward compat ─────────────────────

describe.skipIf(!canRunTests)(
  'Integration: framework upgrade + codegen backward compatibility',
  () => {
    let env: IntegrationEnv;
    let counterProjectPath: string;
    let dubheProjectPath: string;
    let publishedCounterPackageId: string;
    let publishedDubhePackageId: string;

    beforeAll(async () => {
      console.log('\n📋 [Suite 1] Setting up localnet integration environment...');
      env = await setupIntegrationEnv(NETWORK);
      counterProjectPath = path.join(env.tempDir, 'src', 'counter');
      dubheProjectPath = path.join(env.tempDir, 'src', 'dubhe');

      // Sync latest framework sources into the temp dir's dubhe package
      console.log('  Syncing latest framework sources into temp dir...');
      const frameworkSourcesDir = path.join(FRAMEWORK_DIR, 'sources');
      const tempDubheSourcesDir = path.join(dubheProjectPath, 'sources');
      fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
      fs.cpSync(frameworkSourcesDir, tempDubheSourcesDir, { recursive: true });

      // Regenerate counter codegen in the temp dir (picks up migrate() fix)
      console.log('  Running generate for counter in temp dir...');
      await schemaGen(env.tempDir, template101Config);

      console.log('  Publishing dubhe + counter to localnet...');
      await publishHandler(template101Config, NETWORK, false);

      const counterEntries = readPublishedToml(counterProjectPath);
      const dubheEntries = readPublishedToml(dubheProjectPath);

      publishedCounterPackageId = counterEntries[NETWORK]!.publishedAt;
      publishedDubhePackageId = dubheEntries[NETWORK]!.publishedAt;

      console.log(`  Counter v1: ${publishedCounterPackageId}`);
      console.log(`  Dubhe  v1: ${publishedDubhePackageId}`);
      console.log('  Setup complete.\n');
    }, 300_000);

    afterAll(async () => {
      if (env) {
        await teardownIntegrationEnv(env);
        console.log('\n🧹 [Suite 1] Cleaned up integration test environment.');
      }
    });

    // ── Framework upgrade ─────────────────────────────────────────────────────

    it('upgradeHandler upgrades dubhe framework to version=2', async () => {
      console.log('\n⬆️  [Suite 1] Upgrading dubhe framework...');
      await upgradeHandler(frameworkConfig, 'dubhe', NETWORK);

      const entry = readPublishedToml(dubheProjectPath)[NETWORK];
      expect(entry).toBeDefined();
      expect(entry!.version).toBe(2);
      expect(entry!.publishedAt).not.toBe(publishedDubhePackageId);
      expect(entry!.originalId).toBe(publishedDubhePackageId);

      console.log(`  ✅ Dubhe upgraded to v2: ${entry!.publishedAt}`);
    }, 180_000);

    it('dubhe v2 package is accessible on-chain', async () => {
      const dubheEntry = readPublishedToml(dubheProjectPath)[NETWORK];
      expect(dubheEntry).toBeDefined();

      let onChain = false;
      for (let i = 0; i < 5; i++) {
        onChain = await verifyPackageOnChain(env.client, dubheEntry!.publishedAt);
        if (onChain) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect(onChain).toBe(true);
      console.log(`  ✅ Dubhe v2 on-chain: ${dubheEntry!.publishedAt}`);
    }, 30_000);

    it('.history/sui_localnet/latest.json for dubhe has version=2', () => {
      const latestPath = path.join(dubheProjectPath, '.history', 'sui_localnet', 'latest.json');
      expect(fs.existsSync(latestPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
      expect(data.version).toBe(2);
      expect(data.network).toBe(NETWORK);
      console.log(`  ✅ latest.json: dubhe version=${data.version}`);
    });

    // ── Counter backward compat ───────────────────────────────────────────────

    it('counter v1 modules remain accessible on-chain after framework upgrade', async () => {
      // The counter package compiled against dubhe v1 should still be valid after
      // framework upgrade — on Sui, old package versions stay on-chain forever.
      let onChain = false;
      for (let i = 0; i < 5; i++) {
        onChain = await verifyPackageOnChain(env.client, publishedCounterPackageId);
        if (onChain) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect(onChain).toBe(true);

      const counterEntry = readPublishedToml(counterProjectPath)[NETWORK];
      expect(counterEntry!.version).toBe(1);
      console.log(`  ✅ Counter v1 still accessible: ${publishedCounterPackageId}`);
    }, 30_000);

    // ── Counter upgrade against dubhe v2 (system code change only) ───────────

    it('counter upgrades to v2 (system code change, no schema migration) against dubhe v2', async () => {
      // Simulate a system code change by appending a comment to the counter system file.
      // upgradeHandler reads the latest dubhe entry from Published.toml and builds
      // counter against dubhe v2 via the ephemeral pubfile.
      const counterSystemPath = path.join(counterProjectPath, 'sources', 'systems', 'counter.move');
      expect(fs.existsSync(counterSystemPath)).toBe(true);
      const original = fs.readFileSync(counterSystemPath, 'utf-8');
      fs.writeFileSync(counterSystemPath, original + '\n// System updated in upgrade test\n');

      console.log('\n⬆️  [Suite 1] Upgrading counter (system code change)...');
      await upgradeHandler(template101Config, 'counter', NETWORK);

      const entry = readPublishedToml(counterProjectPath)[NETWORK];
      expect(entry).toBeDefined();
      expect(entry!.version).toBe(2);
      expect(entry!.publishedAt).not.toBe(publishedCounterPackageId);
      expect(entry!.originalId).toBe(publishedCounterPackageId);

      console.log(`  ✅ Counter upgraded to v2: ${entry!.publishedAt}`);
    }, 180_000);

    it('counter v2 package is accessible on-chain', async () => {
      const entry = readPublishedToml(counterProjectPath)[NETWORK];
      expect(entry).toBeDefined();

      let onChain = false;
      for (let i = 0; i < 5; i++) {
        onChain = await verifyPackageOnChain(env.client, entry!.publishedAt);
        if (onChain) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect(onChain).toBe(true);
      console.log(`  ✅ Counter v2 on-chain: ${entry!.publishedAt}`);
    }, 30_000);

    it('.history/sui_localnet/latest.json for counter has version=2, no schema migration', () => {
      const counterEntry = readPublishedToml(counterProjectPath)[NETWORK];
      const latestPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');
      const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

      expect(data.version).toBe(2);
      expect(data.packageId).toBe(counterEntry!.publishedAt);
      expect(data.network).toBe(NETWORK);
      // All original resources must still be present — no new ones were added
      expect(data.resources).toHaveProperty('value');
      // dappStorageId must be preserved across upgrades
      expect(typeof data.dappStorageId).toBe('string');
      expect(data.dappStorageId).toMatch(/^0x[0-9a-f]{64}$/);
      console.log(`  ✅ latest.json: counter version=${data.version}`);
      console.log(`  ✅ dappStorageId: ${data.dappStorageId}`);
    });
  }
);

// ─── Suite 2: Codegen upgrade with new resource + schema migration ─────────────

describe.skipIf(!canRunTests)(
  'Integration: codegen upgrade with new resource (schema migration)',
  () => {
    let env: IntegrationEnv;
    let counterProjectPath: string;
    let publishedCounterPackageId: string;

    // counter config with an extra `score` resource to trigger pendingMigration
    const updatedCounterConfig: DubheConfig = {
      ...template101Config,
      resources: {
        ...template101Config.resources,
        score: {
          global: true,
          fields: { value: 'u64' }
        }
      }
    };

    beforeAll(async () => {
      console.log('\n📋 [Suite 2] Setting up localnet integration environment...');
      env = await setupIntegrationEnv(NETWORK);
      counterProjectPath = path.join(env.tempDir, 'src', 'counter');
      const dubheProjectPath = path.join(env.tempDir, 'src', 'dubhe');

      // Sync latest framework sources into the temp dir's dubhe package
      console.log('  Syncing latest framework sources into temp dir...');
      const frameworkSourcesDir = path.join(FRAMEWORK_DIR, 'sources');
      const tempDubheSourcesDir = path.join(dubheProjectPath, 'sources');
      fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
      fs.cpSync(frameworkSourcesDir, tempDubheSourcesDir, { recursive: true });

      // Regenerate counter codegen (original resources only)
      console.log('  Running generate for counter in temp dir...');
      await schemaGen(env.tempDir, template101Config);

      console.log('  Publishing dubhe + counter to localnet...');
      await publishHandler(template101Config, NETWORK, false);

      const counterEntries = readPublishedToml(counterProjectPath);
      publishedCounterPackageId = counterEntries[NETWORK]!.publishedAt;

      console.log(`  Counter v1: ${publishedCounterPackageId}`);
      console.log('  Setup complete.\n');
    }, 300_000);

    afterAll(async () => {
      if (env) {
        await teardownIntegrationEnv(env);
        console.log('\n🧹 [Suite 2] Cleaned up integration test environment.');
      }
    });

    // ── Re-run generate with the updated config ──────────────────────────────

    it('generate regenerates codegen with new score resource', async () => {
      console.log('\n🔄 [Suite 2] Re-running generate with score resource...');
      await schemaGen(env.tempDir, updatedCounterConfig);

      const codegenDir = path.join(counterProjectPath, 'sources', 'codegen');

      // Original resources still present
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'value.move'))).toBe(true);
      // New resource generated
      expect(fs.existsSync(path.join(codegenDir, 'resources', 'score.move'))).toBe(true);
      // genesis.move has migrate() with separator comments (fix from generateGenesis.ts)
      const genesisContent = fs.readFileSync(path.join(codegenDir, 'genesis.move'), 'utf-8');
      expect(genesisContent).toContain('fun migrate(');
      expect(genesisContent).toContain('// ==========================================');

      console.log('  ✅ generate produced score.move and genesis.move with migrate()');
    }, 60_000);

    // ── Upgrade with schema migration ─────────────────────────────────────────

    it('upgradeHandler upgrades counter to v2 with schema migration (new score resource)', async () => {
      console.log('\n⬆️  [Suite 2] Upgrading counter with new score resource...');
      await upgradeHandler(updatedCounterConfig, 'counter', NETWORK);

      const entry = readPublishedToml(counterProjectPath)[NETWORK];
      expect(entry).toBeDefined();
      expect(entry!.version).toBe(2);
      expect(entry!.publishedAt).not.toBe(publishedCounterPackageId);
      expect(entry!.originalId).toBe(publishedCounterPackageId);

      console.log(`  ✅ Counter upgraded to v2: ${entry!.publishedAt}`);
    }, 180_000);

    it('counter v2 package is accessible on-chain after migration', async () => {
      const entry = readPublishedToml(counterProjectPath)[NETWORK];
      expect(entry).toBeDefined();

      let onChain = false;
      for (let i = 0; i < 5; i++) {
        onChain = await verifyPackageOnChain(env.client, entry!.publishedAt);
        if (onChain) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect(onChain).toBe(true);
      console.log(`  ✅ Counter v2 on-chain: ${entry!.publishedAt}`);
    }, 30_000);

    it('.history/sui_localnet/latest.json has version=2 and includes score resource', () => {
      const counterEntry = readPublishedToml(counterProjectPath)[NETWORK];
      const latestPath = path.join(counterProjectPath, '.history', 'sui_localnet', 'latest.json');

      expect(fs.existsSync(latestPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

      expect(data.version).toBe(2);
      expect(data.packageId).toBe(counterEntry!.publishedAt);
      expect(data.network).toBe(NETWORK);
      // The new resource must be recorded in the deployment history
      expect(data.resources).toHaveProperty('score');
      // Original resources must remain
      expect(data.resources).toHaveProperty('value');
      // dappStorageId must be set — required for migrate_to_vN transactions
      expect(typeof data.dappStorageId).toBe('string');
      expect(data.dappStorageId).toMatch(/^0x[0-9a-f]{64}$/);

      console.log(`  ✅ latest.json: version=${data.version}, score resource recorded`);
      console.log(`  ✅ dappStorageId: ${data.dappStorageId}`);
    });

    it('migrate_to_v2 was generated in migrate.move before the upgrade build', () => {
      // appendMigrateFunction writes migrate_to_v2 to migrate.move in-place and also
      // bumps ON_CHAIN_VERSION to 2 so on_chain_version() returns the correct value.
      // Verify the function exists, calls upgrade_dapp, and no longer has the old
      // unused _new_package_id / _new_version placeholder parameters.
      const migratePath = path.join(counterProjectPath, 'sources', 'scripts', 'migrate.move');
      expect(fs.existsSync(migratePath)).toBe(true);

      const content = fs.readFileSync(migratePath, 'utf-8');
      expect(content).toContain('migrate_to_v2');
      // ON_CHAIN_VERSION must have been bumped to 2
      expect(content).toMatch(/ON_CHAIN_VERSION:\s*u32\s*=\s*2\s*;/);
      // upgrade_dapp must be called to register the new package ID + version
      expect(content).toContain('upgrade_dapp');
      // New package ID must be sourced from dapp_key::package_id()
      expect(content).toContain('dapp_key::package_id()');
      // genesis::migrate must still be called for the custom-logic extension point
      expect(content).toContain('genesis::migrate');
      // Old unused placeholder parameters must be gone
      expect(content).not.toContain('_new_package_id');
      expect(content).not.toContain('_new_version');
      // The function signature must accept dapp_storage
      expect(content).toContain('dapp_storage: &mut dubhe::dapp_service::DappStorage');

      console.log('  ✅ migrate_to_v2 generated in migrate.move with upgrade_dapp call');
    });

    it('Move.lock exists and is a valid Move lock file after schema migration upgrade', () => {
      // Note: the upgrade build regenerates Move.lock in the [pinned.testnet.*] format,
      // which does NOT contain an [env.localnet] section. Version tracking after upgrade
      // is handled by Published.toml and .history/latest.json (already verified above).
      const lockPath = path.join(counterProjectPath, 'Move.lock');
      expect(fs.existsSync(lockPath)).toBe(true);
      const content = fs.readFileSync(lockPath, 'utf-8');
      expect(content).toContain('[move]');
      console.log('  ✅ Move.lock exists and is a valid lock file');
    });
  }
);
