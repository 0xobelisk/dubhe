import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildMoveAbortSourceHints,
  extractFailedMoveTests,
  extractMoveAbortRecords,
  extractPotentialAbortHints
} from '../src/commands/debugUtils';

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

describe('extractFailedMoveTests', () => {
  it('parses [ FAIL ] style lines', () => {
    const output = [
      '[ FAIL    ] dubhe::session_cap_test::test_scope_mismatch_detected',
      '[ PASS    ] dubhe::session_cap_test::test_revoke_session_cap'
    ].join('\n');
    const failed = extractFailedMoveTests(output);
    expect(failed).toEqual(['dubhe::session_cap_test::test_scope_mismatch_detected']);
  });
});

describe('extractMoveAbortRecords', () => {
  it('parses move abort module path and code', () => {
    const output = 'Execution Error: Move abort in 0x2::session_cap::assert_scope with code 7';
    const records = extractMoveAbortRecords(output);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      modulePath: '0x2::session_cap::assert_scope',
      moduleName: 'session_cap',
      functionName: 'assert_scope',
      abortCode: 7
    });
  });
});

describe('buildMoveAbortSourceHints', () => {
  it('maps abort code to local move source constants', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-utils-'));
    try {
      const sourcesDir = path.join(tempDir, 'sources', 'systems');
      fs.mkdirSync(sourcesDir, { recursive: true });
      const moveFile = path.join(sourcesDir, 'session_cap.move');
      fs.writeFileSync(
        moveFile,
        [
          'module dubhe::session_cap {',
          '  const E_SCOPE_MISMATCH: u64 = 7;',
          '  const E_EXPIRED: u64 = 9;',
          '}'
        ].join('\n'),
        'utf-8'
      );

      const output = 'Move abort in 0x2::session_cap::assert_scope with code 7';
      const hints = buildMoveAbortSourceHints(output, tempDir);
      expect(hints).toHaveLength(1);
      expect(hints[0].sourceFile).toBe(moveFile);
      expect(hints[0].matchingErrorConstants).toEqual(['E_SCOPE_MISMATCH']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
