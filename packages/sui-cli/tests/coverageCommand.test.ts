import { describe, expect, it } from 'vitest';
import { parseMoveCoveragePercent } from '../src/commands/qualityUtils';

describe('parseMoveCoveragePercent', () => {
  it('parses total move coverage from summary output', () => {
    const summary = [
      '+-------------------------+',
      '| Move Coverage Summary   |',
      '+-------------------------+',
      '| % Move Coverage: 73.42  |',
      '+-------------------------+'
    ].join('\n');

    expect(parseMoveCoveragePercent(summary)).toBe(73.42);
  });

  it('returns undefined when summary does not contain total coverage', () => {
    expect(parseMoveCoveragePercent('no coverage here')).toBeUndefined();
  });
});
