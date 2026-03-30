import { describe, expect, it } from 'vitest';
import {
  computeFailureRate,
  createEmptyInvariantCorpus,
  mergeInvariantCorpus,
  mergeSeedQueues,
  normalizeSeedList,
  parseInvariantCorpus
} from '../src/commands/qualityUtils';

describe('normalizeSeedList', () => {
  it('normalizes, deduplicates and sorts seeds', () => {
    expect(normalizeSeedList([5.9, -1, 3, 5, 3, Number.NaN])).toEqual([3, 5]);
  });
});

describe('mergeSeedQueues', () => {
  it('preserves first-seen order while deduplicating', () => {
    expect(mergeSeedQueues([10, 11, 12], [12, 9, 11, 13])).toEqual([10, 11, 12, 9, 13]);
  });
});

describe('parseInvariantCorpus', () => {
  it('parses valid corpus payload and normalizes seed arrays', () => {
    const parsed = parseInvariantCorpus(
      JSON.stringify({
        version: 1,
        updatedAt: '2026-03-27T00:00:00.000Z',
        failingSeeds: [7, 6, 7],
        minimalFailingSeeds: [3, 1, 3]
      })
    );
    expect(parsed.failingSeeds).toEqual([6, 7]);
    expect(parsed.minimalFailingSeeds).toEqual([1, 3]);
  });
});

describe('mergeInvariantCorpus', () => {
  it('updates corpus with failing and minimized seeds', () => {
    const base = createEmptyInvariantCorpus();
    const merged = mergeInvariantCorpus(base, [9, 12], 8);
    expect(merged.failingSeeds).toEqual([9, 12]);
    expect(merged.minimalFailingSeeds).toEqual([8]);
  });
});

describe('computeFailureRate', () => {
  it('computes total, failed and percentage', () => {
    const stats = computeFailureRate([
      { seed: 1, ok: true, durationMs: 1, output: '' },
      { seed: 2, ok: false, durationMs: 1, output: '' },
      { seed: 3, ok: false, durationMs: 1, output: '' }
    ]);
    expect(stats.total).toBe(3);
    expect(stats.failed).toBe(2);
    expect(stats.failureRatePct).toBeCloseTo(66.666, 2);
  });
});
