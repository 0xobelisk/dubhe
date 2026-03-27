import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildMoveAbortSourceHints, extractFailedMoveTests } from '../src/commands/debugUtils';
import { mergeInvariantCorpus, parseInvariantCorpus } from '../src/commands/qualityUtils';
import {
  evaluateQualitySnapshot,
  parseFailureStatsFromReport
} from '../src/commands/qualityTrendUtils';

describe('quality pipeline e2e', () => {
  it('debug stage resolves failing test and abort source hint', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-quality-e2e-'));
    try {
      const systemsDir = path.join(tempDir, 'sources', 'systems');
      fs.mkdirSync(systemsDir, { recursive: true });
      fs.writeFileSync(
        path.join(systemsDir, 'session_cap.move'),
        ['module dubhe::session_cap {', '  const E_SCOPE_MISMATCH: u64 = 7;', '}'].join('\n'),
        'utf-8'
      );

      const output = [
        '[ FAIL    ] dubhe::session_cap_test::test_scope_mismatch_detected',
        'Execution Error: Move abort in 0x2::session_cap::assert_scope with code 7'
      ].join('\n');

      const failedTests = extractFailedMoveTests(output);
      const hints = buildMoveAbortSourceHints(output, tempDir);
      expect(failedTests).toEqual(['dubhe::session_cap_test::test_scope_mismatch_detected']);
      expect(hints).toHaveLength(1);
      expect(hints[0].matchingErrorConstants).toEqual(['E_SCOPE_MISMATCH']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('invariant stage updates corpus and yields parseable failure stats', () => {
    const parsed = parseInvariantCorpus(
      JSON.stringify({
        version: 1,
        failingSeeds: [100, 101],
        minimalFailingSeeds: [100]
      })
    );
    const merged = mergeInvariantCorpus(parsed, [102, 101], 99);
    expect(merged.failingSeeds).toEqual([100, 101, 102]);
    expect(merged.minimalFailingSeeds).toEqual([99, 100]);

    const stats = parseFailureStatsFromReport({
      primaryResults: [
        { seed: 100, ok: false, durationMs: 1, output: '' },
        { seed: 101, ok: true, durationMs: 1, output: '' }
      ],
      shrinkResults: [{ seed: 99, ok: false, durationMs: 1, output: '' }],
      minimizationResults: []
    });
    expect(stats?.failed).toBe(2);
    expect(stats?.total).toBe(3);
  });

  it('quality trend stage flags regression and coverage drop', () => {
    const evaluation = evaluateQualitySnapshot(
      {
        generatedAt: 'prev',
        metrics: {
          gasTotal: 1000,
          coveragePct: 80,
          fuzzFailureRatePct: 0
        },
        sources: {}
      },
      {
        generatedAt: 'cur',
        metrics: {
          gasTotal: 1200,
          coveragePct: 70,
          fuzzFailureRatePct: 0
        },
        sources: {}
      },
      {
        maxGasRegressionPct: 10,
        minCoveragePct: 75
      }
    );

    expect(evaluation.violations.length).toBe(2);
    expect(evaluation.violations[0]).toContain('Gas regression');
    expect(evaluation.violations[1]).toContain('Coverage');
  });
});
