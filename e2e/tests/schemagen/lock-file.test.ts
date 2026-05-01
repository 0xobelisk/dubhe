/**
 * Schemagen tests: dubhe.lock.json generation and breaking-change detection.
 *
 * The lock file lives at <rootDir>/<config.name>.lock.json and is written by
 * codegen() on every successful run. Subsequent runs compare the new config
 * against the lock and throw on breaking changes (field removed or type changed).
 *
 * Covered scenarios:
 *   - First run: lock file is created with correct field snapshot
 *   - Second run (no change): succeeds, lock file unchanged
 *   - Second run (additive — new field): succeeds, lock file updated
 *   - Second run (remove field): throws with clear message
 *   - Second run (change field type): throws with clear message
 *   - Breaking change in objects fields: throws
 *   - Breaking change in scenes fields: throws
 *   - All three sections (resources + objects + scenes) appear in lock file
 */

import { describe, it, afterAll, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runSchemaGen, cleanupDir } from './helpers.js';
import { schemaGen, checkAndUpdateLock } from '@0xobelisk/sui-common';

describe('Schemagen: lock file', () => {
  const temps: string[] = [];
  afterAll(() => temps.forEach(cleanupDir));

  // ── First run: lock file is created ────────────────────────────────────────

  it('first run creates lock file with correct field snapshot', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame',
      description: 'lock test',
      resources: {
        sword: { fields: { attack: 'u32', defense: 'u32' } }
      }
    });
    temps.push(tempDir);

    const lockPath = path.join(tempDir, 'mygame.lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);

    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    expect(lock.version).toBe(1);
    expect(lock.resources.sword).toEqual({ attack: 'u32', defense: 'u32' });
  });

  // ── No change: second run succeeds ────────────────────────────────────────

  it('second run with same config succeeds without error', async () => {
    const config = {
      name: 'mygame2',
      description: 'lock test',
      resources: { sword: { fields: { attack: 'u32', defense: 'u32' } } }
    };
    const { tempDir } = await runSchemaGen(config);
    temps.push(tempDir);

    // Second run in the SAME tempDir — same config, should not throw.
    await expect(schemaGen(tempDir, config)).resolves.toBeUndefined();
  });

  // ── Additive change: new field added — allowed ─────────────────────────────

  it('adding a new field is allowed and updates the lock file', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame3',
      description: 'lock test',
      resources: { sword: { fields: { attack: 'u32' } } }
    });
    temps.push(tempDir);

    // Second run with extra field — should succeed.
    await schemaGen(tempDir, {
      name: 'mygame3',
      description: 'lock test',
      resources: { sword: { fields: { attack: 'u32', defense: 'u32' } } }
    });

    const lock = JSON.parse(fs.readFileSync(path.join(tempDir, 'mygame3.lock.json'), 'utf-8'));
    expect(lock.resources.sword).toEqual({ attack: 'u32', defense: 'u32' });
  });

  // ── Breaking change: field removed ─────────────────────────────────────────

  it('removing a resource field throws with a clear error message', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame4',
      description: 'lock test',
      resources: { sword: { fields: { attack: 'u32', defense: 'u32' } } }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame4',
        description: 'lock test',
        resources: { sword: { fields: { attack: 'u32' } } } // defense removed
      })
    ).rejects.toThrow(/Breaking change detected in resources\.sword/);
  });

  it('removing a resource field error mentions the removed field name', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame5',
      description: 'lock test',
      resources: { item: { fields: { power: 'u64', rarity: 'u8' } } }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame5',
        description: 'lock test',
        resources: { item: { fields: { power: 'u64' } } } // rarity removed
      })
    ).rejects.toThrow(/rarity.*was removed/);
  });

  // ── Breaking change: field type changed ────────────────────────────────────

  it('changing a resource field type throws with a clear error message', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame6',
      description: 'lock test',
      resources: { token: { fields: { amount: 'u64' }, fungible: true } }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame6',
        description: 'lock test',
        resources: { token: { fields: { amount: 'u32' }, fungible: true } } // u64 → u32
      })
    ).rejects.toThrow(/amount.*changed from "u64" to "u32"/);
  });

  // ── Breaking change in objects ─────────────────────────────────────────────

  it('removing an objects field throws', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame7',
      description: 'lock test',
      objects: { guild: { fields: { level: 'u32', name: 'String' } } }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame7',
        description: 'lock test',
        objects: { guild: { fields: { level: 'u32' } } } // name removed
      })
    ).rejects.toThrow(/Breaking change detected in objects\.guild/);
  });

  // ── Breaking change in scenes ──────────────────────────────────────────────

  it('changing a scenes field type throws', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame8',
      description: 'lock test',
      scenes: { pvp: { fields: { round: 'u32', map_id: 'u64' } } }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame8',
        description: 'lock test',
        scenes: { pvp: { fields: { round: 'u64', map_id: 'u64' } } } // round: u32 → u64
      })
    ).rejects.toThrow(/Breaking change detected in scenes\.pvp/);
  });

  // ── Lock file covers all three sections ────────────────────────────────────

  it('lock file includes resources, objects, and scenes sections', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame9',
      description: 'lock test',
      resources: {
        gold: { fields: { amount: 'u64' }, fungible: true }
      },
      objects: {
        vault: { fields: { capacity: 'u32' } }
      },
      scenes: {
        dungeon: { fields: { floor: 'u32' } }
      }
    });
    temps.push(tempDir);

    const lock = JSON.parse(fs.readFileSync(path.join(tempDir, 'mygame9.lock.json'), 'utf-8'));
    expect(lock.resources.gold).toEqual({ amount: 'u64' });
    expect(lock.objects.vault).toEqual({ capacity: 'u32' });
    expect(lock.scenes.dungeon).toEqual({ floor: 'u32' });
  });

  // ── Shorthand resource (MoveType string) ───────────────────────────────────

  it('shorthand resource (string type) is captured in lock as { value: type }', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame10',
      description: 'lock test',
      resources: {
        score: 'u64'
      }
    });
    temps.push(tempDir);

    const lock = JSON.parse(fs.readFileSync(path.join(tempDir, 'mygame10.lock.json'), 'utf-8'));
    expect(lock.resources.score).toEqual({ value: 'u64' });
  });

  it('changing shorthand resource type throws', async () => {
    const { tempDir } = await runSchemaGen({
      name: 'mygame11',
      description: 'lock test',
      resources: { score: 'u64' }
    });
    temps.push(tempDir);

    await expect(
      schemaGen(tempDir, {
        name: 'mygame11',
        description: 'lock test',
        resources: { score: 'u32' } // u64 → u32
      })
    ).rejects.toThrow(/value.*changed from "u64" to "u32"/);
  });

  // ── Direct API: checkAndUpdateLock ─────────────────────────────────────────

  it('checkAndUpdateLock creates lock file on first call', () => {
    const tempDir = fs.mkdtempSync('/tmp/dubhe-lock-direct-');
    temps.push(tempDir);

    checkAndUpdateLock(tempDir, {
      name: 'direct',
      description: 'test',
      resources: { hp: { fields: { current: 'u64', max: 'u64' } } }
    });

    const lockPath = path.join(tempDir, 'direct.lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    expect(lock.resources.hp).toEqual({ current: 'u64', max: 'u64' });
  });

  it('checkAndUpdateLock throws synchronously on breaking change', () => {
    const tempDir = fs.mkdtempSync('/tmp/dubhe-lock-direct-');
    temps.push(tempDir);

    // First write
    checkAndUpdateLock(tempDir, {
      name: 'direct2',
      description: 'test',
      resources: { hp: { fields: { current: 'u64', max: 'u64' } } }
    });

    // Breaking change — synchronous throw
    expect(() =>
      checkAndUpdateLock(tempDir, {
        name: 'direct2',
        description: 'test',
        resources: { hp: { fields: { current: 'u32', max: 'u64' } } } // current: u64 → u32
      })
    ).toThrow(/current.*changed from "u64" to "u32"/);
  });
});
