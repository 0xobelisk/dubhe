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
  _assertNotContains,
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
    assertContains(content, 'public entry fun create_pvp_match_with_consent(');
    assertContains(content, 'public entry fun join_pvp_match(');
    assertContains(content, 'public entry fun expire_pvp_match(');

    // Multi-sig consent verification
    assertContains(content, 'ed25519::ed25519_verify');
    assertContains(content, 'consume_nonce');
    assertContains(content, 'encode_consent_msg');
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
});
