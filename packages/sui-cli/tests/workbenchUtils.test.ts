import { describe, expect, it } from 'vitest';
import {
  buildWorkbenchPayload,
  parseReplayScriptCommands,
  renderWorkbenchHtml
} from '../src/commands/workbenchUtils';

describe('parseReplayScriptCommands', () => {
  it('extracts runnable command lines from shell script', () => {
    const script = [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '# comment',
      'echo "hello"',
      'dubhe debug --filter session_cap_test',
      'dubhe trace --digest 0x123 --replay'
    ].join('\n');

    expect(parseReplayScriptCommands(script)).toEqual([
      'dubhe debug --filter session_cap_test',
      'dubhe trace --digest 0x123 --replay'
    ]);
  });
});

describe('buildWorkbenchPayload', () => {
  it('builds unified events from mixed artifacts', () => {
    const payload = buildWorkbenchPayload('Workbench', {
      debugSession: {
        generatedAt: '2026-03-28T00:00:00.000Z',
        command: 'sui move test',
        reproCommand: 'dubhe debug --filter x',
        failedTests: ['dubhe::m::t'],
        hints: ['Move abort in 0x2::m::f with code 1'],
        sourceHints: [
          {
            modulePath: '0x2::m::f',
            functionName: 'f',
            abortCode: 1,
            sourceFile: '/tmp/move/m.move',
            snippets: [{ startLine: 12 }]
          }
        ]
      },
      gasSourceMap: {
        generatedAt: '2026-03-28T00:00:01.000Z',
        rows: [
          { name: 'dubhe::m::t', gas: 123, nanos: 1000, sourceFile: '/tmp/move/m.move', line: 12 }
        ]
      },
      traceConsistency: {
        generatedAt: '2026-03-28T00:00:02.000Z',
        checks: [{ digest: '0xabc', ok: false, statusOnChain: 'success', statusDryRun: 'failure' }]
      },
      traceReplayScript: 'dubhe trace --digest 0xabc --replay'
    });

    expect(payload.summary.totalEvents).toBeGreaterThan(0);
    expect(payload.summary.errorEvents).toBeGreaterThan(0);
    expect(payload.replayCommands.some((cmd) => cmd.includes('dubhe trace'))).toBe(true);
  });
});

describe('renderWorkbenchHtml', () => {
  it('renders interactive html with timeline controls', () => {
    const payload = buildWorkbenchPayload('Workbench HTML', {
      debugSession: {
        generatedAt: '2026-03-28T00:00:00.000Z',
        command: 'sui move test',
        reproCommand: 'dubhe debug --filter x',
        failedTests: ['dubhe::m::t'],
        hints: [],
        sourceHints: []
      }
    });
    const html = renderWorkbenchHtml(payload);
    expect(html).toContain('<html');
    expect(html).toContain('Workbench HTML');
    expect(html).toContain('Timeline');
    expect(html).toContain('replayCommands');
    expect(html).toContain('search');
  });
});
