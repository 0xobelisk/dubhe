import { FuzzRunResult, computeFailureRate, parseMoveCoveragePercent } from './qualityUtils';

export type QualitySnapshot = {
  generatedAt: string;
  label?: string;
  metrics: {
    gasTotal?: number;
    gasTests?: number;
    coveragePct?: number;
    fuzzFailed?: number;
    fuzzTotal?: number;
    fuzzFailureRatePct?: number;
    invariantFailed?: number;
    invariantTotal?: number;
    invariantFailureRatePct?: number;
  };
  sources: {
    gasProfile?: string;
    coverageSummary?: string;
    fuzzReport?: string;
    invariantReport?: string;
  };
};

export type QualityTimeline = {
  version: 1;
  snapshots: QualitySnapshot[];
};

export type QualityThresholds = {
  maxGasRegressionPct?: number;
  minCoveragePct?: number;
  maxFuzzFailureRatePct?: number;
  maxInvariantFailureRatePct?: number;
};

export type QualityEvaluation = {
  deltas: {
    gasDeltaPct?: number;
    coverageDeltaPct?: number;
    fuzzFailureRateDeltaPct?: number;
    invariantFailureRateDeltaPct?: number;
  };
  violations: string[];
};

export function parseGasTotals(report: unknown): { totalGas: number; tests: number } | undefined {
  if (typeof report !== 'object' || report == null) return undefined;
  const totals = (report as any).totals;
  if (typeof totals !== 'object' || totals == null) return undefined;
  const totalGas = Number((totals as any).totalGas);
  const tests = Number((totals as any).tests);
  if (!Number.isFinite(totalGas) || !Number.isFinite(tests)) return undefined;
  return { totalGas, tests };
}

export function parseCoveragePct(summaryText: string): number | undefined {
  return parseMoveCoveragePercent(summaryText);
}

function parseFailureStatsFromResults(results: FuzzRunResult[]): {
  total: number;
  failed: number;
  failureRatePct: number;
} {
  return computeFailureRate(results);
}

export function parseFailureStatsFromReport(report: unknown): {
  total: number;
  failed: number;
  failureRatePct: number;
} | null {
  if (typeof report !== 'object' || report == null) return null;
  const stats = (report as any).failureRate;
  if (stats && typeof stats === 'object') {
    const total = Number((stats as any).total);
    const failed = Number((stats as any).failed);
    const failureRatePct = Number((stats as any).failureRatePct);
    if (Number.isFinite(total) && Number.isFinite(failed) && Number.isFinite(failureRatePct)) {
      return { total, failed, failureRatePct };
    }
  }

  const results = (report as any).results;
  if (Array.isArray(results)) {
    return parseFailureStatsFromResults(results as FuzzRunResult[]);
  }

  const primary = Array.isArray((report as any).primaryResults)
    ? ((report as any).primaryResults as FuzzRunResult[])
    : [];
  const shrink = Array.isArray((report as any).shrinkResults)
    ? ((report as any).shrinkResults as FuzzRunResult[])
    : [];
  const minimization = Array.isArray((report as any).minimizationResults)
    ? ((report as any).minimizationResults as FuzzRunResult[])
    : [];

  const combined = [...primary, ...shrink, ...minimization];
  if (combined.length === 0) return null;
  return parseFailureStatsFromResults(combined);
}

export function appendQualitySnapshot(
  timeline: QualityTimeline,
  snapshot: QualitySnapshot,
  maxHistory: number = 200
): QualityTimeline {
  const snapshots = [...timeline.snapshots, snapshot];
  const normalizedMaxHistory = Math.max(1, Math.floor(maxHistory));
  return {
    version: 1,
    snapshots: snapshots.slice(-normalizedMaxHistory)
  };
}

