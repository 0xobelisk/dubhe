import fs from 'fs';
import path from 'path';

export type GasStatisticRow = {
  name: string;
  nanos: number;
  gas: number;
};

export type GasProfileReport = {
  generatedAt: string;
  rows: GasStatisticRow[];
  topByGas: GasStatisticRow[];
  totals: {
    tests: number;
    totalGas: number;
    totalNanos: number;
  };
};

export type GasRegressionItem = {
  name: string;
  baselineGas: number;
  currentGas: number;
  deltaGas: number;
  deltaPct: number;
};

export type GasRegressionResult = {
  thresholdPct: number;
  totalCompared: number;
  regressions: GasRegressionItem[];
  improvements: GasRegressionItem[];
  unchanged: number;
  newTests: string[];
  missingTests: string[];
};

export type GasModuleHotspot = {
  module: string;
  tests: number;
  totalGas: number;
  totalNanos: number;
  avgGas: number;
  avgNanos: number;
  maxGasTest: string;
  maxGas: number;
};

export type GasRegressionHotspot = {
  module: string;
  regressions: number;
  totalDeltaGas: number;
  avgDeltaPct: number;
  maxDeltaPct: number;
  maxDeltaTest: string;
};

export type GasProfileHtmlOptions = {
  title?: string;
  comparison?: GasRegressionResult;
  moduleHotspots?: GasModuleHotspot[];
};

export type GasFlamegraphOptions = {
  title?: string;
  width?: number;
  maxModules?: number;
  maxTestsPerModule?: number;
};

export function resolveStatisticsMode(
  statistics: 'text' | 'csv' | undefined,
  profileGas: boolean | undefined
): 'text' | 'csv' | undefined {
  if (profileGas) return 'csv';
  return statistics;
}

export function parseGasStatisticsCsv(output: string): GasStatisticRow[] {
  const lines = output.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().toLowerCase() === 'name,nanos,gas');

  if (headerIndex === -1) return [];

  const rows: GasStatisticRow[] = [];
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

export function sortGasStatisticsByGas(rows: GasStatisticRow[]): GasStatisticRow[] {
  return [...rows].sort((a, b) => b.gas - a.gas);
}

export function extractGasModuleName(testName: string): string {
  const parts = testName.split('::').filter(Boolean);
  if (parts.length <= 1) return testName;
  return parts.slice(0, -1).join('::');
}

export function buildGasModuleHotspots(rows: GasStatisticRow[]): GasModuleHotspot[] {
  const map = new Map<
    string,
    {
      tests: number;
      totalGas: number;
      totalNanos: number;
      maxGasTest: string;
      maxGas: number;
    }
  >();

  for (const row of rows) {
    const module = extractGasModuleName(row.name);
    const current = map.get(module);
    if (!current) {
      map.set(module, {
        tests: 1,
        totalGas: row.gas,
        totalNanos: row.nanos,
        maxGasTest: row.name,
        maxGas: row.gas
      });
      continue;
    }
    current.tests += 1;
    current.totalGas += row.gas;
    current.totalNanos += row.nanos;
    if (row.gas > current.maxGas) {
      current.maxGas = row.gas;
      current.maxGasTest = row.name;
    }
  }

  const hotspots: GasModuleHotspot[] = [];
  for (const [module, current] of map.entries()) {
    hotspots.push({
      module,
      tests: current.tests,
      totalGas: current.totalGas,
      totalNanos: current.totalNanos,
      avgGas: current.totalGas / current.tests,
      avgNanos: current.totalNanos / current.tests,
      maxGasTest: current.maxGasTest,
      maxGas: current.maxGas
    });
  }

  hotspots.sort((a, b) => {
    if (b.totalGas !== a.totalGas) return b.totalGas - a.totalGas;
    if (b.avgGas !== a.avgGas) return b.avgGas - a.avgGas;
    return a.module.localeCompare(b.module);
  });
  return hotspots;
}

