/**
 * Schemagen tests: scenes section (generateScenes.ts)
 *
 * Verifies that a config with `scenes: {}` generates the expected
 * typed SceneStorage modules inside sources/codegen/scenes/.
 */

import { describe, it, afterAll, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  runSchemaGen,
  cleanupDir,
  readGenerated,
  assertFileExists,
  assertContains,
  assertNotContains,
  defineConfig
} from './helpers.js';

describe('Schemagen: scenes section', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  // ── Basic: single scene with own fields ─────────────────────────────────────

  it('single scene with own fields generates typed struct and lifecycle entry fns', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        pvp_match: {
          fields: { round: 'u32', map_id: 'u64' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const scenesDir = path.join(codegenDir, 'scenes');
    assertFileExists(scenesDir, 'pvp_match.move');
    const content = readGenerated(scenesDir, 'pvp_match.move');

    // Struct
    assertContains(content, 'public struct PvpMatchStorage has key');
    assertContains(content, 'meta: SceneMetadata');
    assertContains(content, 'Bag');

    // Metadata accessors
    assertContains(content, 'public fun meta(');
    assertContains(content, 'public fun is_active(');
    assertContains(content, 'public fun is_participant(');

    // Own field accessors
    assertContains(content, 'public fun get_round(');
    assertContains(content, 'public(package) fun set_round(');
    assertContains(content, 'public fun get_map_id(');

    // Lifecycle entry functions
    assertContains(content, 'public fun create_pvp_match(');
    assertContains(content, 'public fun create_pvp_match_with_invitations(');
    assertContains(content, 'public fun accept_pvp_match(');
    // join is `public(package) fun` to restrict access to within the package
    assertContains(content, 'public(package) fun join_pvp_match(');
    assertContains(content, 'public fun expire_pvp_match(');
    assertNotContains(content, 'public fun join_pvp_match('); // must be public(package), not public
    assertNotContains(content, 'public entry fun expire_pvp_match(');
    // leave is public(package) to prevent mid-match griefing
    assertContains(content, 'public(package) fun leave_pvp_match(');

    // join / leave / accept / expire use &TxContext (not &mut TxContext) — W09014 guard
    assertNotContains(
      content,
      'join_pvp_match(\n        storage: &mut PvpMatchStorage,\n        ctx:     &mut TxContext'
    );
    assertNotContains(
      content,
      'leave_pvp_match(\n        storage: &mut PvpMatchStorage,\n        ctx:     &mut TxContext'
    );

    // Error constants — expire uses its own distinct error
    assertContains(content, 'ESceneExpired');
    assertContains(content, 'ESceneNotExpiredYet');

    // with_consent is removed — no ed25519 or encode_consent_msg
    assertNotContains(content, 'create_pvp_match_with_consent');
    assertNotContains(content, 'ed25519::ed25519_verify');
    assertNotContains(content, 'encode_consent_msg');
  });

  // ── Multiple scenes generate separate files ──────────────────────────────────

  it('multiple scenes each get their own .move file', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        pvp_match: { fields: { round: 'u32' } },
        dungeon_run: { fields: { floor: 'u32' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const scenesDir = path.join(codegenDir, 'scenes');
    assertFileExists(scenesDir, 'pvp_match.move');
    assertFileExists(scenesDir, 'dungeon_run.move');

    assertContains(readGenerated(scenesDir, 'pvp_match.move'), 'PvpMatchStorage');
    assertContains(readGenerated(scenesDir, 'dungeon_run.move'), 'DungeonRunStorage');
  });

  // ── accepts: fungible resource generates bag accessors ──────────────────────

  it('accepts a fungible resource generates add/sub/get bag accessors', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        loot: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      scenes: {
        dungeon_run: {
          fields: { floor: 'u32' },
          accepts: ['loot']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'dungeon_run.move');
    assertContains(content, 'public fun get_loot(');
    assertContains(content, 'public(package) fun add_loot(');
    assertContains(content, 'public(package) fun sub_loot(');
  });

  // ── accepts: unique resource generates has/get_data/set_data/remove_data ─────

  it('accepts a unique resource generates has/get_data/set_data/remove_data accessors', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        weapon: {
          fields: { item_id: 'u64', damage: 'u32' },
          unique: true,
          keys: ['item_id'],
          transferable: true
        }
      },
      scenes: {
        pvp_match: {
          fields: { round: 'u32' },
          accepts: ['weapon']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'pvp_match.move');
    assertContains(content, 'public fun has_weapon(');
    assertContains(content, 'public fun get_weapon_data(');
    assertContains(content, 'public(package) fun set_weapon_data(');
    assertContains(content, 'public(package) fun remove_weapon_data(');
  });

  // ── No scenes section: scenes/ dir is NOT generated ─────────────────────────

  it('no scenes section: scenes/ directory is not created', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: { hp: 'u32' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const scenesDir = path.join(codegenDir, 'scenes');
    expect(fs.existsSync(scenesDir)).toBe(false);
  });

  // ── acceptsFrom: fungible cross-scene transfer ────────────────────────────

  it('acceptsFrom a scene generates transfer_<source>_to_<dest>_<resource> for fungible', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        loot: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      scenes: {
        pvp_match: {
          fields: { round: 'u32' },
          accepts: ['loot']
        },
        dungeon_run: {
          fields: { floor: 'u32' },
          accepts: ['loot'],
          // loot from pvp_match can be transferred here
          acceptsFrom: ['pvp_match']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'dungeon_run.move');

    // Import with Self so pvp_match module alias is in scope
    assertContains(content, 'use mygame::pvp_match::{Self, PvpMatchStorage}');

    // Transfer function
    assertContains(content, 'public(package) fun transfer_pvp_match_to_dungeon_run_loot(');
    assertContains(content, 'from:   &mut PvpMatchStorage,');
    assertContains(content, 'to:     &mut DungeonRunStorage,');
    assertContains(content, 'pvp_match::sub_loot(from, amount)');
    assertContains(content, 'add_loot(to, amount)');
  });

  // ── acceptsFrom: unique item cross-scene transfer ─────────────────────────

  it('acceptsFrom with unique resource generates item_id-keyed transfer function', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        weapon: {
          fields: { item_id: 'u64', damage: 'u32' },
          unique: true,
          keys: ['item_id'],
          transferable: true
        }
      },
      scenes: {
        pvp_match: {
          fields: { round: 'u32' },
          accepts: ['weapon']
        },
        dungeon_run: {
          fields: { floor: 'u32' },
          accepts: ['weapon'],
          acceptsFrom: ['pvp_match']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'dungeon_run.move');
    assertContains(content, 'public(package) fun transfer_pvp_match_to_dungeon_run_weapon(');
    assertContains(content, 'item_id: u64,');
    assertContains(content, 'pvp_match::remove_weapon_data(from, item_id)');
    assertContains(content, 'set_weapon_data(to, item_id, data)');
  });

  // ── invitation flow generates create_with_invitations + accept ──────────────

  it('create_<scene>_with_invitations and accept_<scene> are generated for all wallet support', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        pvp_match: { fields: { round: 'u32' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'pvp_match.move');

    // Invitation creation
    assertContains(content, 'public fun create_pvp_match_with_invitations(');
    assertContains(content, 'invitees:          vector<address>');
    assertContains(content, 'invites_expire_at: std::option::Option<u64>');
    assertContains(content, 'scene_expires_at:  std::option::Option<u64>');
    assertContains(content, 'max_participants:  std::option::Option<u64>');

    // Accept entry function
    assertContains(content, 'public fun accept_pvp_match(');
    assertContains(content, 'accept_scene_invitation<DappKey>');
    // accept uses &TxContext (not &mut TxContext) — W09014 guard
    assertNotContains(
      content,
      'accept_pvp_match(\n        storage: &mut PvpMatchStorage,\n        ctx:     &mut TxContext'
    );

    // with_consent is gone
    assertNotContains(content, 'create_pvp_match_with_consent');
    assertNotContains(content, 'encode_consent_msg');
    assertNotContains(content, 'ed25519::ed25519_verify');
  });

  // ── create_<scene> (open, no consent) ────────────────────────────────────────

  it('generates create_<scene> open entry function accepting optional expires_at', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        dungeon_run: { fields: { floor: 'u32' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'dungeon_run.move');

    // Open scene creation: no nonce, no signatures, optional expiry.
    assertContains(content, 'public fun create_dungeon_run(');
    assertContains(content, 'expires_at:       std::option::Option<u64>');
    assertContains(content, 'max_participants: std::option::Option<u64>');
    // Invitation variant must also be present.
    assertContains(content, 'public fun create_dungeon_run_with_invitations(');
    // with_consent is removed.
    assertNotContains(content, 'create_dungeon_run_with_consent');
  });

  // ── reactive: generated functions include dapp_storage + paused check ────────

  it('reactive resource generates set_reactive with dapp_storage param and ensure_not_paused', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        hp: {
          fields: { current: 'u64', max: 'u64' },
          reactive: true
        }
      },
      scenes: {}
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'resources'), 'hp.move');

    // dapp_storage param in signature
    assertContains(content, 'dapp_storage: &DappStorage,');
    // ensure_not_paused called before write
    assertContains(content, 'ensure_not_paused');
  });
});
