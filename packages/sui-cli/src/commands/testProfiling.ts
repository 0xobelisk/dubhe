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
