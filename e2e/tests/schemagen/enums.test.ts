/**
 * Schemagen tests: enums
 *
 * Verifies that enum definitions generate correct Move modules with:
 *   - `public enum EnumName has copy, drop, store { Variants... }`
 *   - `new_<variant>()` constructor functions (one per variant)
 *   - `encode(self: EnumName): vector<u8>`
 *   - `decode(bytes: &mut BCS): EnumName`
 * Also verifies that enum types work correctly when used in components/resources.
 */

import { describe, it, afterAll } from 'vitest';
import {
  runSchemaGen,
  cleanupDir,
  readGenerated,
  assertFileExists,
  assertContains,
  assertNotContains,
  defineConfig
} from './helpers.js';

describe('Schemagen: enums', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  it('basic enum — generates all required functions', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Status: ['Caught', 'Fled', 'Missed']
      },
      resources: {}
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'enums', 'status.move');
    const content = readGenerated(codegenDir, 'enums', 'status.move');

    assertContains(content, 'module testpkg::status');
    assertContains(content, 'public enum Status');
    assertContains(content, 'copy, drop, store');
    // Constructor functions (variants are sorted alphabetically)
    assertContains(content, 'new_caught()');
    assertContains(content, 'new_fled()');
    assertContains(content, 'new_missed()');
    // Encode / decode
    assertContains(content, 'public fun encode(self: Status): vector<u8>');
    assertContains(content, 'public fun decode(bytes: &mut BCS): Status');
    assertContains(content, 'peel_enum_tag');
  });

  it('multi-word enum name — file is snake_cased', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        AssetType: ['Lp', 'Wrapped', 'Private', 'Package']
      },
      resources: {}
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    // AssetType → asset_type.move
    assertFileExists(codegenDir, 'enums', 'asset_type.move');
    const content = readGenerated(codegenDir, 'enums', 'asset_type.move');

    assertContains(content, 'module testpkg::asset_type');
    assertContains(content, 'public enum AssetType');
    assertContains(content, 'new_lp()');
    assertContains(content, 'new_wrapped()');
    assertContains(content, 'new_private()');
    assertContains(content, 'new_package()');
  });

  it('multiple enums — each gets its own file', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Status: ['Active', 'Inactive'],
        Direction: ['North', 'South', 'East', 'West']
      },
      resources: {}
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'enums', 'status.move');
    assertFileExists(codegenDir, 'enums', 'direction.move');
  });

  it('enum variants are sorted alphabetically in generated code', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Season: ['Winter', 'Spring', 'Summer', 'Autumn']
      },
      resources: {}
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'enums', 'season.move');

    // Sorted order: Autumn, Spring, Summer, Winter
    const autumnIdx = content.indexOf('Autumn');
    const springIdx = content.indexOf('Spring');
    const summerIdx = content.indexOf('Summer');
    const winterIdx = content.indexOf('Winter');

    // All variants present in enum definition section
    expect(autumnIdx).toBeGreaterThan(-1);
    expect(springIdx).toBeGreaterThan(autumnIdx);
    expect(summerIdx).toBeGreaterThan(springIdx);
    expect(winterIdx).toBeGreaterThan(summerIdx);
  });

  it('enum type used in a simple resource — module imports enum module', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Direction: ['North', 'South', 'East', 'West']
      },
      resources: {
        facing: 'Direction'
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'facing.move');
    const content = readGenerated(codegenDir, 'resources', 'facing.move');

    assertContains(content, 'module testpkg::facing');
    // Should import the direction module
    assertContains(content, 'direction');
    assertContains(content, 'Direction');
  });

  it('enum type used in struct resource field (isSingleValue) — get()/set() with Status type', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Status: ['Active', 'Inactive']
      },
      resources: {
        player_state: {
          fields: { player: 'address', status: 'Status' },
          keys: ['player']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'player_state.move');
    const content = readGenerated(codegenDir, 'resources', 'player_state.move');

    // isSingleValue=true: no per-field get_status/set_status, just get()/set()
    assertContains(content, 'Status');
    assertContains(content, 'status');
    // The enum module is imported and used in get()/set()
    assertContains(content, 'public fun get(');
    assertContains(content, 'fun set(');
    // No per-field accessor for single-value
    assertNotContains(content, 'get_status');
  });

  it('no enums directory created when enums field is absent', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { value: 'u32' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const enumsDir = `${codegenDir}/enums`;
    const fs = await import('fs');
    expect(fs.existsSync(enumsDir)).toBe(false);
  });
});
