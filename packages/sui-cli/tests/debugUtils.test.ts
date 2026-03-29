import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildMoveAbortSourceHints,
  type DebugSessionReport,
  findMoveFunctionLine,
  extractFailedMoveTests,
  extractMoveSourceSnippets,
  extractMoveAbortRecords,
  extractPotentialAbortHints,
  renderDebugSessionHtml,
  renderReplayShellScript,
  resolveDebugReplayCommand
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

describe('extractMoveSourceSnippets', () => {
  it('returns snippets for function and constants with line numbers', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-utils-snippets-'));
    try {
      const filePath = path.join(tempDir, 'session_cap.move');
      fs.writeFileSync(
        filePath,
        [
          'module dubhe::session_cap {',
          '  const E_SCOPE_MISMATCH: u64 = 7;',
          '',
          '  public fun assert_scope() {',
          '    abort E_SCOPE_MISMATCH',
          '  }',
          '}'
        ].join('\n'),
        'utf-8'
      );

      const snippets = extractMoveSourceSnippets(filePath, 'assert_scope', ['E_SCOPE_MISMATCH'], 1);
      expect(snippets.some((item) => item.label.includes('function assert_scope'))).toBe(true);
      expect(snippets.some((item) => item.label.includes('const E_SCOPE_MISMATCH'))).toBe(true);
      expect(snippets[0].lines[0].line).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('findMoveFunctionLine', () => {
  it('returns function declaration line number when present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-utils-funline-'));
    try {
      const filePath = path.join(tempDir, 'session_cap.move');
      fs.writeFileSync(
        filePath,
        [
          'module dubhe::session_cap {',
          '  const E_SCOPE_MISMATCH: u64 = 7;',
          '',
          '  public fun assert_scope() {',
          '    abort E_SCOPE_MISMATCH',
          '  }',
          '}'
        ].join('\n'),
        'utf-8'
      );

      expect(findMoveFunctionLine(filePath, 'assert_scope')).toBe(4);
      expect(findMoveFunctionLine(filePath, 'missing_fun')).toBeUndefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('resolveDebugReplayCommand', () => {
  it('prefers reproCommand when enabled', () => {
    const command = resolveDebugReplayCommand(
      {
        command: 'sui move test',
        reproCommand: 'dubhe debug --filter abc'
      },
      true
    );
    expect(command).toBe('dubhe debug --filter abc');
  });

  it('falls back to command when reproCommand is absent', () => {
    const command = resolveDebugReplayCommand(
      {
        command: 'sui move test --gas-limit 500000000'
      },
      true
    );
    expect(command).toBe('sui move test --gas-limit 500000000');
  });
});

describe('renderReplayShellScript', () => {
  it('renders executable shell script with command', () => {
    const script = renderReplayShellScript('dubhe debug --filter session_cap_test');
    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('set -euo pipefail');
    expect(script).toContain('dubhe debug --filter session_cap_test');
  });
});

describe('renderDebugSessionHtml', () => {
  it('renders html report with summary and source details', () => {
    const report: DebugSessionReport = {
      generatedAt: '2026-03-28T00:00:00.000Z',
      configPath: 'dubhe.config.ts',
      projectPath: '/tmp/project',
      command: 'sui move test --trace',
      reproCommand: 'dubhe debug --filter session_cap_test',
      failedTests: ['dubhe::session_cap_test::test_scope_mismatch_detected'],
      hints: ['Move abort in 0x2::session_cap::assert_scope with code 7'],
      sourceHints: [
        {
          modulePath: '0x2::session_cap::assert_scope',
          functionName: 'assert_scope',
          abortCode: 7,
          sourceFile: '/tmp/project/sources/systems/session_cap.move',
          matchingErrorConstants: ['E_SCOPE_MISMATCH'],
          snippets: [
            {
              label: 'function assert_scope',
              startLine: 10,
              endLine: 12,
              lines: [
                { line: 10, text: 'public fun assert_scope() {' },
                { line: 11, text: '  abort E_SCOPE_MISMATCH' },
                { line: 12, text: '}' }
              ]
            }
          ]
        }
      ],
      sourceContextLines: 2
    };

    const html = renderDebugSessionHtml(report, 'Debug HTML');
    expect(html).toContain('<html');
    expect(html).toContain('Debug HTML');
    expect(html).toContain('test_scope_mismatch_detected');
    expect(html).toContain('E_SCOPE_MISMATCH');
    expect(html).toContain('function assert_scope');
  });
});
