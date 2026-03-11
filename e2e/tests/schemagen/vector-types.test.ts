/**
 * Schemagen tests: vector types
 *
 * Verifies that vector<T> types are correctly handled in resources.
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

const VECTOR_TYPES = [
  'vector<u8>',
  'vector<u16>',
  'vector<u32>',
  'vector<u64>',
  'vector<u128>',
  'vector<u256>',
  'vector<address>',
  'vector<bool>',
  'vector<String>',
  'vector<vector<u8>>'
] as const;

describe('Schemagen: vector types in resources', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  for (const vecType of VECTOR_TYPES) {
    it(`resource: '${vecType}' — generates valid module`, async () => {
      const config = defineConfig({
        name: 'testpkg',
        description: 'test',
        resources: { myfield: vecType }
      });

      const { tempDir, codegenDir } = await runSchemaGen(config);
      temps.push(tempDir);

      assertFileExists(codegenDir, 'resources', 'myfield.move');
      const content = readGenerated(codegenDir, 'resources', 'myfield.move');

      assertContains(content, 'module testpkg::myfield');
      assertContains(content, 'fun set(');
      assertContains(content, 'public fun get(');
      assertContains(content, 'public fun encode(');
    });
  }

  it("resource: 'vector<u8>' (explicit) — generates valid module", async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { data: 'vector<u8>' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'data.move');
    const content = readGenerated(codegenDir, 'resources', 'data.move');

    assertContains(content, 'module testpkg::data');
    assertContains(content, 'public fun get(');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun encode(');
  });

  it("resource: 'vector<String>' — generates valid module", async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { tags: 'vector<String>' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'tags.move');
    assertContains(content, 'module testpkg::tags');
    assertContains(content, 'fun set(');
  });

  it('struct resource with vector field — generates per-field accessors', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        inventory: {
          fields: { items: 'vector<u64>', owner: 'address' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'inventory.move');
    assertContains(content, 'get_items');
    assertContains(content, 'set_items');
    assertContains(content, 'get_owner');
    assertContains(content, 'set_owner');
  });

  it('resource with vector<String> names field and explicit key', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        profile: {
          fields: { player: 'address', names: 'vector<String>', age: 'u32' },
          keys: ['player']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'profile.move');
    const content = readGenerated(codegenDir, 'resources', 'profile.move');

    assertContains(content, 'get_names');
    assertContains(content, 'set_names');
    assertContains(content, 'get_age');
    assertContains(content, 'set_age');
  });
});
