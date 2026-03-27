import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { parseTraceFile } from '@/lib/trace-parser';
import { resolveContractsDir } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Aggregated = Map<string, number>;

function safeResolveTracePath(value: string, contractsDir: string): string {
  const candidate = path.isAbsolute(value) ? value : path.resolve(contractsDir, value);
  const normalized = path.resolve(candidate);
  if (!normalized.endsWith('.json.zst')) {
    throw new Error(`trace file must end with .json.zst: ${value}`);
  }
  if (!normalized.startsWith(path.resolve(contractsDir))) {
    throw new Error(`trace file must be inside contracts dir: ${value}`);
  }
  return normalized;
}

function plus(map: Aggregated, key: string, amount: number = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function traceKey(step: {
  module?: string;
  functionName?: string;
  instruction?: string;
  title: string;
}): string {
  const module = step.module || 'unknown_module';
  const fn = step.functionName || 'unknown_fn';
  const op = step.instruction || step.title;
  return `${module}::${fn}::${op}`;
}

function functionKey(step: { module?: string; functionName?: string; title: string }): string {
  const module = step.module || 'unknown_module';
  const fn = step.functionName || step.title || 'unknown_fn';
  return `${module}::${fn}`;
}

function aggregateCounters(
  steps: {
    module?: string;
    functionName?: string;
    instruction?: string;
    title: string;
  }[]
): { instruction: Aggregated; fn: Aggregated } {
  const instruction = new Map<string, number>();
  const fn = new Map<string, number>();

  for (const step of steps) {
    plus(instruction, traceKey(step));
    plus(fn, functionKey(step));
  }

  return { instruction, fn };
}

function diffMaps(
  left: Aggregated,
  right: Aggregated
): {
  diffs: { key: string; left: number; right: number; delta: number }[];
  shared: number;
  onlyLeft: string[];
  onlyRight: string[];
} {
  const keys = new Set([...left.keys(), ...right.keys()]);
  const diffs: { key: string; left: number; right: number; delta: number }[] = [];
  const onlyLeft: string[] = [];
  const onlyRight: string[] = [];
  let shared = 0;

  for (const key of keys) {
    const leftValue = left.get(key) ?? 0;
    const rightValue = right.get(key) ?? 0;
    const delta = rightValue - leftValue;
    diffs.push({ key, left: leftValue, right: rightValue, delta });

    if (leftValue > 0 && rightValue > 0) {
      shared += 1;
    } else if (leftValue > 0) {
      onlyLeft.push(key);
    } else if (rightValue > 0) {
      onlyRight.push(key);
    }
  }

  diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  onlyLeft.sort();
  onlyRight.sort();

  return { diffs, shared, onlyLeft, onlyRight };
}

export async function GET(request: NextRequest) {
  try {
    const contractsDir = resolveContractsDir(
      request.nextUrl.searchParams.get('contractsDir') ?? undefined
    );
    const leftRaw = request.nextUrl.searchParams.get('a');
    const rightRaw = request.nextUrl.searchParams.get('b');

    if (!leftRaw || !rightRaw) {
      return NextResponse.json(
        {
          error: 'missing query params: a and b are required'
        },
        { status: 400 }
      );
    }

    const leftPath = safeResolveTracePath(leftRaw, contractsDir);
    const rightPath = safeResolveTracePath(rightRaw, contractsDir);

    const left = parseTraceFile(leftPath, {
      contractsDir,
      maxLines: 160_000,
      maxSteps: 3_000
    });
    const right = parseTraceFile(rightPath, {
      contractsDir,
      maxLines: 160_000,
      maxSteps: 3_000
    });

    const leftAgg = aggregateCounters(left.steps);
    const rightAgg = aggregateCounters(right.steps);

    const instruction = diffMaps(leftAgg.instruction, rightAgg.instruction);
    const fn = diffMaps(leftAgg.fn, rightAgg.fn);

    return NextResponse.json(
      {
        left: {
          path: leftPath,
          stats: left.stats,
          issues: left.issues
        },
        right: {
          path: rightPath,
          stats: right.stats,
          issues: right.issues
        },
        summary: {
          instructionDelta: right.stats.instructionSteps - left.stats.instructionSteps,
          effectDelta: right.stats.effects - left.stats.effects,
          lineDelta: right.stats.parsedLines - left.stats.parsedLines,
          sharedInstructionKeys: instruction.shared,
          onlyLeftInstructionKeys: instruction.onlyLeft.length,
          onlyRightInstructionKeys: instruction.onlyRight.length
        },
        topInstructionDiffs: instruction.diffs.slice(0, 24),
        topFunctionDiffs: fn.diffs.slice(0, 24),
        onlyLeftSamples: instruction.onlyLeft.slice(0, 30),
        onlyRightSamples: instruction.onlyRight.slice(0, 30)
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