export function formatGasStatisticsSummary(rows: GasStatisticRow[], topN: number = 10): string {
  if (rows.length === 0) {
    return 'Gas profiling: no csv statistics found in output.';
  }

  const normalizedTopN = Math.max(1, Math.floor(topN));
  const ranked = sortGasStatisticsByGas(rows);
  const topRows = ranked.slice(0, normalizedTopN);
  const totalGas = rows.reduce((sum, row) => sum + row.gas, 0);
  const totalNanos = rows.reduce((sum, row) => sum + row.nanos, 0);

  const lines: string[] = [];
  lines.push(`\nGas profiling (top ${topRows.length}/${rows.length} by gas):`);
  for (let i = 0; i < topRows.length; i++) {
    const row = topRows[i];
    const gas = row.gas.toLocaleString('en-US').padStart(12);
    const ms = (row.nanos / 1_000_000).toFixed(3).padStart(10);
    lines.push(`${String(i + 1).padStart(2)}. ${gas} gas | ${ms} ms | ${row.name}`);
  }
  lines.push(
    `Total: ${totalGas.toLocaleString('en-US')} gas across ${rows.length} tests (${(
      totalNanos / 1_000_000
    ).toFixed(3)} ms)`
  );

  return lines.join('\n');
}

export function formatGasModuleHotspotSummary(rows: GasStatisticRow[], topN: number = 10): string {
  if (rows.length === 0) {
    return 'Gas module hotspots: no csv statistics found in output.';
  }
  const hotspots = buildGasModuleHotspots(rows);
  const normalizedTopN = Math.max(1, Math.floor(topN));
  const topHotspots = hotspots.slice(0, normalizedTopN);

  const lines: string[] = [];
  lines.push(`\nGas module hotspots (top ${topHotspots.length}/${hotspots.length} by total gas):`);
  for (let i = 0; i < topHotspots.length; i++) {
    const hotspot = topHotspots[i];
    const gas = hotspot.totalGas.toLocaleString('en-US').padStart(12);
    const avgGas = hotspot.avgGas.toFixed(2).padStart(10);
    lines.push(
      `${String(i + 1).padStart(2)}. ${gas} gas | avg=${avgGas} | tests=${String(
        hotspot.tests
      ).padStart(3)} | ${hotspot.module}`
    );
  }

  return lines.join('\n');
}

export function buildGasProfileReport(rows: GasStatisticRow[], topN: number): GasProfileReport {
  const normalizedTopN = Math.max(1, Math.floor(topN));
  const ranked = sortGasStatisticsByGas(rows);
  return {
    generatedAt: new Date().toISOString(),
    rows,
    topByGas: ranked.slice(0, normalizedTopN),
    totals: {
      tests: rows.length,
      totalGas: rows.reduce((sum, row) => sum + row.gas, 0),
      totalNanos: rows.reduce((sum, row) => sum + row.nanos, 0)
    }
  };
}

export function writeGasProfileReport(filePath: string, report: GasProfileReport): void {
  const outputDir = path.dirname(filePath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
}

export function readGasProfileReport(filePath: string): GasProfileReport {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content) as GasProfileReport;
  return parsed;
}

export function compareGasAgainstBaseline(
  currentRows: GasStatisticRow[],
  baselineRows: GasStatisticRow[],
  thresholdPct: number
): GasRegressionResult {
  const baselineMap = new Map<string, GasStatisticRow>(baselineRows.map((row) => [row.name, row]));
  const currentMap = new Map<string, GasStatisticRow>(currentRows.map((row) => [row.name, row]));
  const regressions: GasRegressionItem[] = [];
  const improvements: GasRegressionItem[] = [];
  let unchanged = 0;
  let totalCompared = 0;

  for (const [name, current] of currentMap.entries()) {
    const baseline = baselineMap.get(name);
    if (!baseline) continue;

    totalCompared += 1;
    const deltaGas = current.gas - baseline.gas;
    const deltaPct =
      baseline.gas === 0 ? (deltaGas > 0 ? 100 : 0) : (deltaGas / baseline.gas) * 100;

    if (deltaPct > thresholdPct) {
      regressions.push({
        name,
        baselineGas: baseline.gas,
        currentGas: current.gas,
        deltaGas,
        deltaPct
      });
      continue;
    }

    if (deltaPct < 0) {
      improvements.push({
        name,
        baselineGas: baseline.gas,
        currentGas: current.gas,
        deltaGas,
        deltaPct
      });
      continue;
    }

    unchanged += 1;
  }

  const newTests = currentRows
    .map((row) => row.name)
    .filter((name) => !baselineMap.has(name))
    .sort();
  const missingTests = baselineRows
    .map((row) => row.name)
    .filter((name) => !currentMap.has(name))
    .sort();

  regressions.sort((a, b) => b.deltaPct - a.deltaPct);
  improvements.sort((a, b) => a.deltaPct - b.deltaPct);

  return {
    thresholdPct,
    totalCompared,
    regressions,
    improvements,
    unchanged,
    newTests,
    missingTests
  };
}

