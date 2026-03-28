import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { resolveContractsDir } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_OUTPUT_BYTES = 250_000;
const DEFAULT_TIMEOUT_MS = 180_000;
const ALLOWED_DUBHE_SUBCOMMANDS = new Set([
  'debug',
  'trace',
  'test',
  'workbench',
  'debug-open',
  'debug-tui',
  'snapshot',
  'coverage',
  'fuzz',
  'invariant',
  'quality-trend'
]);

type RunAction = 'collect' | 'debug-open' | 'replay';

type RunRequest = {
  action?: RunAction;
  command?: string;
  traceFile?: string;
  contractsDir?: string;
};

type RunTarget = {
  action: RunAction;
  cmd: string;
  args: string[];
  cwd: string;
  contractsDir: string;
};

type RunState = {
  action: RunAction;
  command: string;
  startedAt: string;
};

let activeRun: RunState | null = null;

function truncateOutput(value: string): string {
  if (value.length <= MAX_OUTPUT_BYTES) return value;
  return `${value.slice(0, MAX_OUTPUT_BYTES)}\n...<truncated>`;
}

function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[0]);
  }

  return tokens;
}

function sanitizeReplayCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed.startsWith('dubhe ')) {
    throw new Error('Only dubhe replay commands are allowed.');
  }
  if (/[;&|`$><\n\r]/.test(trimmed)) {
    throw new Error('Replay command contains blocked shell tokens.');
  }

  const tokens = tokenizeCommand(trimmed);
  if (tokens.length < 2 || tokens[0] !== 'dubhe') {
    throw new Error('Invalid replay command format.');
  }

  const subcommand = tokens[1];
  if (!ALLOWED_DUBHE_SUBCOMMANDS.has(subcommand)) {
    throw new Error(`Replay subcommand is not allowed: ${subcommand}`);
  }

  return trimmed;
}

function ensureTraceFileInsideContracts(traceFile: string, contractsDir: string): string {
  const resolved = path.resolve(traceFile);
  if (!resolved.endsWith('.json.zst')) {
    throw new Error('trace file must end with .json.zst');
  }
  if (!resolved.startsWith(path.resolve(contractsDir))) {
    throw new Error('trace file must be inside contracts directory');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`trace file not found: ${resolved}`);
  }
  return resolved;
}

function ensureReportsDir(contractsDir: string): string {
  const reportsDir = path.join(contractsDir, '.reports', 'move');
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function appendAuditLog(
  contractsDir: string,
  event: {
    action: RunAction;
    command: string;
    ok: boolean;
    exitCode: number;
    durationMs: number;
  }
): void {
  try {
    const reportsDir = ensureReportsDir(contractsDir);
    const auditPath = path.join(reportsDir, 'workbench-run-audit.log');
    const line = JSON.stringify({
      at: new Date().toISOString(),
      ...event
    });
    fs.appendFileSync(auditPath, `${line}\n`, 'utf-8');
  } catch {
    // Best-effort logging only.
  }
}

async function runProcess(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{
  ok: boolean;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}> {
  const startedAt = Date.now();

  return await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2_000);
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      const exitCode = timedOut ? 124 : typeof code === 'number' ? code : 1;
      resolve({
        ok: exitCode === 0,
        command: [cmd, ...args].join(' '),
        exitCode,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        durationMs
      });
    });
  });
}

function buildRunTarget(request: RunRequest): RunTarget {
  const contractsDir = resolveContractsDir(request.contractsDir);
  const action = request.action;
  const helperScript = path.join(contractsDir, 'scripts', 'dubhe-local.sh');

  if (!action) {
    throw new Error('missing action');
  }

  if (action === 'collect') {
    return {
      action,
      cmd: 'pnpm',
      args: ['run', 'debug:collect:once'],
      cwd: contractsDir,
      contractsDir
    };
  }

  if (action === 'debug-open') {
    const args = ['run', 'debug:open', '--', '--open', 'false', '--print-command', 'true'];
    if (request.traceFile) {
      const traceFile = ensureTraceFileInsideContracts(request.traceFile, contractsDir);
      args.push('--trace-file', traceFile);
    }
    return {
      action,
      cmd: 'pnpm',
      args,
      cwd: contractsDir,
      contractsDir
    };
  }

  if (action === 'replay') {
    const command = sanitizeReplayCommand(request.command ?? '');
    const tokens = tokenizeCommand(command);
    if (tokens.length < 2) {
      throw new Error('invalid replay command');
    }
    if (!fs.existsSync(helperScript)) {
      throw new Error(`dubhe helper script not found: ${helperScript}`);
    }
    return {
      action,
      cmd: helperScript,
      args: tokens.slice(1),
      cwd: contractsDir,
      contractsDir
    };
  }

  throw new Error(`unsupported action: ${action}`);
}

export async function POST(request: NextRequest) {
  try {
    if (activeRun) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Another debug command is still running.',
          activeRun
        },
        { status: 429 }
      );
    }

    const payload = (await request.json()) as RunRequest;
    const target = buildRunTarget(payload);

    activeRun = {
      action: target.action,
      command: [target.cmd, ...target.args].join(' '),
      startedAt: new Date().toISOString()
    };

    const result = await runProcess(target.cmd, target.args, target.cwd);

    appendAuditLog(target.contractsDir, {
      action: target.action,
      command: result.command,
      ok: result.ok,
      exitCode: result.exitCode,
      durationMs: result.durationMs
    });

    return NextResponse.json(
      {
        ...result,
        action: target.action
      },
      {
        status: result.ok ? 200 : 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  } finally {
    activeRun = null;
  }
}
