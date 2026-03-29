import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildCodeOpenArgs,
  collectDefaultTraceCandidates,
  formatCommand,
  isTraceFile,
  listTraceFilesRecursively,
  pickNewestFile,
  upsertMoveDebugLaunchConfig,
  writeLaunchFile
} from '../src/commands/debugOpenUtils';

describe('isTraceFile', () => {
  it('detects .json.zst trace files', () => {
    expect(isTraceFile('/tmp/trace.json.zst')).toBe(true);
    expect(isTraceFile('/tmp/trace.json')).toBe(false);
  });
});

describe('listTraceFilesRecursively', () => {
  it('finds trace files in nested folders', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-open-traces-'));
    try {
      const nested = path.join(root, 'a', 'b');
      fs.mkdirSync(nested, { recursive: true });
      const trace = path.join(nested, 'trace.json.zst');
      const other = path.join(root, 'plain.txt');
      fs.writeFileSync(trace, 'trace', 'utf-8');
      fs.writeFileSync(other, 'x', 'utf-8');

      const found = listTraceFilesRecursively(root);
      expect(found).toContain(trace);
      expect(found).not.toContain(other);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('pickNewestFile', () => {
  it('returns file with latest mtime', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-open-newest-'));
    try {
      const a = path.join(root, 'a.json.zst');
      const b = path.join(root, 'b.json.zst');
      fs.writeFileSync(a, 'a', 'utf-8');
      fs.writeFileSync(b, 'b', 'utf-8');
      const now = Date.now() / 1000;
      fs.utimesSync(a, now - 120, now - 120);
      fs.utimesSync(b, now, now);

      expect(pickNewestFile([a, b])).toBe(b);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('collectDefaultTraceCandidates', () => {
  it('collects traces from project/traces and .replay', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-open-candidates-'));
    try {
      const projectPath = path.join(root, 'src', 'demo');
      const projectTrace = path.join(projectPath, 'traces', 'unit', 'run.json.zst');
      const replayTrace = path.join(root, '.replay', '0xabc', 'trace.json.zst');
      fs.mkdirSync(path.dirname(projectTrace), { recursive: true });
      fs.mkdirSync(path.dirname(replayTrace), { recursive: true });
      fs.writeFileSync(projectTrace, 'x', 'utf-8');
      fs.writeFileSync(replayTrace, 'x', 'utf-8');

      const results = collectDefaultTraceCandidates(root, projectPath);
      expect(results).toContain(projectTrace);
      expect(results).toContain(replayTrace);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('upsertMoveDebugLaunchConfig', () => {
  it('creates move-debug launch entry and writes launch file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-open-launch-'));
    try {
      const launchPath = path.join(root, '.vscode', 'launch.json');
      const { payload, changed } = upsertMoveDebugLaunchConfig(
        launchPath,
        'Dubhe Move Trace Debug'
      );
      expect(changed).toBe(true);
      expect(payload.configurations).toHaveLength(1);
      writeLaunchFile(launchPath, payload);

      const persisted = JSON.parse(fs.readFileSync(launchPath, 'utf-8'));
      expect(persisted.version).toBe('0.2.0');
      expect(persisted.configurations[0].type).toBe('move-debug');
      expect(persisted.configurations[0].request).toBe('launch');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('updates existing config in place without duplicating name', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-debug-open-launch-update-'));
    try {
      const launchPath = path.join(root, '.vscode', 'launch.json');
      fs.mkdirSync(path.dirname(launchPath), { recursive: true });
      fs.writeFileSync(
        launchPath,
        JSON.stringify(
          {
            version: '0.2.0',
            configurations: [
              {
                name: 'Dubhe Move Trace Debug',
                type: 'move-debug',
                request: 'launch',
                source: '/tmp/file.move',
                stopOnEntry: false,
                logLevel: 'verbose',
                custom: true
              }
            ]
          },
          null,
          2
        ),
        'utf-8'
      );

      const { payload } = upsertMoveDebugLaunchConfig(launchPath, 'Dubhe Move Trace Debug');
      expect(payload.configurations).toHaveLength(1);
      expect(payload.configurations[0].source).toBe('${file}');
      expect(payload.configurations[0].stopOnEntry).toBe(true);
      expect(payload.configurations[0].logLevel).toBe('log');
      expect(payload.configurations[0].custom).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('buildCodeOpenArgs / formatCommand', () => {
  it('builds goto command and optional debug-start command', () => {
    const args = buildCodeOpenArgs('/repo', '/repo/file.move', 12, true);
    expect(args).toContain('--goto');
    expect(args).toContain('/repo/file.move:12');
    expect(args).toContain('--command');
    expect(args).toContain('workbench.action.debug.start');

    const cmd = formatCommand('code', args);
    expect(cmd).toContain('code');
    expect(cmd).toContain('workbench.action.debug.start');
  });
});
