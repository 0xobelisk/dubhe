/**
 * Schemagen tests for global: true resources.
 *
 * A global resource stores data in the DApp-scoped DappStorage object (one per DApp).
 * This is a singleton-per-DApp pattern.
 *
 * Key differences from non-global resources:
 *   - Uses DappStorage instead of UserStorage
 *   - No resource_account parameter in any function signature
 *   - dapp_hub parameter is NOT included in write functions (fees read from DappStorage)
 *   - offchain and global are independent flags (both can be set simultaneously)
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  runSchemaGen,
  cleanupDir,
  readGenerated,
  assertContains,
  assertNotContains,
  defineConfig
} from './helpers.js';
import type { SchemaGenResult } from './helpers.js';

// ─── Simple global resource (no explicit keys, single value) ─────────────────

describe('Schemagen: global resource — no explicit keys', () => {
  let result: SchemaGenResult;

  beforeAll(async () => {
    result = await runSchemaGen(
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          game_config: {
            global: true,
            fields: { max_players: 'u32', version: 'u64' }
          }
        }
      })
    );
  }, 60_000);

  afterAll(() => cleanupDir(result.tempDir));

  it('generates game_config.move', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_config.move');
    expect(content).toContain('module mygame::game_config');
  });

  it('no resource_account parameter in any function', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_config.move');
    assertNotContains(
      content,
      'resource_account',
      'global resource must not expose resource_account param'
    );
  });

  it('uses DappStorage as storage type (not UserStorage)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_config.move');
    assertContains(content, 'dapp_storage: &DappStorage');
    assertNotContains(
      content,
      'UserStorage',
      'global resource must use DappStorage, not UserStorage'
    );
  });

  it('has/ensure_has/delete functions are generated (not offchain)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_config.move');
    assertContains(content, 'public fun has(');
    assertContains(content, 'public fun ensure_has(');
    assertContains(content, 'fun delete(');
  });

  it('get/set generated with DappStorage param (singleton signature)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_config.move');
    assertContains(content, 'public fun get_max_players(dapp_storage: &DappStorage)');
    // set_* no longer includes dapp_hub; fees are read from DappStorage directly
    assertContains(content, 'fun set_max_players(dapp_storage: &mut DappStorage');
  });
});

// ─── Global resource with explicit keys ──────────────────────────────────────

describe('Schemagen: global resource — with explicit keys', () => {
  let result: SchemaGenResult;

  beforeAll(async () => {
    result = await runSchemaGen(
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          asset: {
            global: true,
            fields: { asset_id: 'u64', name: 'String', supply: 'u256' },
            keys: ['asset_id']
          }
        }
      })
    );
  }, 60_000);

  afterAll(() => cleanupDir(result.tempDir));

  it('no resource_account parameter — still global', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'asset.move');
    assertNotContains(content, 'resource_account');
  });

  it('asset_id key is in function signatures', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'asset.move');
    assertContains(content, 'asset_id: u64');
  });

  it('key_tuple includes TABLE_NAME and asset_id', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'asset.move');
    assertContains(content, 'TABLE_NAME');
    assertContains(content, 'to_bytes(&asset_id)');
  });
});

// ─── Global + offchain are independent flags ──────────────────────────────────

describe('Schemagen: global + offchain resource — independent flags', () => {
  let result: SchemaGenResult;

  beforeAll(async () => {
    result = await runSchemaGen(
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          game_event: {
            global: true,
            offchain: true,
            fields: { event_type: 'u32', payload: 'vector<u8>' }
          }
        }
      })
    );
  }, 60_000);

  afterAll(() => cleanupDir(result.tempDir));

  it('OFFCHAIN constant is true', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_event.move');
    assertContains(content, 'OFFCHAIN: bool = true');
  });

  it('no resource_account parameter (global)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_event.move');
    assertNotContains(content, 'resource_account');
  });

  it('uses DappStorage as storage type (global + offchain)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_event.move');
    assertContains(content, 'DappStorage');
    assertNotContains(content, 'UserStorage');
  });

  it('read functions (has/get/delete) are suppressed by offchain flag', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_event.move');
    assertNotContains(content, 'public fun has(');
    assertNotContains(content, 'public fun get(');
    assertNotContains(content, 'fun delete(');
  });

  it('set is still generated (write-only offchain pattern)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'game_event.move');
    assertContains(content, 'fun set(');
  });
});

// ─── Non-global resource still requires resource_account ─────────────────────

describe('Schemagen: non-global resource — resource_account param present', () => {
  let result: SchemaGenResult;

  beforeAll(async () => {
    result = await runSchemaGen(
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          player_state: {
            fields: { hp: 'u32', score: 'u64' }
          }
        }
      })
    );
  }, 60_000);

  afterAll(() => cleanupDir(result.tempDir));

  it('uses UserStorage as storage type (not DappStorage)', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'player_state.move');
    assertContains(content, 'user_storage: &UserStorage');
    assertNotContains(content, 'DappStorage', 'non-global resource must use UserStorage');
  });

  it('no resource_account parameter — per-user storage model', () => {
    const content = readGenerated(result.codegenDir, 'resources', 'player_state.move');
    assertNotContains(content, 'resource_account');
  });
});
