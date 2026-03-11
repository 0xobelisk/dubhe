/**
 * Schemagen tests: simple resource (resource: 'primitiveType')
 *
 * Covers the case where a resource is declared as a bare Move type string,
 * e.g.  resources: { value: 'u32' }
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
  defineConfig
} from './helpers.js';

describe('Schemagen: simple resource (bare primitive type)', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  const PRIMITIVE_TYPES = ['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address'] as const;

  for (const moveType of PRIMITIVE_TYPES) {
    it(`resource: '${moveType}' — generates get/set/has/delete/encode`, async () => {
      const config = defineConfig({
        name: 'testpkg',
        description: 'test',
        resources: { myvalue: moveType }
      });

      const { tempDir, codegenDir } = await runSchemaGen(config);
      temps.push(tempDir);

      assertFileExists(codegenDir, 'resources', 'myvalue.move');
      const content = readGenerated(codegenDir, 'resources', 'myvalue.move');

      assertContains(content, 'module testpkg::myvalue');
      // set is public(package); use fun set( to match either visibility
      assertContains(content, 'fun set(');
      assertContains(content, 'public fun get(');
      assertContains(content, 'public fun has(');
      assertContains(content, 'public(package) fun delete(');
      assertContains(content, 'public fun encode(');
    });
  }

  it("resource: 'String' — generates peel_string BCS decode", async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { mystr: 'String' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'mystr.move');
    const content = readGenerated(codegenDir, 'resources', 'mystr.move');

    assertContains(content, 'module testpkg::mystr');
    assertContains(content, 'public fun get(');
    assertContains(content, 'fun set(');
    assertContains(content, 'public fun encode(');
    assertContains(content, 'peel_string');
  });

  it('generates standard codegen files alongside resource', async () => {
    const config = defineConfig({
      name: 'mypkg',
      description: 'a test package',
      resources: { score: 'u64' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'genesis.move');
    assertFileExists(codegenDir, 'dapp_key.move');
    assertFileExists(codegenDir, 'init_test.move');
    assertFileExists(codegenDir, 'resources', 'score.move');

    const genesis = readGenerated(codegenDir, 'genesis.move');
    assertContains(genesis, 'module mypkg::genesis');
    assertContains(genesis, 'public entry fun run(');

    const dappKey = readGenerated(codegenDir, 'dapp_key.move');
    assertContains(dappKey, 'module mypkg::dapp_key');

    const initTest = readGenerated(codegenDir, 'init_test.move');
    assertContains(initTest, 'module mypkg::init_test');
    assertContains(initTest, 'deploy_dapp_for_testing');
  });

  it('Move.toml is generated with correct package name and Dubhe dependency', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'game contract',
      resources: { hp: 'u32' }
    });

    const { tempDir, packageDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const tomlPath = path.join(packageDir, 'Move.toml');
    expect(fs.existsSync(tomlPath)).toBe(true);
    const content = fs.readFileSync(tomlPath, 'utf-8');

    assertContains(content, 'name = "mygame"');
    assertContains(content, 'Dubhe');
    assertContains(content, 'mygame = "0x0"');
  });

  it('no errors.move is generated when errors field is absent', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { value: 'u32' }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const errorsPath = path.join(codegenDir, 'errors.move');
    expect(fs.existsSync(errorsPath)).toBe(false);
  });
});
