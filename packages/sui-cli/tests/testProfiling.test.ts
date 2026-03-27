import { describe, expect, it } from 'vitest';
import {
  buildGasModuleHotspots,
  buildGasRegressionHotspots,
  compareGasAgainstBaseline,
  extractGasModuleName,
  formatGasModuleHotspotSummary,
  formatGasRegressionSummary,
  formatGasStatisticsSummary,
  parseGasStatisticsCsv,
  renderGasProfileHtml,
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

  it('extracts module name from test name', () => {
    expect(extractGasModuleName('pkg::session_test::test_create')).toBe('pkg::session_test');
    expect(extractGasModuleName('single_name')).toBe('single_name');
  });

  it('builds module hotspots and formats summary', () => {
    const rows = [
      { name: 'pkg::a::t1', nanos: 1_000_000, gas: 100 },
      { name: 'pkg::a::t2', nanos: 2_000_000, gas: 300 },
      { name: 'pkg::b::t1', nanos: 1_500_000, gas: 200 }
    ];
    const hotspots = buildGasModuleHotspots(rows);
    expect(hotspots[0].module).toBe('pkg::a');
    expect(hotspots[0].totalGas).toBe(400);

    const summary = formatGasModuleHotspotSummary(rows, 2);
    expect(summary).toContain('Gas module hotspots');
    expect(summary).toContain('pkg::a');
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

describe('baseline gas regression', () => {
  it('detects regressions and improvements by threshold', () => {
    const result = compareGasAgainstBaseline(
      [
        { name: 'a', nanos: 1000, gas: 140 },
        { name: 'b', nanos: 1000, gas: 80 },
        { name: 'c', nanos: 1000, gas: 50 }
      ],
      [
        { name: 'a', nanos: 900, gas: 100 },
        { name: 'b', nanos: 900, gas: 100 },
        { name: 'd', nanos: 900, gas: 70 }
      ],
      20
    );

    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].name).toBe('a');
    expect(result.improvements).toHaveLength(1);
    expect(result.improvements[0].name).toBe('b');
    expect(result.newTests).toEqual(['c']);
    expect(result.missingTests).toEqual(['d']);

    const summary = formatGasRegressionSummary(result, 10);
    expect(summary).toContain('Gas baseline check');
    expect(summary).toContain('Regressions:');
    expect(summary).toContain('Improvements:');
    expect(summary).toContain('Regression hotspots by module:');
  });

  it('builds regression hotspots by module', () => {
    const hotspots = buildGasRegressionHotspots([
      {
        name: 'pkg::session_test::test_a',
        baselineGas: 100,
        currentGas: 160,
        deltaGas: 60,
        deltaPct: 60
      },
      {
        name: 'pkg::session_test::test_b',
        baselineGas: 200,
        currentGas: 260,
        deltaGas: 60,
        deltaPct: 30
      },
      {
        name: 'pkg::address_test::test_a',
        baselineGas: 100,
        currentGas: 140,
        deltaGas: 40,
        deltaPct: 40
      }
    ]);
    expect(hotspots[0].module).toBe('pkg::session_test');
    expect(hotspots[0].totalDeltaGas).toBe(120);
    expect(hotspots[0].regressions).toBe(2);
  });
});

describe('renderGasProfileHtml', () => {
  it('renders test/module/regression sections', () => {
    const html = renderGasProfileHtml(
      {
        generatedAt: '2026-03-28T00:00:00.000Z',
        rows: [
          { name: 'pkg::a::t1', nanos: 1000, gas: 100 },
          { name: 'pkg::a::t2', nanos: 1200, gas: 200 }
        ],
        topByGas: [{ name: 'pkg::a::t2', nanos: 1200, gas: 200 }],
        totals: { tests: 2, totalGas: 300, totalNanos: 2200 }
      },
      {
        title: 'Gas Report',
        comparison: {
          thresholdPct: 10,
          totalCompared: 1,
          regressions: [
            {
              name: 'pkg::a::t2',
              baselineGas: 150,
              currentGas: 200,
              deltaGas: 50,
              deltaPct: 33.33
            }
          ],
          improvements: [],
          unchanged: 0,
          newTests: [],
          missingTests: []
        }
      }
    );

    expect(html).toContain('Gas Report');
    expect(html).toContain('Top Test Hotspots');
    expect(html).toContain('Module Hotspots');
    expect(html).toContain('Regressions');
    expect(html).toContain('pkg::a::t2');
  });
});
