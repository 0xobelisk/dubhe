/**
 * Schemagen tests: offchain resources
 *
 * In resources, offchain=true SUPPRESSES has/delete/get functions.
 * Only `set` and `encode` are generated (write-only / event-emit pattern).
 *
 * offchain and global are independent flags — both can be combined.
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

describe('Schemagen: offchain resources', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  it('offchain resource (no keys) — OFFCHAIN=true, only set/encode generated', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        offchain_event: {
          offchain: true,
          fields: { player: 'address', value: 'u32' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'offchain_event.move');
    const content = readGenerated(codegenDir, 'resources', 'offchain_event.move');

    assertContains(content, 'module testpkg::offchain_event');
    assertContains(content, 'OFFCHAIN: bool = true');
    assertContains(content, 'fun set(');
    // Read functions suppressed for offchain resources
    assertNotContains(content, 'public fun has(');
    assertNotContains(content, 'public(package) fun delete(');
    assertNotContains(content, 'public fun get(');
  });

  it('offchain resource with explicit key — OFFCHAIN=true, set takes key param', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        offchain_log: {
          offchain: true,
          fields: { player: 'address', value: 'u32' },
          keys: ['player']
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'offchain_log.move');

    assertContains(content, 'OFFCHAIN: bool = true');
    assertContains(content, 'fun set(');
    assertContains(content, 'player');
    assertNotContains(content, 'public fun has(');
    assertNotContains(content, 'public fun get(');
  });

  it('offchain resource with enum type field — OFFCHAIN=true, enum import present', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      enums: {
        Direction: ['North', 'South', 'East', 'West']
      },
      resources: {
        offchain_direction: {
          offchain: true,
          fields: { result: 'Direction' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'resources', 'offchain_direction.move');

    assertContains(content, 'OFFCHAIN: bool = true');
    assertContains(content, 'fun set(');
    assertContains(content, 'Direction');
    assertNotContains(content, 'public fun has(');
  });

  it('onchain and offchain resources coexist — OFFCHAIN constant distinguishes them', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {
        live_data: { fields: { value: 'u32', admin: 'address' } },
        audit_log: {
          offchain: true,
          fields: { value: 'u32', actor: 'address' }
        }
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'resources', 'live_data.move');
    assertFileExists(codegenDir, 'resources', 'audit_log.move');

    const live = readGenerated(codegenDir, 'resources', 'live_data.move');
    const audit = readGenerated(codegenDir, 'resources', 'audit_log.move');

    assertContains(live, 'OFFCHAIN: bool = false');
    assertContains(audit, 'OFFCHAIN: bool = true');

    // Onchain has read functions; offchain does not
    assertContains(live, 'public fun has(');
    assertNotContains(audit, 'public fun has(');
    assertContains(live, 'fun set(');
    assertContains(audit, 'fun set(');
  });
});
