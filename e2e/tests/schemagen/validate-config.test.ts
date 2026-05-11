/**
 * Schemagen tests: validateConfig
 *
 * Verifies hard errors (throws) and warnings (console.warn) emitted by
 * validateConfig when semantically invalid or suspicious configs are passed.
 *
 * Note: validateConfig is called synchronously inside defineConfig(), so
 * hard-error tests use expect(() => defineConfig(...)).toThrow().
 * Warning tests still call runSchemaGen() to exercise the full pipeline.
 */

import { describe, it, afterAll, expect, vi } from 'vitest';
import { runSchemaGen, cleanupDir, defineConfig } from './helpers.js';

describe('Schemagen: validateConfig', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  // ── Hard errors (synchronous throws from defineConfig) ────────────────────────

  it('objects.accepts references an undefined resource — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {},
        objects: {
          guild: {
            fields: { level: 'u32' },
            accepts: ['gold'] // gold not in resources
          }
        }
      })
    ).toThrow(/gold.*not defined in resources/);
  });

  it('objects.accepts resource missing transferable: true — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          gold: { fields: { amount: 'u64' }, fungible: true }
          // missing transferable: true
        },
        objects: {
          guild: {
            fields: { level: 'u32' },
            accepts: ['gold']
          }
        }
      })
    ).toThrow(/transferable: true/);
  });

  it('scenes.accepts resource missing transferable: true — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {
          loot: { fields: { amount: 'u64' } }
        },
        scenes: {
          dungeon_run: {
            authorization: { kind: 'system' },
            fields: { floor: 'u32' },
            accepts: ['loot']
          }
        }
      })
    ).toThrow(/transferable: true/);
  });

  it('objects.acceptsFrom references undefined object/scene — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {},
        objects: {
          guild: {
            fields: { level: 'u32' },
            acceptsFrom: ['dungeon_run'] // not in objects or scenes
          }
        }
      })
    ).toThrow(/dungeon_run.*not defined in objects or scenes/);
  });

  it('scenes.accepts references an undefined resource — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {},
        scenes: {
          pvp_match: {
            authorization: { kind: 'system' },
            fields: { round: 'u32' },
            accepts: ['loot'] // loot not in resources
          }
        }
      })
    ).toThrow(/loot.*not defined in resources/);
  });

  it('scenes.acceptsFrom references undefined object/scene — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: {},
        scenes: {
          pvp_match: {
            authorization: { kind: 'system' },
            fields: { round: 'u32' },
            acceptsFrom: ['boss'] // not in objects or scenes
          }
        }
      })
    ).toThrow(/boss.*not defined in objects or scenes/);
  });

  // ── offchain incompatibility: hard errors ────────────────────────────────────

  it('offchain: true + listable: true — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: { pos: { fields: { x: 'u32' }, offchain: true, listable: true } }
      })
    ).toThrow(/offchain.*listable/);
  });

  it('offchain: true + transferable: true — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: { pos: { fields: { x: 'u32' }, offchain: true, transferable: true } }
      })
    ).toThrow(/offchain.*transferable/);
  });

  it('offchain: true + reactive: true — throws', () => {
    expect(() =>
      defineConfig({
        name: 'mygame',
        description: 'test',
        resources: { pos: { fields: { x: 'u32' }, offchain: true, reactive: true } }
      })
    ).toThrow(/offchain.*reactive/);
  });

  // ── Warnings ─────────────────────────────────────────────────────────────────

  it('reactive: true + fungible: true — emits console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, reactive: true, fungible: true }
      }
    });

    const { tempDir } = await runSchemaGen(config);
    temps.push(tempDir);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('reactive'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fungible'));

    warnSpy.mockRestore();
  });

  it('fungible: true + listable: true — emits console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, listable: true }
      }
    });

    const { tempDir } = await runSchemaGen(config);
    temps.push(tempDir);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fungible'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('listable'));

    warnSpy.mockRestore();
  });

  it('transferable: true not referenced in any accepts — emits console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, transferable: true }
        // no objects/scenes with accepts: ['gold']
      }
    });

    const { tempDir } = await runSchemaGen(config);
    temps.push(tempDir);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('transferable'));

    warnSpy.mockRestore();
  });

  // ── Valid combos: no error, no warning ───────────────────────────────────────

  it('transferable: true with matching accepts — no error', async () => {
    const config = defineConfig({
      name: 'mygame',
      description: 'test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true, transferable: true }
      },
      objects: {
        guild: { fields: { level: 'u32' }, accepts: ['gold'] }
      }
    });

    const { tempDir } = await runSchemaGen(config);
    temps.push(tempDir);
    // No throw = pass
  });
});
