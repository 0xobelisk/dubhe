import { describe, expect, it } from 'vitest';
import {
  SnapshotEntry,
  diffSnapshotEntries,
  formatSnapshotDiffSummary
} from '../src/commands/snapshotUtils';

function foundEntry(objectId: string, version: string, digest: string): SnapshotEntry {
  return {
    objectId,
    version,
    digest,
    status: 'found'
  };
}

describe('diffSnapshotEntries', () => {
  it('classifies added/deleted/mutated/unchanged entries', () => {
    const before = [
      foundEntry('0x1', '1', 'd1'),
      foundEntry('0x2', '2', 'd2'),
      foundEntry('0x3', '3', 'd3')
    ];
    const after = [
      foundEntry('0x1', '1', 'd1'),
      foundEntry('0x2', '4', 'd4'),
      foundEntry('0x4', '1', 'd4')
    ];

    const diff = diffSnapshotEntries(before, after);
    expect(diff.added.map((item) => item.objectId)).toEqual(['0x4']);
    expect(diff.deleted.map((item) => item.objectId)).toEqual(['0x3']);
    expect(diff.mutated.map((item) => item.objectId)).toEqual(['0x2']);
    expect(diff.unchanged.map((item) => item.objectId)).toEqual(['0x1']);
  });

  it('treats status transitions as mutations', () => {
    const before: SnapshotEntry[] = [
      {
        objectId: '0x9',
        version: '-',
        digest: '-',
        status: 'error',
        error: 'ObjectNotFound'
      }
    ];
    const after: SnapshotEntry[] = [foundEntry('0x9', '1', 'ok')];
    const diff = diffSnapshotEntries(before, after);
    expect(diff.mutated).toHaveLength(1);
    expect(diff.mutated[0].objectId).toBe('0x9');
  });
});

describe('formatSnapshotDiffSummary', () => {
  it('prints counts for quick CLI review', () => {
    const text = formatSnapshotDiffSummary({
      added: [foundEntry('0xa', '1', 'a')],
      deleted: [],
      mutated: [],
      unchanged: [foundEntry('0xb', '1', 'b')]
    });
    expect(text).toContain('Added: 1');
    expect(text).toContain('Unchanged: 1');
  });
});
