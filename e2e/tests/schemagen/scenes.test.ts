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

  const systemAuth = { kind: 'system' as const };

  // ── Basic: single scene with own fields ─────────────────────────────────────

  it('single scene with own fields generates typed struct and lifecycle entry fns', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        pvp_match: {
          authorization: systemAuth,
          fields: { round: 'u32', map_id: 'u64' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const scenesDir = path.join(codegenDir, 'scenes');
    assertFileExists(scenesDir, 'pvp_match.move');
    const content = readGenerated(scenesDir, 'pvp_match.move');

    // Phantom marker struct (framework controls the actual SceneStorage<T> struct)
    assertContains(content, 'public struct PvpMatch has copy, drop {}');
    // Framework type appears in all function signatures
    assertContains(content, 'dubhe::dapp_service::SceneStorage<PvpMatch>');

    // Own field accessors
    assertContains(content, 'public fun get_round(');
    assertContains(content, 'public(package) fun set_round(');
    assertContains(content, 'public fun get_map_id(');

    // Lifecycle wrappers are package-scoped; public APIs live in DApp system modules.
    assertContains(content, 'public(package) fun new_pvp_match_system(');
    assertContains(content, 'public(package) fun create_pvp_match_system(');
    assertContains(content, 'public(package) fun destroy_pvp_match(');
    assertNotContains(content, 'public fun create_pvp_match(');
    assertNotContains(content, 'accept_typed_scene_invitation');

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
        pvp_match: { authorization: systemAuth, fields: { round: 'u32' } },
        dungeon_run: { authorization: systemAuth, fields: { floor: 'u32' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const scenesDir = path.join(codegenDir, 'scenes');
    assertFileExists(scenesDir, 'pvp_match.move');
    assertFileExists(scenesDir, 'dungeon_run.move');

    // Marker type names appear in the generated modules
    assertContains(readGenerated(scenesDir, 'pvp_match.move'), 'PvpMatch');
    assertContains(readGenerated(scenesDir, 'dungeon_run.move'), 'DungeonRun');
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
          authorization: systemAuth,
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
          keys: ['item_id'],
          transferable: true
        }
      },
      scenes: {
        pvp_match: {
          authorization: systemAuth,
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
          authorization: systemAuth,
          fields: { round: 'u32' },
          accepts: ['loot']
        },
        dungeon_run: {
          authorization: systemAuth,
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

    // Module import (no alias import needed — all calls are fully qualified)
    assertContains(content, 'use mygame::pvp_match;');

    // Transfer function — uses framework phantom types in signatures
    assertContains(content, 'public(package) fun transfer_pvp_match_to_dungeon_run_loot(');
    assertContains(content, 'SceneStorage<mygame::pvp_match::PvpMatch>');
    assertContains(content, 'SceneStorage<DungeonRun>');
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
          keys: ['item_id'],
          transferable: true
        }
      },
      scenes: {
        pvp_match: {
          authorization: systemAuth,
          fields: { round: 'u32' },
          accepts: ['weapon']
        },
        dungeon_run: {
          authorization: systemAuth,
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

  // ── permits: invitation flow generates permit lifecycle wrappers ─────────────

  it('permit config generates invitation and participant lifecycle wrappers', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      permits: {
        pvp_match_permit: {}
      },
      scenes: {
        pvp_match: {
          authorization: { kind: 'permit', permit: 'pvp_match_permit' },
          fields: { round: 'u32' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const permitContent = readGenerated(path.join(codegenDir, 'permits'), 'pvp_match_permit.move');
    const sceneContent = readGenerated(path.join(codegenDir, 'scenes'), 'pvp_match.move');

    assertContains(permitContent, 'public(package) fun create_pvp_match_permit_with_invitations(');
    assertContains(permitContent, 'public(package) fun accept_pvp_match_permit(');
    assertContains(permitContent, 'public(package) fun join_pvp_match_permit(');
    assertContains(permitContent, 'public(package) fun leave_pvp_match_permit(');
    assertContains(permitContent, 'public(package) fun expire_pvp_match_permit(');

    assertContains(sceneContent, 'public(package) fun new_pvp_match_with_permit(');
    assertContains(sceneContent, 'public(package) fun create_pvp_match_with_permit(');
    assertContains(sceneContent, 'ScenePermit<mygame::pvp_match_permit::PvpMatchPermit>');

    // with_consent is gone
    assertNotContains(sceneContent, 'create_pvp_match_with_consent');
    assertNotContains(sceneContent, 'encode_consent_msg');
    assertNotContains(sceneContent, 'ed25519::ed25519_verify');
  });

  // ── create_<scene>_system ───────────────────────────────────────────────────

  it('generates package-scoped system create wrapper', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      scenes: {
        dungeon_run: { authorization: systemAuth, fields: { floor: 'u32' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'scenes'), 'dungeon_run.move');

    assertContains(content, 'public(package) fun new_dungeon_run_system(');
    assertContains(content, 'public(package) fun create_dungeon_run_system(');
    assertNotContains(content, 'public fun create_dungeon_run(');
    assertNotContains(content, 'create_dungeon_run_with_consent');
  });

  // ── reactive: generated functions are public(package) without pause checks ────

  it('reactive resource generates set_reactive as public(package) without dapp_storage or ensure_not_paused', async () => {
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

    // reactive setters are public(package) — developers add pause/access checks in their system fns
    assertContains(content, 'public(package) fun set_reactive(');
    assertContains(content, 'public(package) fun set_current_reactive(');
    assertContains(content, 'public(package) fun set_max_reactive(');
    // no dapp_storage param and no ensure_not_paused in reactive functions
    assertNotContains(content, 'ensure_not_paused');
  });
});
