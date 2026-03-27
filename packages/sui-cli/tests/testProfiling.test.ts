import { describe, expect, it } from 'vitest';
import {
  formatGasStatisticsSummary,
  parseGasStatisticsCsv,
  resolveStatisticsMode,
  sortGasStatisticsByGas
} from '../src/commands/testProfiling';

describe('parseGasStatisticsCsv', () => {
  it('parses csv rows from sui move test output', () => {
    const output = [
      'Running Move unit tests',
      'name,nanos,gas',
      'pkg::t::a,1000,200',
      'pkg::t::b,500,300',
      '',
      'Test result: OK. Total tests: 2'
    ].join('\n');

    const rows = parseGasStatisticsCsv(output);
    expect(rows).toEqual([
      { name: 'pkg::t::a', nanos: 1000, gas: 200 },
      { name: 'pkg::t::b', nanos: 500, gas: 300 }
    ]);
  });

  it('returns empty list when csv header is missing', () => {
    const rows = parseGasStatisticsCsv('Test result: OK');
    expect(rows).toEqual([]);
  });
});

describe('gas statistics helpers', () => {
  it('sorts rows by gas descending', () => {
    const rows = sortGasStatisticsByGas([
      { name: 'a', nanos: 1, gas: 1 },
      { name: 'b', nanos: 1, gas: 5 },
      { name: 'c', nanos: 1, gas: 3 }
    ]);
    expect(rows.map((row) => row.name)).toEqual(['b', 'c', 'a']);
  });

  it('formats summary output with totals', () => {
    const text = formatGasStatisticsSummary(
      [
        { name: 'a', nanos: 2_000_000, gas: 10 },
        { name: 'b', nanos: 4_000_000, gas: 30 }
      ],
      1
    );
    expect(text).toContain('Gas profiling (top 1/2 by gas)');
    expect(text).toContain('b');
    expect(text).toContain('Total: 40 gas across 2 tests');
  });
});

describe('resolveStatisticsMode', () => {
  it('uses csv when profile-gas is enabled', () => {
    expect(resolveStatisticsMode('text', true)).toBe('csv');
  });

  it('keeps user-provided statistics when profile-gas is disabled', () => {
    expect(resolveStatisticsMode('text', false)).toBe('text');
    expect(resolveStatisticsMode('csv', false)).toBe('csv');
  });
});
