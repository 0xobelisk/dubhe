import { describe, expect, it } from 'vitest';
import {
  formatForkDriftDetails,
  hasForkDrift,
  parseForkFixtureManifest,
  resolveForkSnapshotPath
} from '../src/commands/forkUtils';

describe('parseForkFixtureManifest', () => {
  it('parses and deduplicates object ids', () => {
    const manifest = parseForkFixtureManifest({
      version: 1,
      network: 'testnet',
      snapshotFile: '.reports/snapshots/fork.json',
      objectIds: ['0x1', '0x1', '0x2']
    });
    expect(manifest.network).toBe('testnet');
    expect(manifest.objectIds).toEqual(['0x1', '0x2']);
  });

  it('throws on invalid shape', () => {
    expect(() =>
      parseForkFixtureManifest({
        version: 1,
        network: 'invalid',
        snapshotFile: '',
        objectIds: []
      })
    ).toThrow();
  });
});

describe('resolveForkSnapshotPath', () => {
  it('resolves relative snapshot file by fixture dir', () => {
    const resolved = resolveForkSnapshotPath('/tmp/reports/fork-fixture.json', './fork.json');
    expect(resolved).toContain('/tmp/reports/fork.json');
  });
});

describe('fork drift helpers', () => {
  it('detects drift and renders details', () => {
    const diff = {
      added: [],
      deleted: [],
      mutated: [
        {
          objectId: '0x1',
          from: { objectId: '0x1', version: '1', digest: 'a', status: 'found' as const },
          to: { objectId: '0x1', version: '2', digest: 'b', status: 'found' as const }
        }
      ],
      unchanged: []
    };
    expect(hasForkDrift(diff)).toBe(true);
    const text = formatForkDriftDetails(diff, 5);
    expect(text).toContain('Mutated (1)');
    expect(text).toContain('0x1');
  });

  it('returns no-drift summary when diff is empty', () => {
    const diff = { added: [], deleted: [], mutated: [], unchanged: [] };
    expect(hasForkDrift(diff)).toBe(false);
    expect(formatForkDriftDetails(diff)).toContain('No fork drift detected');
  });
});
