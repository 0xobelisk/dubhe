import { describe, expect, it } from 'vitest';
import { matchesExpectedTestFailure, outputContainsAbortCode } from '../src/commands/test';

describe('outputContainsAbortCode', () => {
  it('detects common abort code patterns', () => {
    const output = [
      'Execution Error: Move abort in 0x2::m::f with code 7',
      '#[expected_failure(abort_code = 7)]'
    ].join('\n');
    expect(outputContainsAbortCode(output, 7)).toBe(true);
    expect(outputContainsAbortCode(output, 9)).toBe(false);
  });
});

describe('matchesExpectedTestFailure', () => {
  it('passes when pattern and abort code match', () => {
    const output = 'Move abort in 0x2::session_cap::assert_scope with code 7';
    const result = matchesExpectedTestFailure(output, {
      pattern: 'assert_scope',
      abortCode: 7
    });
    expect(result.ok).toBe(true);
  });

  it('fails when expected pattern is missing', () => {
    const output = 'Move abort in 0x2::session_cap::assert_scope with code 7';
    const result = matchesExpectedTestFailure(output, {
      pattern: 'E_SCOPE_MISMATCH',
      abortCode: 7
    });
    expect(result.ok).toBe(false);
  });
});