function deltaPct(previous?: number, current?: number): number | undefined {
  if (typeof previous !== 'number' || typeof current !== 'number') return undefined;
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return undefined;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function evaluateQualitySnapshot(
  previous: QualitySnapshot | undefined,
  current: QualitySnapshot,
  thresholds: QualityThresholds
): QualityEvaluation {
  const gasDeltaPct = deltaPct(previous?.metrics.gasTotal, current.metrics.gasTotal);
  const coverageDeltaPct = deltaPct(previous?.metrics.coveragePct, current.metrics.coveragePct);
  const fuzzFailureRateDeltaPct = deltaPct(
    previous?.metrics.fuzzFailureRatePct,
    current.metrics.fuzzFailureRatePct
  );
  const invariantFailureRateDeltaPct = deltaPct(
    previous?.metrics.invariantFailureRatePct,
    current.metrics.invariantFailureRatePct
  );

  const violations: string[] = [];
  if (
    typeof thresholds.maxGasRegressionPct === 'number' &&
    typeof gasDeltaPct === 'number' &&
    gasDeltaPct > thresholds.maxGasRegressionPct
  ) {
    violations.push(
      `Gas regression ${gasDeltaPct.toFixed(
        2
      )}% exceeds threshold ${thresholds.maxGasRegressionPct.toFixed(2)}%`
    );
  }

  if (
    typeof thresholds.minCoveragePct === 'number' &&
    typeof current.metrics.coveragePct === 'number' &&
    current.metrics.coveragePct < thresholds.minCoveragePct
  ) {
    violations.push(
      `Coverage ${current.metrics.coveragePct.toFixed(
        2
      )}% is below threshold ${thresholds.minCoveragePct.toFixed(2)}%`
    );
  }

  if (
    typeof thresholds.maxFuzzFailureRatePct === 'number' &&
    typeof current.metrics.fuzzFailureRatePct === 'number' &&
    current.metrics.fuzzFailureRatePct > thresholds.maxFuzzFailureRatePct
  ) {
    violations.push(
      `Fuzz failure rate ${current.metrics.fuzzFailureRatePct.toFixed(
        2
      )}% exceeds threshold ${thresholds.maxFuzzFailureRatePct.toFixed(2)}%`
    );
  }

  if (
    typeof thresholds.maxInvariantFailureRatePct === 'number' &&
    typeof current.metrics.invariantFailureRatePct === 'number' &&
    current.metrics.invariantFailureRatePct > thresholds.maxInvariantFailureRatePct
  ) {
    violations.push(
      `Invariant failure rate ${current.metrics.invariantFailureRatePct.toFixed(
        2
      )}% exceeds threshold ${thresholds.maxInvariantFailureRatePct.toFixed(2)}%`
    );
  }

  return {
    deltas: {
      gasDeltaPct,
      coverageDeltaPct,
      fuzzFailureRateDeltaPct,
      invariantFailureRateDeltaPct
    },
    violations
  };
}

export function formatQualitySnapshotSummary(snapshot: QualitySnapshot): string {
  const lines = ['Quality Snapshot'];
  lines.push(`  generatedAt: ${snapshot.generatedAt}`);
  if (snapshot.label) lines.push(`  label: ${snapshot.label}`);
  if (typeof snapshot.metrics.gasTotal === 'number') {
    lines.push(`  gasTotal: ${snapshot.metrics.gasTotal}`);
  }
  if (typeof snapshot.metrics.coveragePct === 'number') {
    lines.push(`  coveragePct: ${snapshot.metrics.coveragePct.toFixed(2)}%`);
  }
  if (typeof snapshot.metrics.fuzzFailureRatePct === 'number') {
    lines.push(`  fuzzFailureRatePct: ${snapshot.metrics.fuzzFailureRatePct.toFixed(2)}%`);
  }
  if (typeof snapshot.metrics.invariantFailureRatePct === 'number') {
    lines.push(
      `  invariantFailureRatePct: ${snapshot.metrics.invariantFailureRatePct.toFixed(2)}%`
    );
  }
  return lines.join('\n');
}
