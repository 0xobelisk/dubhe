/**
 * Schemagen tests: objects section (generateObjects.ts)
 *
 * Verifies that a config with `objects: {}` generates the expected
 * typed ObjectStorage modules inside sources/codegen/objects/.
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

describe('Schemagen: objects section', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  // ── Basic: single object without accepts ────────────────────────────────────

  it('single object with own fields generates typed struct and CRUD', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      objects: {
        guild: {
          fields: { level: 'u32', name: 'String' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const objectsDir = path.join(codegenDir, 'objects');
    assertFileExists(objectsDir, 'guild.move');
    const content = readGenerated(objectsDir, 'guild.move');

    // Phantom marker struct (framework controls the actual ObjectStorage<T> struct)
    assertContains(content, 'public struct Guild has copy, drop {}');
    // Framework type appears in all function signatures
    assertContains(content, 'dubhe::dapp_service::ObjectStorage<Guild>');

    // entity_id accessor and assert helper
    assertContains(content, 'public fun entity_id(');
    assertContains(content, 'public fun assert_guild_id(');

    // Own field accessors
    assertContains(content, 'public fun get_level(');
    assertContains(content, 'public(package) fun set_level(');
    assertContains(content, 'public fun get_name(');
    assertContains(content, 'public(package) fun set_name(');

    // Lifecycle entry functions
    assertContains(content, 'public fun create_guild(');
    assertContains(content, 'public fun destroy_guild(');

    // TYPE_TAG constant
    assertContains(content, 'b"guild"');

    // No adminOnly guard should appear when adminOnly is not set
    assertNotContains(content, 'dapp_admin');
  });

  // ── adminOnly: true generates an assert guard ────────────────────────────────

  it('adminOnly: true inserts dapp_admin assertion in create entry', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      objects: {
        boss: {
          fields: { hp: 'u64' },
          adminOnly: true
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'objects'), 'boss.move');
    assertContains(content, 'dapp_admin');
    assertContains(content, 'ENoPermission');
  });

  // ── Multiple objects generate separate files ─────────────────────────────────

  it('multiple objects each get their own .move file', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {},
      objects: {
        guild: { fields: { level: 'u32' } },
        boss: { fields: { hp: 'u64' } }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const objectsDir = path.join(codegenDir, 'objects');
    assertFileExists(objectsDir, 'guild.move');
    assertFileExists(objectsDir, 'boss.move');

    assertContains(readGenerated(objectsDir, 'guild.move'), 'GuildStorage');
    assertContains(readGenerated(objectsDir, 'boss.move'), 'BossStorage');
  });

  // ── accepts: fungible resource generates bag accessors ─────────────────────

  it('accepts a fungible resource generates add/sub/get bag accessors', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      objects: {
        guild: {
          fields: { level: 'u32' },
          accepts: ['gold']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'objects'), 'guild.move');
    assertContains(content, 'public fun get_gold(');
    assertContains(content, 'public(package) fun add_gold(');
    assertContains(content, 'public(package) fun sub_gold(');
    assertContains(content, 'EInsufficientAmount');
  });

  // ── accepts: unique resource generates has/get/set/remove bag accessors ──────

  it('accepts a unique resource generates has/get_data/set_data/remove_data bag accessors', async () => {
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
      objects: {
        guild: {
          fields: { level: 'u32' },
          accepts: ['weapon']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'objects'), 'guild.move');
    assertContains(content, 'public fun has_weapon(');
    assertContains(content, 'public fun get_weapon_data(');
    assertContains(content, 'public(package) fun set_weapon_data(');
    assertContains(content, 'public(package) fun remove_weapon_data(');
    assertContains(content, 'EDuplicateItemId');
  });

  // ── No objects section: objects/ dir is NOT generated ───────────────────────

  it('no objects section: objects/ directory is not created', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: { hp: 'u32' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const objectsDir = path.join(codegenDir, 'objects');
    expect(fs.existsSync(objectsDir)).toBe(false);
  });

  // ── acceptsFrom: fungible cross-object transfer ───────────────────────────

  it('acceptsFrom a scene generates transfer_<source>_to_<dest>_<resource> for fungible', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      objects: {
        guild: {
          fields: { level: 'u32' },
          accepts: ['gold'],
          // dungeon_run scene also accepts gold → intersection is ['gold']
          acceptsFrom: ['dungeon_run']
        }
      },
      scenes: {
        dungeon_run: {
          authorization: { kind: 'system' },
          fields: { floor: 'u32' },
          accepts: ['gold']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'objects'), 'guild.move');

    // Module import (no alias import needed — all calls are fully qualified)
    assertContains(content, 'use mygame::dungeon_run;');

    // Transfer function signature — uses framework phantom types
    assertContains(content, 'public(package) fun transfer_dungeon_run_to_guild_gold(');
    assertContains(content, 'SceneStorage<mygame::dungeon_run::DungeonRun>');
    assertContains(content, 'ObjectStorage<Guild>');
    assertContains(content, 'amount: u64,');

    // Body: call source sub, then own add
    assertContains(content, 'dungeon_run::sub_gold(from, amount)');
    assertContains(content, 'add_gold(to, amount)');
  });

  // ── acceptsFrom: empty intersection produces no transfer functions ──────────

  it('acceptsFrom with no common resources produces no transfer functions', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, transferable: true },
        loot: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      objects: {
        guild: {
          fields: { level: 'u32' },
          accepts: ['gold'],
          // pvp_match only accepts loot; intersection with guild's gold is empty
          acceptsFrom: ['pvp_match']
        }
      },
      scenes: {
        pvp_match: {
          authorization: { kind: 'system' },
          fields: { round: 'u32' },
          accepts: ['loot']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(path.join(codegenDir, 'objects'), 'guild.move');
    assertNotContains(content, 'transfer_pvp_match_to_guild_');
  });
});
