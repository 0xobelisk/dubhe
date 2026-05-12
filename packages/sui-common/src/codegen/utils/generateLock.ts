import chalk from 'chalk';
import { DubheConfig, Component, MoveType } from '../types';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'node:path';

/** Snapshot of field definitions for a single resource/object/scene. */
type FieldSnapshot = Record<string, string>;

/** Top-level structure of a dubhe.lock.json file. */
interface DubheLock {
  version: 1;
  resources: Record<string, FieldSnapshot>;
  objects: Record<string, FieldSnapshot>;
  scenes: Record<string, FieldSnapshot>;
}

/** Extract the field map for a resource entry (handles both shorthand and full form). */
function resourceFields(entry: Component | MoveType): FieldSnapshot {
  if (typeof entry === 'string') {
    return { value: entry };
  }
  const fields: FieldSnapshot = {};
  for (const [k, v] of Object.entries(entry.fields ?? {})) {
    fields[k] = v as string;
  }
  return fields;
}

/** Extract the field map for an object or scene entry. */
function objectOrSceneFields(entry: { fields: Record<string, MoveType> }): FieldSnapshot {
  const fields: FieldSnapshot = {};
  for (const [k, v] of Object.entries(entry.fields)) {
    fields[k] = v as string;
  }
  return fields;
}

/** Build a full DubheLock snapshot from a DubheConfig. */
function buildLock(config: DubheConfig): DubheLock {
  const resources: Record<string, FieldSnapshot> = {};
  for (const [name, entry] of Object.entries(config.resources ?? {})) {
    resources[name] = resourceFields(entry);
  }

  const objects: Record<string, FieldSnapshot> = {};
  for (const [name, entry] of Object.entries(config.objects ?? {})) {
    objects[name] = objectOrSceneFields(entry);
  }

  const scenes: Record<string, FieldSnapshot> = {};
  for (const [name, entry] of Object.entries(config.scenes ?? {})) {
    scenes[name] = objectOrSceneFields(entry);
  }

  return { version: 1, resources, objects, scenes };
}

type SectionName = 'resources' | 'objects' | 'scenes';

/** Compare old vs new field snapshots and throw on breaking changes. */
function checkSection(
  section: SectionName,
  oldSection: Record<string, FieldSnapshot>,
  newSection: Record<string, FieldSnapshot>
): void {
  for (const [name, newFields] of Object.entries(newSection)) {
    const oldFields = oldSection[name];
    if (!oldFields) continue; // New entry — allowed.

    for (const [field, oldType] of Object.entries(oldFields)) {
      if (!(field in newFields)) {
        throw new Error(
          `[dubhe] Breaking change detected in ${section}.${name}:\n` +
            `  Field "${field}" was removed.\n\n` +
            `Resources, objects, and scenes are stored as raw bytes on-chain.\n` +
            `Removing fields corrupts existing data. Use a new name (e.g. "${name}_v2") for breaking changes.`
        );
      }
      if (newFields[field] !== oldType) {
        throw new Error(
          `[dubhe] Breaking change detected in ${section}.${name}:\n` +
            `  Field "${field}" type changed from "${oldType}" to "${newFields[field]}".\n\n` +
            `Resources, objects, and scenes are stored as raw bytes on-chain.\n` +
            `Changing field types corrupts existing data. Use a new name (e.g. "${name}_v2") for breaking changes.`
        );
      }
    }
  }
}

/**
 * Read the existing lock file (if any), check for breaking changes against the
 * current config, then write an updated lock file.
 *
 * Call this at the start of `codegen()` before any file generation begins.
 *
 * @param rootDir  The project root directory (same dir passed to `codegen()`).
 * @param config   The parsed DubheConfig.
 */
export function checkAndUpdateLock(rootDir: string, config: DubheConfig): void {
  const lockPath = path.join(rootDir, `${config.name}.lock.json`);
  const newLock = buildLock(config);

  if (existsSync(lockPath)) {
    let oldLock: DubheLock;
    try {
      oldLock = JSON.parse(readFileSync(lockPath, 'utf-8')) as DubheLock;
    } catch {
      console.warn(
        chalk.yellow('[dubhe]') + ` Could not parse ${chalk.bold(lockPath)}, skipping break-check.`
      );
      writeFileSync(lockPath, JSON.stringify(newLock, null, 2) + '\n', 'utf-8');
      return;
    }

    checkSection('resources', oldLock.resources ?? {}, newLock.resources);
    checkSection('objects', oldLock.objects ?? {}, newLock.objects);
    checkSection('scenes', oldLock.scenes ?? {}, newLock.scenes);
  }

  writeFileSync(lockPath, JSON.stringify(newLock, null, 2) + '\n', 'utf-8');
}
