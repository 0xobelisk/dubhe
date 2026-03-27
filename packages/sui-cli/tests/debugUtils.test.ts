import { describe, expect, it } from 'vitest';
import { extractPotentialAbortHints } from '../src/commands/debugUtils';

describe('extractPotentialAbortHints', () => {
  it('extracts error and abort lines', () => {
    const output = [
      'some normal line',
      '[ FAIL    ] dubhe::module::test_case',
      'Execution Error: Move abort in 0x2::m::f with code 7',
      'error[W09001]: unused alias'
    ].join('\n');

    const hints = extractPotentialAbortHints(output);
    expect(hints.some((line) => line.includes('FAIL'))).toBe(true);
    expect(hints.some((line) => line.includes('Move abort'))).toBe(true);
    expect(hints.some((line) => line.includes('error['))).toBe(true);
  });
});
