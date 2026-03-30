import { afterEach, describe, expect, it } from 'vitest';
import { schemaGen } from '../src/codegen/utils/renderMove/schemaGen';
import { DubheConfig } from '../src/codegen/types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('schemaGen native.sui.objects', () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    while (cleanupPaths.length > 0) {
      const target = cleanupPaths.pop();
      if (!target) {
        continue;
      }
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  });

  it('generates Sui object modules without breaking resources', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-native-objects-'));
    cleanupPaths.push(rootDir);

    const config: DubheConfig = {
      name: 'native_objects_demo',
      description: 'SchemaGen test for native.sui.objects',
      resources: {
        player_profile: {
          fields: {
            player: 'address',
            score: 'u64'
          },
          keys: ['player']
        }
      },
      native: {
        sui: {
          objects: {
            session_cap: {
              abilities: ['key', 'store'],
              fields: {
                owner: 'address',
                delegate: 'address',
                scope_mask: 'u64',
                expires_at_ms: 'u64'
              }
            },
            subject_payload: {
              abilities: ['store', 'drop'],
              fields: {
                kind: 'u8',
                chain_id: 'u64',
                raw: 'vector<u8>'
              }
            }
          }
        }
      }
    };

    await schemaGen(rootDir, config, 'testnet');

    const projectDir = path.join(rootDir, 'src', config.name);
    const resourcePath = path.join(
      projectDir,
      'sources',
      'codegen',
      'resources',
      'player_profile.move'
    );
    const sessionCapPath = path.join(
      projectDir,
      'sources',
      'codegen',
      'objects',
      'session_cap.move'
    );
    const payloadPath = path.join(
      projectDir,
      'sources',
      'codegen',
      'objects',
      'subject_payload.move'
    );

    expect(fs.existsSync(resourcePath)).toBe(true);
    expect(fs.existsSync(sessionCapPath)).toBe(true);
    expect(fs.existsSync(payloadPath)).toBe(true);

    const sessionCapCode = fs.readFileSync(sessionCapPath, 'utf8');
    expect(sessionCapCode).toContain('module native_objects_demo::session_cap');
    expect(sessionCapCode).toContain('public struct SessionCap has key, store');
    expect(sessionCapCode).toContain('id: UID');
    expect(sessionCapCode).toContain('public fun new(');
    expect(sessionCapCode).toContain('ctx: &mut TxContext');
    expect(sessionCapCode).toContain('public fun id(self: &SessionCap): ID');

    const payloadCode = fs.readFileSync(payloadPath, 'utf8');
    expect(payloadCode).toContain('module native_objects_demo::subject_payload');
    expect(payloadCode).toContain('public struct SubjectPayload has store, drop');
    expect(payloadCode).not.toContain('id: UID');
    expect(payloadCode).not.toContain('ctx: &mut TxContext');
  });
});
