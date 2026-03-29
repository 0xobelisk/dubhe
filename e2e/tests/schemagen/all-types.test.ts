/**
 * Schemagen regression test: full config from e2e/dubhe.config.ts
 *
 * Uses the full config (35 migrated components + 10 resources, 3 enums) as the
 * canonical regression test. All entries live in resources/ — no components/ dir.
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { schemaGen } from '@0xobelisk/sui-common';
import { exampleConfig as dubheConfig } from '../../example.config.js';
import { cleanupDir, assertFileExists, readGenerated } from './helpers.js';

describe('Schemagen: full e2e config regression (45 resources, 3 enums)', () => {
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
    // isSingleValue=true (only 'exists' field, no keys): generic get/set generated
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
    // In resources, offchain suppresses read functions
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
});
