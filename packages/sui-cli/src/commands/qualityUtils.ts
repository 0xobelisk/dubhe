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