export function buildGasRegressionHotspots(
  regressions: GasRegressionItem[]
): GasRegressionHotspot[] {
  const map = new Map<
    string,
    {
      regressions: number;
      totalDeltaGas: number;
      totalDeltaPct: number;
      maxDeltaPct: number;
      maxDeltaTest: string;
    }
  >();

  for (const item of regressions) {
    const module = extractGasModuleName(item.name);
    const current = map.get(module);
    if (!current) {
      map.set(module, {
        regressions: 1,
        totalDeltaGas: item.deltaGas,
        totalDeltaPct: item.deltaPct,
        maxDeltaPct: item.deltaPct,
        maxDeltaTest: item.name
      });
      continue;
    }
    current.regressions += 1;
    current.totalDeltaGas += item.deltaGas;
    current.totalDeltaPct += item.deltaPct;
    if (item.deltaPct > current.maxDeltaPct) {
      current.maxDeltaPct = item.deltaPct;
      current.maxDeltaTest = item.name;
    }
  }

  const hotspots: GasRegressionHotspot[] = [];
  for (const [module, current] of map.entries()) {
    hotspots.push({
      module,
      regressions: current.regressions,
      totalDeltaGas: current.totalDeltaGas,
      avgDeltaPct: current.totalDeltaPct / current.regressions,
      maxDeltaPct: current.maxDeltaPct,
      maxDeltaTest: current.maxDeltaTest
    });
  }

  hotspots.sort((a, b) => {
    if (b.totalDeltaGas !== a.totalDeltaGas) return b.totalDeltaGas - a.totalDeltaGas;
    if (b.maxDeltaPct !== a.maxDeltaPct) return b.maxDeltaPct - a.maxDeltaPct;
    return a.module.localeCompare(b.module);
  });
  return hotspots;
}

export function formatGasRegressionHotspotSummary(
  regressions: GasRegressionItem[],
  maxRows: number = 10
): string {
  if (regressions.length === 0) return '';

  const normalizedMaxRows = Math.max(1, Math.floor(maxRows));
  const hotspots = buildGasRegressionHotspots(regressions).slice(0, normalizedMaxRows);
  const lines: string[] = [];
  lines.push('Regression hotspots by module:');
  for (const item of hotspots) {
    lines.push(
      `  - ${item.module}: deltaGas=${item.totalDeltaGas >= 0 ? '+' : ''}${
        item.totalDeltaGas
      }, regressions=${item.regressions}, avgDeltaPct=${item.avgDeltaPct.toFixed(
        2
      )}%, max=${item.maxDeltaPct.toFixed(2)}% (${item.maxDeltaTest})`
    );
  }
  return lines.join('\n');
}

