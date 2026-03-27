import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { resolveContractsDir } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_OUTPUT_BYTES = 250_000;
const DEFAULT_TIMEOUT_MS = 180_000;

type RunAction = 'collect' | 'debug-open' | 'replay';

type RunRequest = {
  action?: RunAction;
  command?: string;
  traceFile?: string;
  contractsDir?: string;
};

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

function buildRunTarget(request: RunRequest): { cmd: string; args: string[]; cwd: string } {
  const contractsDir = resolveContractsDir(request.contractsDir);
  const action = request.action;
  const helperScript = path.join(contractsDir, 'scripts', 'dubhe-local.sh');

  if (!action) {
    throw new Error('missing action');
  }

  if (action === 'collect') {
    return {
      cmd: 'pnpm',
      args: ['run', 'debug:collect:once'],
      cwd: contractsDir
    };
  }

  if (action === 'debug-open') {
    const args = ['run', 'debug:open', '--', '--open', 'false', '--print-command', 'true'];
    if (request.traceFile) {
      const traceFile = ensureTraceFileInsideContracts(request.traceFile, contractsDir);
      args.push('--trace-file', traceFile);
    }
    return {
      cmd: 'pnpm',
      args,
      cwd: contractsDir
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
      cmd: helperScript,
      args: tokens.slice(1),
      cwd: contractsDir
    };
  }

  throw new Error(`unsupported action: ${action}`);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as RunRequest;
    const target = buildRunTarget(payload);
    const result = await runProcess(target.cmd, target.args, target.cwd);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
