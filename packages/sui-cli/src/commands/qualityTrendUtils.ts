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

type TrendPoint = {
  x: number;
  y: number;
  label: string;
  value: number;
};

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTrendPoints(
  values: Array<number | undefined>,
  labels: string[],
  width: number,
  height: number,
  invertY: boolean = false
): TrendPoint[] {
  const numericValues = values.filter((item): item is number => typeof item === 'number');
  if (numericValues.length === 0) return [];
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      if (typeof value !== 'number') return null;
      const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
      const normalized = (value - min) / range;
      const yBase = normalized * (height - 10) + 5;
      const y = invertY ? yBase : height - yBase;
      return {
        x,
        y,
        label: labels[index],
        value
      };
    })
    .filter((item): item is TrendPoint => item !== null);
}

function renderSparkline(
  points: TrendPoint[],
  color: string,
  width: number,
  height: number
): string {
  if (points.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="8" y="${
      height / 2
    }" fill="#7b8794" font-size="12">n/a</text></svg>`;
  }

  const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const dots = points
    .map(
      (point) =>
        `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.5" fill="${color}">
  <title>${escapeHtml(point.label)}: ${point.value.toFixed(2)}</title>
</circle>`
    )
    .join('\n');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <polyline fill="none" stroke="${color}" stroke-width="2" points="${polyline}" />
  ${dots}
</svg>`;
}

export function renderQualityTrendHtml(
  timeline: QualityTimeline,
  title: string = 'Dubhe Quality Trend'
): string {
  const snapshots = timeline.snapshots;
  const labels = snapshots.map((item) => item.label || item.generatedAt);
  const gasValues = snapshots.map((item) => item.metrics.gasTotal);
  const coverageValues = snapshots.map((item) => item.metrics.coveragePct);
  const fuzzValues = snapshots.map((item) => item.metrics.fuzzFailureRatePct);
  const invariantValues = snapshots.map((item) => item.metrics.invariantFailureRatePct);

  const width = 720;
  const height = 120;
  const gasSparkline = renderSparkline(
    buildTrendPoints(gasValues, labels, width, height),
    '#0b69a3',
    width,
    height
  );
  const coverageSparkline = renderSparkline(
    buildTrendPoints(coverageValues, labels, width, height),
    '#2f9e44',
    width,
    height
  );
  const fuzzSparkline = renderSparkline(
    buildTrendPoints(fuzzValues, labels, width, height, true),
    '#d9480f',
    width,
    height
  );
  const invariantSparkline = renderSparkline(
    buildTrendPoints(invariantValues, labels, width, height, true),
    '#862e9c',
    width,
    height
  );

  const rows = snapshots
    .map((item) => {
      const label = item.label || item.generatedAt;
      return `<tr>
  <td>${escapeHtml(label)}</td>
  <td>${escapeHtml(item.generatedAt)}</td>
  <td style="text-align:right">${
    typeof item.metrics.gasTotal === 'number'
      ? item.metrics.gasTotal.toLocaleString('en-US')
      : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics.coveragePct === 'number' ? `${item.metrics.coveragePct.toFixed(2)}%` : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics.fuzzFailureRatePct === 'number'
      ? `${item.metrics.fuzzFailureRatePct.toFixed(2)}%`
      : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics.invariantFailureRatePct === 'number'
      ? `${item.metrics.invariantFailureRatePct.toFixed(2)}%`
      : 'n/a'
  }</td>
</tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
        margin: 24px;
        color: #102a43;
        background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
      }
      h1, h2 {
        margin: 0 0 12px;
      }
      .chart {
        background: #fff;
        border: 1px solid #d9e2ec;
        padding: 10px;
        margin-bottom: 12px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        background: #fff;
        border: 1px solid #d9e2ec;
      }
      th, td {
        border-bottom: 1px solid #d9e2ec;
        padding: 10px;
        text-align: left;
        font-size: 13px;
      }
      th {
        background: #d9e2ec;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated at: ${escapeHtml(new Date().toISOString())}</p>
    <div class="chart"><h2>Gas Total Trend</h2>${gasSparkline}</div>
    <div class="chart"><h2>Coverage Trend</h2>${coverageSparkline}</div>
    <div class="chart"><h2>Fuzz Failure Rate Trend</h2>${fuzzSparkline}</div>
    <div class="chart"><h2>Invariant Failure Rate Trend</h2>${invariantSparkline}</div>
    <h2>Timeline</h2>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Generated At</th>
          <th>Gas Total</th>
          <th>Coverage</th>
          <th>Fuzz Failure Rate</th>
          <th>Invariant Failure Rate</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </body>
</html>`;
}
