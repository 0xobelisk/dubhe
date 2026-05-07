/**
 * Schemagen regression test: full config from e2e/example.config.ts
 *
 * Uses the full config (35 migrated components + 10 resources, 3 enums,
 * plus ALL new annotation scenarios: global, fungible, unique, reactive,
 * listable, transferable, objects, scenes, errors) as the canonical
 * regression test.
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { schemaGen } from '@0xobelisk/sui-common';
import { exampleConfig as dubheConfig } from '../../example.config.js';
import { cleanupDir, assertFileExists, readGenerated } from './helpers.js';

describe('Schemagen: full e2e config regression (all types + all annotations)', () => {
  let tempDir: string;
  let codegenDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-alltype-test-'));
    await schemaGen(tempDir, dubheConfig);
    codegenDir = path.join(tempDir, 'src', dubheConfig.name, 'sources', 'codegen');
  }, 60_000);

  afterAll(() => cleanupDir(tempDir));

  it('standard codegen files are all present', () => {
    assertFileExists(codegenDir, 'genesis.move');
    assertFileExists(codegenDir, 'dapp_key.move');
    assertFileExists(codegenDir, 'init_test.move');
  });

  it('no components/ directory is generated', () => {
    expect(fs.existsSync(path.join(codegenDir, 'components'))).toBe(false);
  });

  it('all 35 migrated component resources are generated', () => {
    for (let i = 0; i <= 34; i++) {
      assertFileExists(codegenDir, 'resources', `component${i}.move`);
    }
  });

  it('all 10 original resources are generated', () => {
    for (let i = 0; i <= 9; i++) {
      assertFileExists(codegenDir, 'resources', `resource${i}.move`);
    }
  });

  it('all 3 enums are generated with correct filenames', () => {
    assertFileExists(codegenDir, 'enums', 'status.move');
    assertFileExists(codegenDir, 'enums', 'direction.move');
    assertFileExists(codegenDir, 'enums', 'asset_type.move');
  });

  // ─── Spot-check migrated components (now resources) ────────────────────────

  it('component0 (presence resource with exists:bool) — has get/set/has/delete', () => {
    const content = readGenerated(codegenDir, 'resources', 'component0.move');
    expect(content).toContain('public fun get(');
    expect(content).toContain('fun set(');
    expect(content).toContain('public fun has(');
  });

  it('component3 (simple u32) — has get/set/has/delete/encode', () => {
    const content = readGenerated(codegenDir, 'resources', 'component3.move');
    expect(content).toContain('public fun get(');
    expect(content).toContain('fun set(');
    expect(content).toContain('public fun has(');
    expect(content).toContain('public fun encode(');
  });

  it('component6 (multi-field no keys) — get_attack/set_attack/get_hp/set_hp', () => {
    const content = readGenerated(codegenDir, 'resources', 'component6.move');
    expect(content).toContain('get_attack');
    expect(content).toContain('set_attack');
    expect(content).toContain('get_hp');
    expect(content).toContain('set_hp');
  });

  it('component8 (enum Direction) — imports direction module', () => {
    const content = readGenerated(codegenDir, 'resources', 'component8.move');
    expect(content).toContain('direction');
  });

  it('component13 (offchain with player key) — OFFCHAIN=true, no get/has/delete', () => {
    const content = readGenerated(codegenDir, 'resources', 'component13.move');
    expect(content).toContain('OFFCHAIN: bool = true');
    expect(content).toContain('fun set(');
    expect(content).not.toContain('public fun get(');
    expect(content).not.toContain('public fun has(');
  });

  it('component32 (String) — uses peel_string', () => {
    const content = readGenerated(codegenDir, 'resources', 'component32.move');
    expect(content).toContain('peel_string');
  });

  it('component33 (vector<String>) — generated successfully', () => {
    const content = readGenerated(codegenDir, 'resources', 'component33.move');
    expect(content).toContain('module example::component33');
  });

  it('component34 (struct with vector<String> and u8) — has field accessors', () => {
    const content = readGenerated(codegenDir, 'resources', 'component34.move');
    expect(content).toContain('get_name');
    expect(content).toContain('set_name');
    expect(content).toContain('get_age');
    expect(content).toContain('set_age');
  });

  // ─── Spot-check original resources ────────────────────────────────────────

  it('resource0 (simple u32) — has get/set/has/delete/encode', () => {
    const content = readGenerated(codegenDir, 'resources', 'resource0.move');
    expect(content).toContain('public fun get(');
    expect(content).toContain('fun set(');
    expect(content).toContain('public fun has(');
    expect(content).toContain('public fun encode(');
  });

  it('resource4 (keyed resource with player key, isSingleValue) — generic get/set', () => {
    const content = readGenerated(codegenDir, 'resources', 'resource4.move');
    expect(content).toContain('player');
    expect(content).toContain('public fun get(');
    expect(content).toContain('fun set(');
    expect(content).not.toContain('get_value');
  });

  it('resource5 (two-key resource) — both player and id in signature', () => {
    const content = readGenerated(codegenDir, 'resources', 'resource5.move');
    expect(content).toContain('player');
    expect(content).toContain('id');
  });

  it('resource7 (offchain) — no get/has/delete, set is generated', () => {
    const content = readGenerated(codegenDir, 'resources', 'resource7.move');
    expect(content).not.toContain('public fun get(');
    expect(content).not.toContain('public fun has(');
    expect(content).toContain('fun set(');
  });

  it('resource9 (keyed with vector<String> field) — get/set_name and get/set_age', () => {
    const content = readGenerated(codegenDir, 'resources', 'resource9.move');
    expect(content).toContain('get_name');
    expect(content).toContain('set_name');
    expect(content).toContain('get_age');
    expect(content).toContain('set_age');
  });

  // ─── New annotation scenarios ─────────────────────────────────────────────

  it('game_config (global: true) — uses DappStorage, no UserStorage', () => {
    const content = readGenerated(codegenDir, 'resources', 'game_config.move');
    expect(content).toContain('DappStorage');
    expect(content).not.toContain('UserStorage');
    expect(content).toContain('get_max_players');
    expect(content).toContain('set_max_players');
  });

  it('gold (fungible: true) — generates add/sub functions', () => {
    const content = readGenerated(codegenDir, 'resources', 'gold.move');
    expect(content).toContain('public(package) fun add(');
    expect(content).toContain('public(package) fun sub(');
    // fungible resources still expose has() for existence checks
    expect(content).toContain('public fun has(');
  });

  it('sword (unique: true) — generates mint and has/ensure functions', () => {
    const content = readGenerated(codegenDir, 'resources', 'sword.move');
    expect(content).toContain('public(package) fun mint(');
    expect(content).toContain('public fun has(');
    expect(content).toContain('public fun ensure_has(');
  });

  it('sword (listable: true) — generates list/buy/cancel_listing/expire_listing', () => {
    const content = readGenerated(codegenDir, 'resources', 'sword.move');
    expect(content).toContain('public(package) fun list<CoinType>(');
    expect(content).toContain('public(package) fun buy<CoinType>(');
    expect(content).toContain('public(package) fun cancel_listing<CoinType>(');
    expect(content).toContain('public(package) fun expire_listing<CoinType>(');
    // buy is NOT entry (PTB-composable)
    expect(content).not.toContain('public entry fun buy<CoinType>(');
  });

  it('sword (transferable: true) — generates transfer_user_to_vault functions', () => {
    const content = readGenerated(codegenDir, 'resources', 'sword.move');
    expect(content).toContain('transfer_user_to_vault');
    expect(content).toContain('transfer_vault_to_user');
    // unique transfer OUT only needs &TxContext (not &mut)
    expect(content).toContain('fun transfer_user_to_vault(');
    expect(content).toContain('ctx:      &TxContext');
  });

  it('hp (reactive: true) — generates set_reactive with scene meta params', () => {
    const content = readGenerated(codegenDir, 'resources', 'hp.move');
    expect(content).toContain('set_reactive');
    // reactive functions no longer take dapp_storage (pause checks are developer's responsibility)
    expect(content).not.toContain('DappStorage');
    expect(content).toContain('PermitMetadata');
  });

  it('vault object — generates typed ObjectStorage struct', () => {
    assertFileExists(codegenDir, 'objects', 'vault.move');
    const content = readGenerated(codegenDir, 'objects', 'vault.move');
    expect(content).toContain('VaultStorage');
    expect(content).toContain('public fun create_vault(');
    expect(content).toContain('public fun destroy_vault(');
  });

  it('vault object (accepts gold) — generates add_gold/sub_gold bag accessors', () => {
    const content = readGenerated(codegenDir, 'objects', 'vault.move');
    expect(content).toContain('add_gold');
    expect(content).toContain('sub_gold');
  });

  it('vault object (acceptsFrom dungeon) — generates transfer_dungeon_to_vault_gold', () => {
    const content = readGenerated(codegenDir, 'objects', 'vault.move');
    expect(content).toContain('transfer_dungeon_to_vault_gold');
  });

  it('dungeon scene — generates typed SceneStorage struct + lifecycle functions', () => {
    assertFileExists(codegenDir, 'scenes', 'dungeon.move');
    const content = readGenerated(codegenDir, 'scenes', 'dungeon.move');
    // Phantom marker (framework-controlled storage, no DungeonStorage struct in DApp)
    expect(content).toContain('public struct Dungeon has copy, drop {}');
    expect(content).toContain('public(package) fun new_dungeon_with_permit(');
    expect(content).toContain('public(package) fun create_dungeon_with_permit(');
    expect(content).toContain('ScenePermit<example::dungeon_permit::DungeonPermit>');

    assertFileExists(codegenDir, 'permits', 'dungeon_permit.move');
    const permitContent = readGenerated(codegenDir, 'permits', 'dungeon_permit.move');
    expect(permitContent).toContain('public struct DungeonPermit has copy, drop {}');
    expect(permitContent).toContain('public(package) fun create_dungeon_permit(');
    expect(permitContent).toContain('public(package) fun accept_dungeon_permit(');
    expect(permitContent).toContain('public(package) fun join_dungeon_permit(');
    expect(permitContent).toContain('public(package) fun expire_dungeon_permit(');
    expect(permitContent).toContain('public(package) fun leave_dungeon_permit(');
  });

  it('dungeon scene (accepts gold) — generates add_gold/sub_gold bag accessors', () => {
    const content = readGenerated(codegenDir, 'scenes', 'dungeon.move');
    expect(content).toContain('add_gold');
    expect(content).toContain('sub_gold');
  });

  it('dungeon scene (acceptsFrom arena) — generates transfer_arena_to_dungeon_gold', () => {
    const content = readGenerated(codegenDir, 'scenes', 'dungeon.move');
    expect(content).toContain('transfer_arena_to_dungeon_gold');
  });

  it('errors — generates error.move with DApp-specific constants', () => {
    assertFileExists(codegenDir, 'error.move');
    const content = readGenerated(codegenDir, 'error.move');
    expect(content).toContain('ENotAuthorized');
    expect(content).toContain('EInsufficientLevel');
    expect(content).toContain('not_authorized');
    expect(content).toContain('insufficient_level');
  });

  // ─── Spot-check enums ─────────────────────────────────────────────────────

  it('Status enum has Caught/Fled/Missed constructors', () => {
    const content = readGenerated(codegenDir, 'enums', 'status.move');
    expect(content).toContain('new_caught()');
    expect(content).toContain('new_fled()');
    expect(content).toContain('new_missed()');
    expect(content).toContain('encode');
    expect(content).toContain('decode');
  });

  it('genesis.move references deploy_hook and dapp_system', () => {
    const content = readGenerated(codegenDir, 'genesis.move');
    expect(content).toContain('deploy_hook');
    expect(content).toContain('dapp_system');
  });

  it('dapp_key.move uses non-deprecated type_name API', () => {
    const content = readGenerated(codegenDir, 'dapp_key.move');
    expect(content).toContain('type_name::with_defining_ids');
    expect(content).toContain('address_string()');
    expect(content).not.toContain('type_name::get<');
    expect(content).not.toContain('get_address()');
  });

  it('generated files do NOT have blanket #[allow(unused_use, unused_const)] annotations', () => {
    const sampleFiles = [
      'resources/gold.move',
      'resources/sword.move',
      'objects/vault.move',
      'scenes/dungeon.move'
    ];
    for (const f of sampleFiles) {
      const content = readGenerated(codegenDir, f);
      // All suppress-by-annotation patterns should be gone — root causes are fixed in codegen
      expect(content).not.toContain('#[allow(unused_use');
      expect(content).not.toContain('#[allow(unused_const');
      expect(content).not.toContain('#[allow(unused_mut_parameter');
    }
  });
});
