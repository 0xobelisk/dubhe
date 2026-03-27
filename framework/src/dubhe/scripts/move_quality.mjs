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

function main() {
  const [, , subcommand, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (subcommand) {
    case 'parse-gas':
      commandParseGas(args);
      return;
    case 'compare-gas':
      commandCompareGas(args);
      return;
    case 'check-coverage':
      commandCheckCoverage(args);
      return;
    default:
      throw new Error(
        `Unknown subcommand "${subcommand}". Supported: parse-gas, compare-gas, check-coverage`
      );
  }
}

main();
