export type SnapshotEntry = {
  objectId: string;
  version: string;
  digest: string;
  type?: string;
  owner?: string;
  previousTransaction?: string;
  storageRebate?: string;
  status: 'found' | 'error';
  error?: string;
};

export type ObjectSnapshot = {
  generatedAt: string;
  network: string;
  rpcUrl: string;
  entries: SnapshotEntry[];
};

export type SnapshotMutation = {
  objectId: string;
  from: SnapshotEntry;
  to: SnapshotEntry;
};

export type SnapshotDiff = {
  added: SnapshotEntry[];
  deleted: SnapshotEntry[];
  mutated: SnapshotMutation[];
  unchanged: SnapshotEntry[];
};

function sortByObjectId<T extends { objectId: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.objectId.localeCompare(b.objectId));
}

function sameVersionAndDigest(a: SnapshotEntry, b: SnapshotEntry): boolean {
  return a.version === b.version && a.digest === b.digest && a.status === b.status;
}

export function diffSnapshotEntries(
  fromEntries: SnapshotEntry[],
  toEntries: SnapshotEntry[]
): SnapshotDiff {
  const fromMap = new Map<string, SnapshotEntry>();
  const toMap = new Map<string, SnapshotEntry>();

  for (const entry of fromEntries) fromMap.set(entry.objectId, entry);
  for (const entry of toEntries) toMap.set(entry.objectId, entry);

  const objectIds = Array.from(new Set([...fromMap.keys(), ...toMap.keys()])).sort();

  const added: SnapshotEntry[] = [];
  const deleted: SnapshotEntry[] = [];
  const mutated: SnapshotMutation[] = [];
  const unchanged: SnapshotEntry[] = [];

  for (const objectId of objectIds) {
    const from = fromMap.get(objectId);
    const to = toMap.get(objectId);

    if (!from && to) {
      added.push(to);
      continue;
    }
    if (from && !to) {
      deleted.push(from);
      continue;
    }
    if (!from || !to) continue;

    if (sameVersionAndDigest(from, to)) {
      unchanged.push(to);
    } else {
      mutated.push({ objectId, from, to });
    }
  }

  return {
    added: sortByObjectId(added),
    deleted: sortByObjectId(deleted),
    mutated: sortByObjectId(mutated),
    unchanged: sortByObjectId(unchanged)
  };
}

export function formatSnapshotDiffSummary(diff: SnapshotDiff): string {
  return [
    'Snapshot Diff Summary',
    `  Added: ${diff.added.length}`,
    `  Deleted: ${diff.deleted.length}`,
    `  Mutated: ${diff.mutated.length}`,
    `  Unchanged: ${diff.unchanged.length}`
  ].join('\n');
}