export function formatGasRegressionSummary(
  result: GasRegressionResult,
  maxRows: number = 10
): string {
  const lines: string[] = [];
  lines.push(
    `\nGas baseline check: compared=${result.totalCompared}, regressions=${result.regressions.length}, improvements=${result.improvements.length}, unchanged=${result.unchanged}, threshold=${result.thresholdPct}%`
  );

  if (result.regressions.length > 0) {
    lines.push('Regressions:');
    for (const row of result.regressions.slice(0, maxRows)) {
      lines.push(
        `  - ${row.name}: ${row.baselineGas} -> ${row.currentGas} (${row.deltaGas >= 0 ? '+' : ''}${
          row.deltaGas
        }, ${row.deltaPct.toFixed(2)}%)`
      );
    }
    if (result.regressions.length > maxRows) {
      lines.push(`  ... ${result.regressions.length - maxRows} more regressions`);
    }
    const hotspotSummary = formatGasRegressionHotspotSummary(result.regressions, maxRows);
    if (hotspotSummary) lines.push(hotspotSummary);
  }

  if (result.improvements.length > 0) {
    lines.push('Improvements:');
    for (const row of result.improvements.slice(0, maxRows)) {
      lines.push(
        `  - ${row.name}: ${row.baselineGas} -> ${row.currentGas} (${row.deltaGas >= 0 ? '+' : ''}${
          row.deltaGas
        }, ${row.deltaPct.toFixed(2)}%)`
      );
    }
    if (result.improvements.length > maxRows) {
      lines.push(`  ... ${result.improvements.length - maxRows} more improvements`);
    }
  }

  if (result.newTests.length > 0) {
    lines.push(
      `New tests (${result.newTests.length}): ${result.newTests.slice(0, maxRows).join(', ')}`
    );
    if (result.newTests.length > maxRows) {
      lines.push(`  ... ${result.newTests.length - maxRows} more new tests`);
    }
  }

  if (result.missingTests.length > 0) {
    lines.push(
      `Missing tests (${result.missingTests.length}): ${result.missingTests
        .slice(0, maxRows)
        .join(', ')}`
    );
    if (result.missingTests.length > maxRows) {
      lines.push(`  ... ${result.missingTests.length - maxRows} more missing tests`);
    }
  }

  return lines.join('\n');
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function colorFromLabel(label: string, saturation: number, lightness: number): string {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function renderGasFlamegraphSvg(
  report: GasProfileReport,
  options: GasFlamegraphOptions = {}
): string {
  const width = Math.max(600, Math.floor(options.width ?? 1400));
  const title = options.title || 'Dubhe Gas Flamegraph';
  const maxModules = Math.max(1, Math.floor(options.maxModules ?? 12));
  const maxTestsPerModule = Math.max(1, Math.floor(options.maxTestsPerModule ?? 10));
  const rows = sortGasStatisticsByGas(report.rows);

  if (rows.length === 0 || report.totals.totalGas <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="80" viewBox="0 0 ${width} 80">
  <rect x="0" y="0" width="${width}" height="80" fill="#f7fbff" />
  <text x="14" y="30" font-family="IBM Plex Sans, Helvetica Neue, Arial, sans-serif" font-size="18" fill="#102a43">${escapeHtml(
    title
  )}</text>
  <text x="14" y="56" font-family="IBM Plex Sans, Helvetica Neue, Arial, sans-serif" font-size="13" fill="#486581">No gas rows found.</text>
</svg>`;
  }

  const moduleHotspots = buildGasModuleHotspots(rows).slice(0, maxModules);
  const visibleModuleGas = moduleHotspots.reduce((sum, item) => sum + item.totalGas, 0);
  const hiddenGas = Math.max(0, report.totals.totalGas - visibleModuleGas);
  const moduleEntries =
    hiddenGas > 0
      ? [...moduleHotspots, { module: '(other modules)', totalGas: hiddenGas }]
      : moduleHotspots;
  const barX = 20;
  const barWidth = width - barX * 2;
  const rootY = 44;
  const rowHeight = 28;
  const moduleY = rootY + rowHeight + 6;
  const testY = moduleY + rowHeight + 6;
  const svgHeight = testY + rowHeight + 26;
  const rootLabel = `all tests (${report.totals.tests})`;

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}" viewBox="0 0 ${width} ${svgHeight}">`
  );
  lines.push(`  <rect x="0" y="0" width="${width}" height="${svgHeight}" fill="#f7fbff" />`);
  lines.push(
    `  <text x="${barX}" y="26" font-family="IBM Plex Sans, Helvetica Neue, Arial, sans-serif" font-size="18" fill="#102a43">${escapeHtml(
      title
    )}</text>`
  );
  lines.push(
    `  <text x="${barX}" y="40" font-family="IBM Plex Sans, Helvetica Neue, Arial, sans-serif" font-size="12" fill="#486581">totalGas=${report.totals.totalGas.toLocaleString(
      'en-US'
    )}, tests=${report.totals.tests}</text>`
  );

  const rootColor = '#0b69a3';
  lines.push(
    `  <rect x="${barX}" y="${rootY}" width="${barWidth}" height="${rowHeight}" rx="4" ry="4" fill="${rootColor}" />`
  );
  lines.push(
    `  <title>${escapeHtml(
      `${rootLabel} | gas=${report.totals.totalGas.toLocaleString('en-US')}`
    )}</title>`
  );
  lines.push(
    `  <text x="${barX + 8}" y="${
      rootY + 18
    }" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="11" fill="#ffffff">${escapeHtml(
      rootLabel
    )}</text>`
  );

  let moduleX = barX;
  for (let moduleIndex = 0; moduleIndex < moduleEntries.length; moduleIndex += 1) {
    const moduleEntry = moduleEntries[moduleIndex];
    const moduleWidth =
      moduleIndex === moduleEntries.length - 1
        ? barX + barWidth - moduleX
        : Math.max(1, Math.round((moduleEntry.totalGas / report.totals.totalGas) * barWidth));
    if (moduleWidth <= 0) continue;
    const moduleColor = colorFromLabel(moduleEntry.module, 62, 48);
    lines.push(
      `  <rect x="${moduleX}" y="${moduleY}" width="${moduleWidth}" height="${rowHeight}" rx="3" ry="3" fill="${moduleColor}" />`
    );
    lines.push(
      `  <title>${escapeHtml(
        `${moduleEntry.module} | gas=${moduleEntry.totalGas.toLocaleString('en-US')}`
      )}</title>`
    );
    if (moduleWidth > 90) {
      lines.push(
        `  <text x="${moduleX + 6}" y="${
          moduleY + 18
        }" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="10" fill="#ffffff">${escapeHtml(
          moduleEntry.module
        )}</text>`
      );
    }

    if (moduleEntry.module !== '(other modules)') {
      const moduleRows = rows.filter(
        (row) => extractGasModuleName(row.name) === moduleEntry.module
      );
      const topModuleRows = moduleRows.slice(0, maxTestsPerModule);
      const hiddenModuleGas = Math.max(
        0,
        moduleEntry.totalGas - topModuleRows.reduce((sum, row) => sum + row.gas, 0)
      );
      const testEntries =
        hiddenModuleGas > 0
          ? [
              ...topModuleRows.map((row) => ({ label: row.name, gas: row.gas })),
              { label: '(other tests)', gas: hiddenModuleGas }
            ]
          : topModuleRows.map((row) => ({ label: row.name, gas: row.gas }));

      let testX = moduleX;
      for (let testIndex = 0; testIndex < testEntries.length; testIndex += 1) {
        const testEntry = testEntries[testIndex];
        const testWidth =
          testIndex === testEntries.length - 1
            ? moduleX + moduleWidth - testX
            : Math.max(1, Math.round((testEntry.gas / moduleEntry.totalGas) * moduleWidth));
        if (testWidth <= 0) continue;
        const testColor = colorFromLabel(testEntry.label, 58, 62);
        lines.push(
          `  <rect x="${testX}" y="${testY}" width="${testWidth}" height="${rowHeight}" rx="2" ry="2" fill="${testColor}" />`
        );
        lines.push(
          `  <title>${escapeHtml(
            `${testEntry.label} | gas=${testEntry.gas.toLocaleString('en-US')}`
          )}</title>`
        );
        if (testWidth > 120) {
          lines.push(
            `  <text x="${testX + 4}" y="${
              testY + 17
            }" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="9" fill="#102a43">${escapeHtml(
              testEntry.label
            )}</text>`
          );
        }
        testX += testWidth;
      }
    }

    moduleX += moduleWidth;
  }

  lines.push('</svg>');
  return lines.join('\n');
}

export function renderGasProfileHtml(
  report: GasProfileReport,
  options: GasProfileHtmlOptions = {}
): string {
  const rows = sortGasStatisticsByGas(report.rows);
  const maxGas = rows.reduce((acc, row) => Math.max(acc, row.gas), 1);
  const title = options.title || 'Dubhe Gas Profile';
  const moduleHotspots = options.moduleHotspots || buildGasModuleHotspots(report.rows);
  const comparison = options.comparison;

  const rowHtml = rows
    .slice(0, 80)
    .map((row) => {
      const widthPct = Math.max(1, Math.round((row.gas / maxGas) * 100));
      return `<tr>
  <td><code>${escapeHtml(row.name)}</code></td>
  <td style="text-align:right">${row.gas.toLocaleString('en-US')}</td>
  <td style="text-align:right">${(row.nanos / 1_000_000).toFixed(3)}</td>
  <td><div class="bar"><span style="width:${widthPct}%"></span></div></td>
</tr>`;
    })
    .join('\n');

  const moduleRows = moduleHotspots
    .slice(0, 40)
    .map((row) => {
      return `<tr>
  <td>${escapeHtml(row.module)}</td>
  <td style="text-align:right">${row.tests}</td>
  <td style="text-align:right">${row.totalGas.toLocaleString('en-US')}</td>
  <td style="text-align:right">${row.avgGas.toFixed(2)}</td>
  <td><code>${escapeHtml(row.maxGasTest)}</code></td>
</tr>`;
    })
    .join('\n');

  const regressionRows =
    comparison && comparison.regressions.length > 0
      ? comparison.regressions
          .slice(0, 40)
          .map((item) => {
            return `<tr>
  <td><code>${escapeHtml(item.name)}</code></td>
  <td style="text-align:right">${item.baselineGas.toLocaleString('en-US')}</td>
  <td style="text-align:right">${item.currentGas.toLocaleString('en-US')}</td>
  <td style="text-align:right">${item.deltaGas >= 0 ? '+' : ''}${item.deltaGas.toLocaleString(
              'en-US'
            )}</td>
  <td style="text-align:right">${item.deltaPct.toFixed(2)}%</td>
</tr>`;
          })
          .join('\n')
      : '<tr><td colspan="5">No regressions above threshold.</td></tr>';

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
      .panel {
        background: #fff;
        border: 1px solid #d9e2ec;
        padding: 12px;
        margin-bottom: 14px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th, td {
        border-bottom: 1px solid #d9e2ec;
        padding: 8px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        background: #d9e2ec;
      }
      .bar {
        width: 100%;
        height: 9px;
        background: #e4edf5;
        border-radius: 999px;
      }
      .bar > span {
        display: block;
        height: 9px;
        border-radius: 999px;
        background: linear-gradient(90deg, #0b69a3 0%, #2f9e44 100%);
      }
      code {
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated at: ${escapeHtml(report.generatedAt)}</p>
    <div class="panel">
      <h2>Totals</h2>
      <p>Tests: ${report.totals.tests}, Total Gas: ${report.totals.totalGas.toLocaleString(
    'en-US'
  )}, Total Time: ${(report.totals.totalNanos / 1_000_000).toFixed(3)} ms</p>
    </div>
    <div class="panel">
      <h2>Top Test Hotspots</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Gas</th>
            <th>Time (ms)</th>
            <th>Heat</th>
          </tr>
        </thead>
        <tbody>
${rowHtml}
        </tbody>
      </table>
    </div>
    <div class="panel">
      <h2>Module Hotspots</h2>
      <table>
        <thead>
          <tr>
            <th>Module</th>
            <th>Tests</th>
            <th>Total Gas</th>
            <th>Avg Gas</th>
            <th>Max Test</th>
          </tr>
        </thead>
        <tbody>
${moduleRows}
        </tbody>
      </table>
    </div>
    <div class="panel">
      <h2>Regressions</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Baseline</th>
            <th>Current</th>
            <th>Delta Gas</th>
            <th>Delta %</th>
          </tr>
        </thead>
        <tbody>
${regressionRows}
        </tbody>
      </table>
    </div>
  </body>
</html>`;
}
