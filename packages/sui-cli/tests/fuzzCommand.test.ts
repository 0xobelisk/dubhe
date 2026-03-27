import { describe, expect, it } from 'vitest';
import { formatFuzzSummary, generateFuzzSeeds } from '../src/commands/qualityUtils';

describe('generateFuzzSeeds', () => {
  it('generates deterministic sequence from base seed', () => {
    expect(generateFuzzSeeds(3, 100)).toEqual([100, 101, 102]);
  });

  it('uses replay seed as single-case override', () => {
    expect(generateFuzzSeeds(10, 100, 777)).toEqual([777]);
  });
});

describe('formatFuzzSummary', () => {
  it('includes failing seeds', () => {
    const text = formatFuzzSummary([
      { seed: 1, ok: true, durationMs: 10, output: '' },
      { seed: 2, ok: false, durationMs: 12, output: '', error: 'boom' }
    ]);
    expect(text).toContain('total=2');
    expect(text).toContain('failed=1');
    expect(text).toContain('seed=2');
  });
});
