import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildGasSourceMapRows,
  formatGasSourceMapSummary,
  parseMoveTestName
} from '../src/commands/test';

describe('gas source map helpers', () => {
  it('parses Move test name into module/function', () => {
    expect(parseMoveTestName('dubhe::session_cap_test::test_scope_mismatch_detected')).toEqual({
      module: 'dubhe::session_cap_test',
      functionName: 'test_scope_mismatch_detected'
    });
  });

  it('maps gas rows to module source file and function line', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-gas-source-map-'));
    try {
      const sourceDir = path.join(tempDir, 'sources', 'tests');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'session_cap.move'),
        [
          '#[test_only]',
          'module dubhe::session_cap_test;',
          '',
          '#[test]',
          'public fun test_scope_mismatch_detected() {',
          '  assert!(true);',
          '}'
        ].join('\n'),
        'utf-8'
      );

      const rows = buildGasSourceMapRows(
        [{ name: 'dubhe::session_cap_test::test_scope_mismatch_detected', gas: 120, nanos: 1000 }],
        tempDir,
        10
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].sourceFile).toContain('session_cap.move');
      expect(rows[0].line).toBe(5);

      const summary = formatGasSourceMapSummary(rows, 5);
      expect(summary).toContain('Gas source map');
      expect(summary).toContain('test_scope_mismatch_detected');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
