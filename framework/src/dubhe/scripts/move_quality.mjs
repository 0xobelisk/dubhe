#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function parseGasRowsFromText(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().toLowerCase() === 'name,nanos,gas');
  if (headerIndex === -1) return [];

  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (rows.length > 0) break;
      continue;
    }
    const parts = line.split(',');
    if (parts.length !== 3) {
      if (rows.length > 0) break;
      continue;
    }
    const name = parts[0].trim();
    const nanos = Number.parseInt(parts[1].trim(), 10);
    const gas = Number.parseInt(parts[2].trim(), 10);
    if (!name || Number.isNaN(nanos) || Number.isNaN(gas)) {
      if (rows.length > 0) break;
      continue;
    }
    rows.push({ name, nanos, gas });
  }
  return rows;
}

function parseCoveragePercentFromText(summaryText) {
  const match = summaryText.match(/% Move Coverage:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return undefined;
  return Number.parseFloat(match[1]);
}

function parseFuzzReportFromText(text) {
  const lines = text.split(/\r?\n/);
  let total = 0;
  let failed = 0;
  const failingSeeds = [];

  for (const line of lines) {
    if (/Running fuzz seed=/i.test(line)) {
      total += 1;
    }
    const failureMatch = line.match(/Fuzz failure at seed=([0-9]+)/i);
    if (failureMatch) {
      failed += 1;
      failingSeeds.push(Number.parseInt(failureMatch[1], 10));
    }
  }

  if (total === 0) {
    const iterMatch = text.match(/iterations=([0-9]+)/i);
    if (iterMatch) total = Number.parseInt(iterMatch[1], 10);
  }

  const failureRatePct = total === 0 ? 0 : (failed / total) * 100;
  return {
    generatedAt: new Date().toISOString(),
    total,
    failed,
    failureRatePct,
    failingSeeds
  };
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function safeReadJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return undefined;
  try {
    return readJsonFile(filePath);
  } catch {
    return undefined;
  }
}

function safeReadText(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return undefined;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function commandParseGas(args) {
  const input = args.input;
  const output = args.output;
  if (!input || !output) {
    throw new Error('parse-gas requires --input <logFile> and --output <jsonFile>');
  }

  const content = fs.readFileSync(input, 'utf-8');
  const rows = parseGasRowsFromText(content);
  const byGas = [...rows].sort((a, b) => b.gas - a.gas);
  const payload = {
    generatedAt: new Date().toISOString(),
    rows,
    topByGas: byGas.slice(0, 20),
    totals: {
      tests: rows.length,
      totalGas: rows.reduce((sum, row) => sum + row.gas, 0),
      totalNanos: rows.reduce((sum, row) => sum + row.nanos, 0)
    }
  };
  ensureParent(output);
  fs.writeFileSync(output, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Gas profile parsed: ${rows.length} rows -> ${output}`);
}

function commandCompareGas(args) {
  const currentPath = args.current;
  const baselinePath = args.baseline;
  const thresholdPct = Number.parseFloat(args.threshold ?? '5');
  if (!currentPath || !baselinePath) {
    throw new Error('compare-gas requires --current <json> and --baseline <json>');
  }
  if (Number.isNaN(thresholdPct)) {
    throw new Error(`Invalid --threshold value: ${args.threshold}`);
  }

  const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const currentRows = Array.isArray(current.rows) ? current.rows : [];
  const baselineRows = Array.isArray(baseline.rows) ? baseline.rows : [];

  const baselineMap = new Map(baselineRows.map((row) => [row.name, row]));
  const regressions = [];
  const improvements = [];
  let compared = 0;
  for (const row of currentRows) {
    const base = baselineMap.get(row.name);
    if (!base) continue;
    compared += 1;
    const deltaGas = row.gas - base.gas;
    const deltaPct = base.gas === 0 ? (deltaGas > 0 ? 100 : 0) : (deltaGas / base.gas) * 100;
    if (deltaPct > thresholdPct) {
      regressions.push({
        name: row.name,
        baselineGas: base.gas,
        currentGas: row.gas,
        deltaGas,
        deltaPct
      });
    } else if (deltaPct < 0) {
      improvements.push({
        name: row.name,
        baselineGas: base.gas,
        currentGas: row.gas,
        deltaGas,
        deltaPct
      });
    }
  }

  regressions.sort((a, b) => b.deltaPct - a.deltaPct);
  improvements.sort((a, b) => a.deltaPct - b.deltaPct);

  console.log(
    `Gas baseline check: compared=${compared}, regressions=${regressions.length}, improvements=${improvements.length}, threshold=${thresholdPct}%`
  );
  for (const item of regressions.slice(0, 20)) {
    console.log(
      `REGRESSION ${item.name}: ${item.baselineGas} -> ${item.currentGas} (${
        item.deltaGas >= 0 ? '+' : ''
      }${item.deltaGas}, ${item.deltaPct.toFixed(2)}%)`
    );
  }
  for (const item of improvements.slice(0, 10)) {
    console.log(
      `IMPROVEMENT ${item.name}: ${item.baselineGas} -> ${item.currentGas} (${
        item.deltaGas >= 0 ? '+' : ''
      }${item.deltaGas}, ${item.deltaPct.toFixed(2)}%)`
    );
  }

  if (regressions.length > 0) {
    process.exit(1);
  }
}

function commandCheckCoverage(args) {
  const summaryPath = args.summary;
  const thresholdPct = Number.parseFloat(args.threshold ?? '0');
  if (!summaryPath) {
    throw new Error('check-coverage requires --summary <summaryFile>');
  }
  if (Number.isNaN(thresholdPct)) {
    throw new Error(`Invalid --threshold value: ${args.threshold}`);
  }

  const summary = fs.readFileSync(summaryPath, 'utf-8');
  const pct = parseCoveragePercentFromText(summary);
  if (pct == null) {
    throw new Error('Unable to parse "% Move Coverage" from coverage summary');
  }

  console.log(`Move coverage: ${pct.toFixed(2)}% (threshold=${thresholdPct.toFixed(2)}%)`);
  if (pct < thresholdPct) {
    process.exit(1);
  }
}

function commandParseFuzz(args) {
  const input = args.input;
  const output = args.output;
  if (!input || !output) {
    throw new Error('parse-fuzz requires --input <logFile> and --output <jsonFile>');
  }

  const content = fs.readFileSync(input, 'utf-8');
  const report = parseFuzzReportFromText(content);
  ensureParent(output);
  fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf-8');
  console.log(
    `Fuzz report parsed: total=${report.total}, failed=${
      report.failed
    }, failureRate=${report.failureRatePct.toFixed(2)}% -> ${output}`
  );
}

function computeDeltaPct(previous, current) {
  if (typeof previous !== 'number' || typeof current !== 'number') return undefined;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function escapeHtml(raw) {
  return String(raw)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildSparkline(values, labels, color) {
  const width = 720;
  const height = 120;
  const numericValues = values.filter((item) => typeof item === 'number' && Number.isFinite(item));
  if (numericValues.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="8" y="${
      height / 2
    }" fill="#7b8794" font-size="12">n/a</text></svg>`;
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;

  const points = [];
  const dots = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const x = values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = height - (((value - min) / range) * (height - 10) + 5);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${color}">
  <title>${escapeHtml(labels[i] ?? 'snapshot')}: ${value.toFixed(2)}</title>
</circle>`);
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <polyline fill="none" stroke="${color}" stroke-width="2" points="${points.join(' ')}" />
  ${dots.join('\n')}
</svg>`;
}

function renderQualityTrendHtml(timeline, title = 'Dubhe Quality Trend') {
  const snapshots = Array.isArray(timeline?.snapshots) ? timeline.snapshots : [];
  const labels = snapshots.map((item) => item.label || item.generatedAt || 'snapshot');
  const gasValues = snapshots.map((item) => item.metrics?.gasTotal);
  const coverageValues = snapshots.map((item) => item.metrics?.coveragePct);
  const fuzzValues = snapshots.map((item) => item.metrics?.fuzzFailureRatePct);
  const invariantValues = snapshots.map((item) => item.metrics?.invariantFailureRatePct);

  const rows = snapshots
    .map((item) => {
      const label = item.label || item.generatedAt;
      return `<tr>
  <td>${escapeHtml(label ?? 'snapshot')}</td>
  <td>${escapeHtml(item.generatedAt ?? 'n/a')}</td>
  <td style="text-align:right">${
    typeof item.metrics?.gasTotal === 'number'
      ? item.metrics.gasTotal.toLocaleString('en-US')
      : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics?.coveragePct === 'number'
      ? `${item.metrics.coveragePct.toFixed(2)}%`
      : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics?.fuzzFailureRatePct === 'number'
      ? `${item.metrics.fuzzFailureRatePct.toFixed(2)}%`
      : 'n/a'
  }</td>
  <td style="text-align:right">${
    typeof item.metrics?.invariantFailureRatePct === 'number'
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
    <div class="chart"><h2>Gas Total Trend</h2>${buildSparkline(gasValues, labels, '#0b69a3')}</div>
    <div class="chart"><h2>Coverage Trend</h2>${buildSparkline(
      coverageValues,
      labels,
      '#2f9e44'
    )}</div>
    <div class="chart"><h2>Fuzz Failure Rate Trend</h2>${buildSparkline(
      fuzzValues,
      labels,
      '#d9480f'
    )}</div>
    <div class="chart"><h2>Invariant Failure Rate Trend</h2>${buildSparkline(
      invariantValues,
      labels,
      '#862e9c'
    )}</div>
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

function commandQualityTrend(args) {
  const timelinePath = args.timeline;
  const snapshotPath = args.snapshot;
  const baselinePath = args.baseline;
  const gasProfilePath = args['gas-profile'];
  const coverageSummaryPath = args['coverage-summary'];
  const fuzzReportPath = args['fuzz-report'];
  const label = args.label;
  const maxGasRegression = args['max-gas-regression']
    ? Number.parseFloat(args['max-gas-regression'])
    : undefined;
  const minCoverage = args['min-coverage'] ? Number.parseFloat(args['min-coverage']) : undefined;
  const maxFuzzFailureRate = args['max-fuzz-failure-rate']
    ? Number.parseFloat(args['max-fuzz-failure-rate'])
    : undefined;
  const failOnViolation = args['fail-on-violation'] !== 'false';
  const chartOut = args['chart-out'];
  const chartTitle = args['chart-title'] || 'Dubhe Quality Trend';

  if (!timelinePath) {
    throw new Error('quality-trend requires --timeline <timelineFile>');
  }

  const gasReport = safeReadJson(gasProfilePath);
  const coverageSummary = safeReadText(coverageSummaryPath);
  const fuzzReport = safeReadJson(fuzzReportPath);
  const baselineSnapshot = safeReadJson(baselinePath);
  const existingTimeline = safeReadJson(timelinePath);

  const gasTotal = gasReport?.totals?.totalGas;
  const gasTests = gasReport?.totals?.tests;
  const coveragePct = coverageSummary ? parseCoveragePercentFromText(coverageSummary) : undefined;
  const fuzzTotal = fuzzReport?.total;
  const fuzzFailed = fuzzReport?.failed;
  const fuzzFailureRatePct = fuzzReport?.failureRatePct;

  const snapshot = {
    generatedAt: new Date().toISOString(),
    label,
    metrics: {
      gasTotal: typeof gasTotal === 'number' ? gasTotal : undefined,
      gasTests: typeof gasTests === 'number' ? gasTests : undefined,
      coveragePct: typeof coveragePct === 'number' ? coveragePct : undefined,
      fuzzTotal: typeof fuzzTotal === 'number' ? fuzzTotal : undefined,
      fuzzFailed: typeof fuzzFailed === 'number' ? fuzzFailed : undefined,
      fuzzFailureRatePct: typeof fuzzFailureRatePct === 'number' ? fuzzFailureRatePct : undefined
    },
    sources: {
      gasProfile: gasProfilePath,
      coverageSummary: coverageSummaryPath,
      fuzzReport: fuzzReportPath
    }
  };

  const timelineSnapshots = Array.isArray(existingTimeline?.snapshots)
    ? existingTimeline.snapshots
    : [];
  const previousSnapshot =
    baselineSnapshot && baselineSnapshot.metrics
      ? baselineSnapshot
      : timelineSnapshots[timelineSnapshots.length - 1];

  const gasDeltaPct = computeDeltaPct(
    previousSnapshot?.metrics?.gasTotal,
    snapshot.metrics.gasTotal
  );
  const coverageDeltaPct = computeDeltaPct(
    previousSnapshot?.metrics?.coveragePct,
    snapshot.metrics.coveragePct
  );
  const fuzzFailureRateDeltaPct = computeDeltaPct(
    previousSnapshot?.metrics?.fuzzFailureRatePct,
    snapshot.metrics.fuzzFailureRatePct
  );

  const violations = [];
  if (
    typeof maxGasRegression === 'number' &&
    typeof gasDeltaPct === 'number' &&
    gasDeltaPct > maxGasRegression
  ) {
    violations.push(
      `Gas regression ${gasDeltaPct.toFixed(2)}% exceeds threshold ${maxGasRegression.toFixed(2)}%`
    );
  }
  if (
    typeof minCoverage === 'number' &&
    typeof snapshot.metrics.coveragePct === 'number' &&
    snapshot.metrics.coveragePct < minCoverage
  ) {
    violations.push(
      `Coverage ${snapshot.metrics.coveragePct.toFixed(
        2
      )}% is below threshold ${minCoverage.toFixed(2)}%`
    );
  }
  if (
    typeof maxFuzzFailureRate === 'number' &&
    typeof snapshot.metrics.fuzzFailureRatePct === 'number' &&
    snapshot.metrics.fuzzFailureRatePct > maxFuzzFailureRate
  ) {
    violations.push(
      `Fuzz failure rate ${snapshot.metrics.fuzzFailureRatePct.toFixed(
        2
      )}% exceeds threshold ${maxFuzzFailureRate.toFixed(2)}%`
    );
  }

  const timeline = {
    version: 1,
    snapshots: [...timelineSnapshots, snapshot].slice(-200)
  };
  ensureParent(timelinePath);
  fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), 'utf-8');
  console.log(`Quality timeline updated: ${timelinePath}`);

  const evaluation = {
    gasDeltaPct,
    coverageDeltaPct,
    fuzzFailureRateDeltaPct,
    violations
  };

  if (snapshotPath) {
    ensureParent(snapshotPath);
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify({ snapshot, previousSnapshot, evaluation }, null, 2),
      'utf-8'
    );
    console.log(`Quality snapshot written: ${snapshotPath}`);
  }

  if (chartOut) {
    ensureParent(chartOut);
    fs.writeFileSync(chartOut, renderQualityTrendHtml(timeline, chartTitle), 'utf-8');
    console.log(`Quality trend chart written: ${chartOut}`);
  }

  console.log(
    `Quality snapshot: gasTotal=${snapshot.metrics.gasTotal ?? 'n/a'}, coverage=${
      typeof snapshot.metrics.coveragePct === 'number'
        ? `${snapshot.metrics.coveragePct.toFixed(2)}%`
        : 'n/a'
    }, fuzzFailureRate=${
      typeof snapshot.metrics.fuzzFailureRatePct === 'number'
        ? `${snapshot.metrics.fuzzFailureRatePct.toFixed(2)}%`
        : 'n/a'
    }`
  );

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`VIOLATION ${violation}`);
    }
    if (failOnViolation) {
      process.exit(1);
    }
  }
}

function renderDefaultTemplate() {
  return `# Dubhe Move Audit Report

- Generated At: {{GENERATED_AT}}
- Label: {{LABEL}}

## Quality Snapshot

- Gas Total: {{GAS_TOTAL}}
- Coverage: {{COVERAGE_PCT}}
- Fuzz Failure Rate: {{FUZZ_FAILURE_RATE_PCT}}

## Violations

{{VIOLATIONS}}
`;
}

function commandRenderAuditReport(args) {
  const output = args.output;
  if (!output) {
    throw new Error('render-audit-report requires --output <markdownFile>');
  }

  const templatePath = args.template;
  const snapshotPath = args.snapshot;
  const label = args.label || 'local';

  const snapshotPayload = safeReadJson(snapshotPath);
  const snapshot = snapshotPayload?.snapshot ?? snapshotPayload;
  const evaluation = snapshotPayload?.evaluation ?? { violations: [] };

  const template =
    templatePath && fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf-8')
      : renderDefaultTemplate();

  const violations = Array.isArray(evaluation?.violations) ? evaluation.violations : [];
  const violationText =
    violations.length === 0 ? '- none' : violations.map((item) => `- ${item}`).join('\n');

  const replacements = {
    GENERATED_AT: new Date().toISOString(),
    LABEL: label,
    GAS_TOTAL: snapshot?.metrics?.gasTotal ?? 'n/a',
    COVERAGE_PCT:
      typeof snapshot?.metrics?.coveragePct === 'number'
        ? `${snapshot.metrics.coveragePct.toFixed(2)}%`
        : 'n/a',
    FUZZ_FAILURE_RATE_PCT:
      typeof snapshot?.metrics?.fuzzFailureRatePct === 'number'
        ? `${snapshot.metrics.fuzzFailureRatePct.toFixed(2)}%`
        : 'n/a',
    VIOLATIONS: violationText
  };

  let rendered = template;
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(`{{${key}}}`, String(value));
  }

  ensureParent(output);
  fs.writeFileSync(output, rendered, 'utf-8');
  console.log(`Audit report written: ${output}`);
}

function main() {
  const [, , subcommand, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (subcommand) {
    case 'parse-gas':
      commandParseGas(args);
      return;
    case 'parse-fuzz':
      commandParseFuzz(args);
      return;
    case 'compare-gas':
      commandCompareGas(args);
      return;
    case 'check-coverage':
      commandCheckCoverage(args);
      return;
    case 'quality-trend':
      commandQualityTrend(args);
      return;
    case 'render-audit-report':
      commandRenderAuditReport(args);
      return;
    default:
      throw new Error(
        `Unknown subcommand "${subcommand}". Supported: parse-gas, parse-fuzz, compare-gas, check-coverage, quality-trend, render-audit-report`
      );
  }
}

main();
