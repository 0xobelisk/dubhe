/**
 * Schemagen tests: multi-field resources
 *
 * Struct-style resources with multiple fields generate:
 *   - A struct definition
 *   - get/set for the whole struct
 *   - per-field get_X()/set_X() accessors
 *   - encode/decode
 */

import { describe, it, afterAll } from 'vitest';
import {
  runSchemaGen,
  cleanupDir,
  readGenerated,
  assertFileExists,
  assertContains,
  defineConfig
} from './helpers.js';

describe('Schemagen: multi-field resources', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  it('two primitive fields — generates get_X/set_X for each', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        player_info: {
          fields: { player: 'address', level: 'u32' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'player_info.move');
    const content = readGenerated(codegenDir, 'resources', 'player_info.move');

    assertContains(content, 'module testpkg::player_info');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun get(');
    assertContains(content, 'public fun has(');
    assertContains(content, 'public(package) fun delete(');
    assertContains(content, 'public fun encode(');
    assertContains(content, 'get_player');
    assertContains(content, 'set_player');
    assertContains(content, 'get_level');
    assertContains(content, 'set_level');
  });

  it('all Move primitive types in one struct', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        full_record: {
          fields: {
            u8_field: 'u8',
            u16_field: 'u16',
            u32_field: 'u32',
            u64_field: 'u64',
            u128_field: 'u128',
            u256_field: 'u256',
            bool_field: 'bool',
            addr_field: 'address',
            str_field: 'String'
          }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'full_record.move');

    for (const field of [
      'u8_field',
      'u16_field',
      'u32_field',
      'u64_field',
      'u128_field',
      'u256_field',
      'bool_field',
      'addr_field',
      'str_field'
    ]) {
      assertContains(content, `get_${field}`, `missing get_${field}`);
      assertContains(content, `set_${field}`, `missing set_${field}`);
    }
  });

  it('resource with String and vector<String> fields', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        named_profile: {
          fields: {
            player: 'address',
            name: 'String',
            tags: 'vector<String>'
          }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'named_profile.move');
    assertContains(content, 'get_name');
    assertContains(content, 'set_name');
    assertContains(content, 'get_tags');
    assertContains(content, 'set_tags');
  });

  it('non-global multi-field resource (no keys) uses UserStorage', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        global_settings: {
          fields: { admin: 'address', version: 'u32', paused: 'bool' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'global_settings.move');
    assertContains(content, 'user_storage: &UserStorage');
    assertContains(content, 'get_admin');
    assertContains(content, 'get_version');
    assertContains(content, 'get_paused');
  });

  it('keyed multi-field resource (2 keys)', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        map_cell: {
          fields: { player: 'address', x: 'u32', y: 'u32', value: 'u32' },
          keys: ['player', 'x']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'map_cell.move');
    assertContains(content, 'module testpkg::map_cell');
    assertContains(content, 'player');
    assertContains(content, 'get_value');
    assertContains(content, 'set_value');
  });
});
