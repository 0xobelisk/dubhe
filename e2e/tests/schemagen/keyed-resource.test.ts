/**
 * Schemagen tests: keyed resource
 *
 * Resources with explicit keys: { fields: {...}, keys: ['k1', 'k2', ...] }
 * Key fields appear as function parameters rather than using the default
 * resource_account string.
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

describe('Schemagen: keyed resource', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  it('single key resource: keys appear in function signatures', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        player_score: {
          fields: { player: 'address', value: 'u32' },
          keys: ['player']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'player_score.move');
    const content = readGenerated(codegenDir, 'resources', 'player_score.move');

    assertContains(content, 'module testpkg::player_score');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun get(');
    assertContains(content, 'public fun has(');
    assertContains(content, 'public(package) fun delete(');
    assertContains(content, 'public fun encode(');
    // Player address field should be referenced
    assertContains(content, 'player');
  });

  it('two-key resource: both keys appear in function signatures', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        score_board: {
          fields: { player: 'address', id: 'u32', value: 'u32' },
          keys: ['player', 'id']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'score_board.move');
    const content = readGenerated(codegenDir, 'resources', 'score_board.move');

    assertContains(content, 'module testpkg::score_board');
    assertContains(content, 'player');
    assertContains(content, 'id');
  });

  it('three-key resource: all three keys encoded into key tuple', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        grid: {
          fields: { player: 'address', x: 'u32', y: 'u32', value: 'u32' },
          keys: ['player', 'x', 'y']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'grid.move');
    const content = readGenerated(codegenDir, 'resources', 'grid.move');

    assertContains(content, 'module testpkg::grid');
    assertContains(content, 'player');
    assertContains(content, 'x');
    assertContains(content, 'y');
  });

  it('global (no-key) resource uses resource_account string parameter', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        global_config: {
          fields: { admin: 'address', version: 'u32' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'global_config.move');
    const content = readGenerated(codegenDir, 'resources', 'global_config.move');

    assertContains(content, 'module testpkg::global_config');
    assertContains(content, 'resource_account');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun get(');
  });

  it('keyed resource with String key field', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        named_item: {
          fields: { name: 'String', value: 'u64' },
          keys: ['name']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'named_item.move');
    const content = readGenerated(codegenDir, 'resources', 'named_item.move');

    assertContains(content, 'module testpkg::named_item');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun get(');
  });

  it('multi-field resource generates per-field get_X/set_X helpers', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        character: {
          fields: { player: 'address', hp: 'u32', attack: 'u32' },
          keys: ['player']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'character.move');

    // Should have individual field accessors
    assertContains(content, 'get_hp');
    assertContains(content, 'set_hp');
    assertContains(content, 'get_attack');
    assertContains(content, 'set_attack');
  });

  it('keyed resource: ensure_has / ensure_has_not are generated', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        inventory: {
          fields: { player: 'address', item_id: 'u32', quantity: 'u32' },
          keys: ['player', 'item_id']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'inventory.move');

    assertContains(content, 'public fun ensure_has(');
    assertContains(content, 'public fun ensure_has_not(');
    // Both must include the key params
    assertContains(content, 'player: address');
    assertContains(content, 'item_id: u32');
  });

  it('simple shorthand resource: ensure_has / ensure_has_not are generated', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        score: 'u32'
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'score.move');

    assertContains(content, 'public fun ensure_has(dapp_hub: &DappHub, resource_account: String)');
    assertContains(
      content,
      'public fun ensure_has_not(dapp_hub: &DappHub, resource_account: String)'
    );
  });

  it('String type used as an explicit key field', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        name_to_score: {
          fields: { name: 'String', score: 'u32' },
          keys: ['name']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'name_to_score.move');

    assertContains(content, 'module testpkg::name_to_score');
    assertContains(content, 'name: String');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun get(');
    assertContains(content, 'public fun has(');
  });
});
