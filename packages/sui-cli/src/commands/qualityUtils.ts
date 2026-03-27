export function parseMoveCoveragePercent(summaryOutput: string): number | undefined {
  const match = summaryOutput.match(/% Move Coverage:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return undefined;
  return Number.parseFloat(match[1]);
}

export function generateFuzzSeeds(
  iterations: number,
  baseSeed?: number,
  replaySeed?: number
): number[] {
  if (typeof replaySeed === 'number') return [replaySeed];
  const count = Math.max(1, Math.floor(iterations));
  const resolvedBase = baseSeed ?? Date.now();
  return Array.from({ length: count }, (_, i) => resolvedBase + i);
}

export type FuzzRunResult = {
  seed: number;
  ok: boolean;
  durationMs: number;
  output: string;
  error?: string;
};

export function formatFuzzSummary(results: FuzzRunResult[]): string {
  const total = results.length;
  const failed = results.filter((r) => !r.ok);
  const passed = total - failed.length;
  const lines: string[] = [];
  lines.push(`\nFuzz Summary: total=${total}, passed=${passed}, failed=${failed.length}`);
  if (failed.length > 0) {
    lines.push('Failing seeds:');
    for (const item of failed) {
      lines.push(`  - seed=${item.seed} (${item.durationMs}ms)`);
    }
  }
  return lines.join('\n');
}

export function generateShrinkCandidateSeeds(
  failingSeed: number,
  window: number,
  floorSeed: number = 0
): number[] {
  const normalizedWindow = Math.max(1, Math.floor(window));
  const minSeed = Math.max(floorSeed, failingSeed - normalizedWindow);
  const seeds: number[] = [];
  for (let seed = failingSeed - 1; seed >= minSeed; seed -= 1) {
    seeds.push(seed);
  }
  return seeds;
}

export type InvariantCorpus = {
  version: 1;
  updatedAt: string;
  failingSeeds: number[];
  minimalFailingSeeds: number[];
};

function normalizeSeed(seed: number): number | undefined {
  if (!Number.isFinite(seed)) return undefined;
  const normalized = Math.floor(seed);
  if (normalized < 0) return undefined;
  return normalized;
}

export function normalizeSeedList(seeds: number[], maxItems: number = 2048): number[] {
  const unique = new Set<number>();
  for (const seed of seeds) {
    const normalized = normalizeSeed(seed);
    if (typeof normalized !== 'number') continue;
    unique.add(normalized);
  }
  return Array.from(unique)
    .sort((a, b) => a - b)
    .slice(-Math.max(1, Math.floor(maxItems)));
}

export function mergeSeedQueues(primarySeeds: number[], extraSeeds: number[]): number[] {
  const seen = new Set<number>();
  const merged: number[] = [];
  for (const seed of [...primarySeeds, ...extraSeeds]) {
    const normalized = normalizeSeed(seed);
    if (typeof normalized !== 'number') continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
  }
  return merged;
}

export function parseInvariantCorpus(raw: string): InvariantCorpus {
  const parsed = JSON.parse(raw) as Partial<InvariantCorpus>;
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    failingSeeds: normalizeSeedList(Array.isArray(parsed.failingSeeds) ? parsed.failingSeeds : []),
    minimalFailingSeeds: normalizeSeedList(
      Array.isArray(parsed.minimalFailingSeeds) ? parsed.minimalFailingSeeds : []
    )
  };
}

export function createEmptyInvariantCorpus(): InvariantCorpus {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    failingSeeds: [],
    minimalFailingSeeds: []
  };
}

export function mergeInvariantCorpus(
  existing: InvariantCorpus,
  failingSeeds: number[],
  minimalFailingSeed?: number,
  maxItems: number = 2048
): InvariantCorpus {
  const minimalSeeds =
    typeof minimalFailingSeed === 'number' ? [minimalFailingSeed] : ([] as number[]);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    failingSeeds: normalizeSeedList([...existing.failingSeeds, ...failingSeeds], maxItems),
    minimalFailingSeeds: normalizeSeedList(
      [...existing.minimalFailingSeeds, ...minimalSeeds],
      maxItems
    )
  };
}

export function computeFailureRate(results: FuzzRunResult[]): {
  total: number;
  failed: number;
  failureRatePct: number;
} {
  const total = results.length;
  const failed = results.filter((item) => !item.ok).length;
  const failureRatePct = total === 0 ? 0 : (failed / total) * 100;
  return {
    total,
    failed,
    failureRatePct
  };
}
