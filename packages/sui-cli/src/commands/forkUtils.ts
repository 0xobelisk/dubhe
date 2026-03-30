import path from 'path';
import type { SnapshotDiff } from './snapshotUtils';

export type ForkFixtureManifest = {
  version: number;
  generatedAt?: string;
  name?: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  rpcUrl?: string;
  snapshotFile: string;
  objectIds: string[];
};

export function parseForkFixtureManifest(payload: unknown): ForkFixtureManifest {
  if (typeof payload !== 'object' || payload == null) {
    throw new Error('Invalid fork fixture: expected JSON object');
  }
  const version = Number((payload as any).version);
  const network = (payload as any).network;
  const snapshotFile = (payload as any).snapshotFile;
  const objectIdsRaw = (payload as any).objectIds;
  const rpcUrl = (payload as any).rpcUrl;
  const name = (payload as any).name;
  const generatedAt = (payload as any).generatedAt;

  if (!Number.isFinite(version) || version < 1) {
    throw new Error('Invalid fork fixture: "version" must be >= 1');
  }

  if (!['mainnet', 'testnet', 'devnet', 'localnet'].includes(network)) {
    throw new Error(
      'Invalid fork fixture: "network" must be one of mainnet/testnet/devnet/localnet'
    );
  }

  if (typeof snapshotFile !== 'string' || snapshotFile.trim().length === 0) {
    throw new Error('Invalid fork fixture: "snapshotFile" is required');
  }

  if (!Array.isArray(objectIdsRaw) || objectIdsRaw.length === 0) {
    throw new Error('Invalid fork fixture: "objectIds" must be a non-empty array');
  }

  const objectIds = objectIdsRaw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  if (objectIds.length === 0) {
    throw new Error('Invalid fork fixture: "objectIds" must contain at least one object id');
  }

  return {
    version,
    generatedAt: typeof generatedAt === 'string' ? generatedAt : undefined,
    name: typeof name === 'string' ? name : undefined,
    network: network as ForkFixtureManifest['network'],
    rpcUrl: typeof rpcUrl === 'string' && rpcUrl.trim().length > 0 ? rpcUrl : undefined,
    snapshotFile: snapshotFile.trim(),
    objectIds: Array.from(new Set(objectIds))
  };
}

export function resolveForkSnapshotPath(fixturePath: string, snapshotFile: string): string {
  if (path.isAbsolute(snapshotFile)) return snapshotFile;
  return path.resolve(path.dirname(fixturePath), snapshotFile);
}

export function hasForkDrift(diff: SnapshotDiff): boolean {
  return diff.added.length > 0 || diff.deleted.length > 0 || diff.mutated.length > 0;
}

function normalizeObjectIdLike(objectId: string): string {
  return objectId.trim().toLowerCase();
}

export function parseForkIgnoreObjectIds(values: string[]): string[] {
  const ids = values
    .flatMap((value) => value.split(/[,\s]+/))
    .map((item) => normalizeObjectIdLike(item))
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export function filterForkDiffIgnoredObjects(
  diff: SnapshotDiff,
  ignoredObjectIds: string[]
): SnapshotDiff {
  if (ignoredObjectIds.length === 0) return diff;
  const ignoredSet = new Set(ignoredObjectIds.map((item) => normalizeObjectIdLike(item)));

  return {
    added: diff.added.filter((item) => !ignoredSet.has(normalizeObjectIdLike(item.objectId))),
    deleted: diff.deleted.filter((item) => !ignoredSet.has(normalizeObjectIdLike(item.objectId))),
    mutated: diff.mutated.filter((item) => !ignoredSet.has(normalizeObjectIdLike(item.objectId))),
    unchanged: diff.unchanged.filter(
      (item) => !ignoredSet.has(normalizeObjectIdLike(item.objectId))
    )
  };
}

export function formatForkIgnoreSummary(
  beforeFilter: SnapshotDiff,
  afterFilter: SnapshotDiff,
  ignoredObjectIds: string[]
): string {
  if (ignoredObjectIds.length === 0) return 'Fork ignore filter: disabled';
  const suppressed = {
    added: beforeFilter.added.length - afterFilter.added.length,
    deleted: beforeFilter.deleted.length - afterFilter.deleted.length,
    mutated: beforeFilter.mutated.length - afterFilter.mutated.length
  };
  return `Fork ignore filter: objects=${ignoredObjectIds.length}, suppressed added=${suppressed.added}, deleted=${suppressed.deleted}, mutated=${suppressed.mutated}`;
}

export function formatForkDriftDetails(diff: SnapshotDiff, maxRows: number = 10): string {
  const lines: string[] = [];
  const cap = Math.max(1, Math.floor(maxRows));

  if (diff.mutated.length > 0) {
    lines.push(`Mutated (${diff.mutated.length}):`);
    for (const item of diff.mutated.slice(0, cap)) {
      lines.push(
        `  - ${item.objectId}: ${item.from.version}/${item.from.digest} -> ${item.to.version}/${item.to.digest}`
      );
    }
    if (diff.mutated.length > cap) lines.push(`  ... ${diff.mutated.length - cap} more mutated`);
  }

  if (diff.deleted.length > 0) {
    lines.push(`Deleted (${diff.deleted.length}):`);
    for (const item of diff.deleted.slice(0, cap)) {
      lines.push(`  - ${item.objectId}`);
    }
    if (diff.deleted.length > cap) lines.push(`  ... ${diff.deleted.length - cap} more deleted`);
  }

  if (diff.added.length > 0) {
    lines.push(`Added (${diff.added.length}):`);
    for (const item of diff.added.slice(0, cap)) {
      lines.push(`  - ${item.objectId}`);
    }
    if (diff.added.length > cap) lines.push(`  ... ${diff.added.length - cap} more added`);
  }

  if (lines.length === 0) {
    lines.push('No fork drift detected.');
  }
  return lines.join('\n');
}
