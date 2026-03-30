import { describe, expect, it } from 'vitest';
import {
  appendQualitySnapshot,
  evaluateQualitySnapshot,
  parseFailureStatsFromReport,
  parseGasTotals,
  renderQualityTrendHtml
} from '../src/commands/qualityTrendUtils';

describe('parseGasTotals', () => {
  it('reads total gas and tests from gas profile report', () => {
    const parsed = parseGasTotals({
      totals: {
        tests: 3,
        totalGas: 999
      }
    });
    expect(parsed).toEqual({ tests: 3, totalGas: 999 });
  });
});

describe('parseFailureStatsFromReport', () => {
  it('aggregates failure rate from invariant-style report arrays', () => {
    const stats = parseFailureStatsFromReport({
      primaryResults: [
        { seed: 1, ok: true, durationMs: 1, output: '' },
        { seed: 2, ok: false, durationMs: 1, output: '' }
      ],
      shrinkResults: [{ seed: 3, ok: true, durationMs: 1, output: '' }],
      minimizationResults: [{ seed: 4, ok: false, durationMs: 1, output: '' }]
    });
    expect(stats?.total).toBe(4);
    expect(stats?.failed).toBe(2);
    expect(stats?.failureRatePct).toBeCloseTo(50, 4);
  });
});

describe('appendQualitySnapshot', () => {
  it('keeps only latest maxHistory snapshots', () => {
    const timeline = appendQualitySnapshot(
      {
        version: 1,
        snapshots: [
          { generatedAt: 't1', metrics: {}, sources: {} },
          { generatedAt: 't2', metrics: {}, sources: {} }
        ]
      },
      { generatedAt: 't3', metrics: {}, sources: {} },
      2
    );
    expect(timeline.snapshots.map((item) => item.generatedAt)).toEqual(['t2', 't3']);
  });
});

describe('evaluateQualitySnapshot', () => {
  it('reports threshold violations', () => {
    const evaluation = evaluateQualitySnapshot(
      {
        generatedAt: 'prev',
        metrics: {
          gasTotal: 1000,
          coveragePct: 80,
          fuzzFailureRatePct: 2,
          invariantFailureRatePct: 1
        },
        sources: {}
      },
      {
        generatedAt: 'cur',
        metrics: {
          gasTotal: 1200,
          coveragePct: 70,
          fuzzFailureRatePct: 8,
          invariantFailureRatePct: 5
        },
        sources: {}
      },
      {
        maxGasRegressionPct: 10,
        minCoveragePct: 75,
        maxFuzzFailureRatePct: 5,
        maxInvariantFailureRatePct: 3
      }
    );

    expect(evaluation.violations.length).toBe(4);
    expect(evaluation.violations.some((item) => item.includes('Gas regression'))).toBe(true);
    expect(evaluation.violations.some((item) => item.includes('Coverage'))).toBe(true);
  });
});

describe('renderQualityTrendHtml', () => {
  it('renders chart sections and timeline table', () => {
    const html = renderQualityTrendHtml(
      {
        version: 1,
        snapshots: [
          {
            generatedAt: '2026-03-27T00:00:00.000Z',
            label: 'baseline',
            metrics: {
              gasTotal: 1000,
              coveragePct: 72.5,
              fuzzFailureRatePct: 0,
              invariantFailureRatePct: 0
            },
            sources: {}
          },
          {
            generatedAt: '2026-03-27T01:00:00.000Z',
            label: 'current',
            metrics: {
              gasTotal: 1100,
              coveragePct: 73.25,
              fuzzFailureRatePct: 1.2,
              invariantFailureRatePct: 0.4
            },
            sources: {}
          }
        ]
      },
      'Trend Title'
    );

    expect(html).toContain('Trend Title');
    expect(html).toContain('Gas Total Trend');
    expect(html).toContain('Coverage Trend');
    expect(html).toContain('Fuzz Failure Rate Trend');
    expect(html).toContain('Invariant Failure Rate Trend');
    expect(html).toContain('<table>');
    expect(html).toContain('baseline');
    expect(html).toContain('current');
  });
});
