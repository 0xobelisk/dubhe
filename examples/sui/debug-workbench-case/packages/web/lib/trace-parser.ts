import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export type ParsedCallStackFrame = {
  frameId: number;
  module: string;
  functionName: string;
  sourceFile?: string;
  sourceLine?: number;
};

export type ParsedTraceVariable = {
  name: string;
  value: string;
  location?: string;
  kind?: string;
};

export type ParsedStateTransition = {
  before: Record<string, number>;
  after: Record<string, number>;
  diff: Record<string, number>;
};

export type ParsedTraceStep = {
  id: string;
  title: string;
  detail: string;
  module?: string;
  functionName?: string;
  instruction?: string;
  pc?: number;
  gasLeft?: number;
  sourceFile?: string;
  sourceLine?: number;
  callStack: ParsedCallStackFrame[];
  variables: ParsedTraceVariable[];
  state: ParsedStateTransition;
  metadata: Record<string, string | number | boolean | null>;
};

export type ParsedTraceStats = {
  parsedLines: number;
  instructionSteps: number;
  openFrames: number;
  closeFrames: number;
  effects: number;
  truncatedByLines: boolean;
  truncatedBySteps: boolean;
  maxLines: number;
  maxSteps: number;
};

export type ParsedTraceResult = {
  steps: ParsedTraceStep[];
  stats: ParsedTraceStats;
  issues: string[];
};

type ParseOptions = {
  contractsDir: string;
  maxLines?: number;
  maxSteps?: number;
};

type TraceFrame = {
  frameId: number;
  module: string;
  functionName: string;
  sourceFile?: string;
  sourceLine?: number;
};

type TraceCounters = {
  instruction: number;
  effect: number;
  openFrame: number;
  closeFrame: number;
  push: number;
  pop: number;
  read: number;
  write: number;
};

type PendingInstruction = {
  lineNumber: number;
  instruction: string;
  pc?: number;
  gasLeft?: number;
  module?: string;
  functionName?: string;
  sourceFile?: string;
  sourceLine?: number;
  callStack: ParsedCallStackFrame[];
  beforeState: Record<string, number>;
  afterState: Record<string, number>;
  variables: ParsedTraceVariable[];
  effectCount: number;
};

const parseCache = new Map<string, ParsedTraceResult>();
const sourceIndexCache = new Map<string, SourceIndex>();

type SourceIndex = {
  moduleToFile: Map<string, string>;
  functionLineByFile: Map<string, Map<string, number>>;
};

function shellEscape(value: string): string {
  if (!value) return "''";
  if (/^[A-Za-z0-9_./:=+@%-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function summarizeAny(value: unknown, depth: number = 0): string {
  if (value == null) return 'null';
  if (typeof value === 'string') {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (depth >= 2) return `[len=${value.length}]`;
    const preview = value.slice(0, 4).map((item) => summarizeAny(item, depth + 1));
    const suffix = value.length > 4 ? ', ...' : '';
    return `[${preview.join(', ')}${suffix}]`;
  }

  const record = asRecord(value);
  if (!record) return String(value);

  if (typeof record.type === 'string' && Object.prototype.hasOwnProperty.call(record, 'value')) {
    return `${record.type}(${summarizeAny(record.value, depth + 1)})`;
  }

  const runtimeValue = asRecord(record.RuntimeValue);
  if (runtimeValue) {
    return summarizeAny(runtimeValue.value, depth + 1);
  }

  const immRef = asRecord(record.ImmRef);
  if (immRef) {
    return `ImmRef(${summarizeAny(immRef.snapshot, depth + 1)})`;
  }

  const mutRef = asRecord(record.MutRef);
  if (mutRef) {
    return `MutRef(${summarizeAny(mutRef.snapshot, depth + 1)})`;
  }

  const keys = Object.keys(record);
  const preview = keys.slice(0, 4).map((key) => `${key}=${summarizeAny(record[key], depth + 1)}`);
  const suffix = keys.length > 4 ? ', ...' : '';
  return `{${preview.join(', ')}${suffix}}`;
}

function summarizeLocation(location: unknown): string {
  const record = asRecord(location);
  if (!record) return summarizeAny(location);

  if (Array.isArray(record.Local)) {
    const local = record.Local;
    const frameId = typeof local[0] === 'number' ? local[0] : '?';
    const slot = typeof local[1] === 'number' ? local[1] : '?';
    return `Local(${frameId},${slot})`;
  }

  const keys = Object.keys(record);
  if (keys.length === 1) {
    const key = keys[0];
    return `${key}(${summarizeAny(record[key])})`;
  }
  return summarizeAny(location);
}

function snapshotCounters(counters: TraceCounters): Record<string, number> {
  return {
    instruction: counters.instruction,
    effect: counters.effect,
    openFrame: counters.openFrame,
    closeFrame: counters.closeFrame,
    push: counters.push,
    pop: counters.pop,
    read: counters.read,
    write: counters.write
  };
}

function diffCounters(
  before: Record<string, number>,
  after: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    out[key] = (after[key] ?? 0) - (before[key] ?? 0);
  }
  return out;
}

function readMoveFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const stack = [rootDir];
  const files: string[] = [];

  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.move')) {
        files.push(full);
      }
    }
  }

  return files;
}

function buildSourceIndex(contractsDir: string): SourceIndex {
  const cached = sourceIndexCache.get(contractsDir);
  if (cached) return cached;

  const moduleToFile = new Map<string, string>();
  const functionLineByFile = new Map<string, Map<string, number>>();
  const srcRoot = path.join(contractsDir, 'src');
  const files = readMoveFiles(srcRoot);

  for (const file of files) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const moduleMatch = content.match(/\bmodule\s+[^\s{]*::([A-Za-z0-9_]+)\s*\{/);
    if (moduleMatch?.[1] && !moduleToFile.has(moduleMatch[1])) {
      moduleToFile.set(moduleMatch[1], file);
    }

    const lines = content.split(/\r?\n/);
    const functionMap = new Map<string, number>();
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const match = line.match(/\bfun\s+([A-Za-z0-9_]+)\b/);
      if (match?.[1] && !functionMap.has(match[1])) {
        functionMap.set(match[1], index + 1);
      }
    }
    functionLineByFile.set(file, functionMap);
  }

  const index = { moduleToFile, functionLineByFile };
  sourceIndexCache.set(contractsDir, index);
  return index;
}

function sourceForFrame(
  contractsDir: string,
  moduleName: string,
  functionName: string
): { sourceFile?: string; sourceLine?: number } {
  const index = buildSourceIndex(contractsDir);
  const sourceFile = index.moduleToFile.get(moduleName);
  if (!sourceFile) return {};

  const lineMap = index.functionLineByFile.get(sourceFile);
  const sourceLine = lineMap?.get(functionName);

  return {
    sourceFile,
    sourceLine
  };
}

function buildCacheKey(
  tracePath: string,
  contractsDir: string,
  maxLines: number,
  maxSteps: number
): string {
  try {
    const stats = fs.statSync(tracePath);
    return `${tracePath}:${contractsDir}:${stats.mtimeMs}:${stats.size}:${maxLines}:${maxSteps}`;
  } catch {
    return `${tracePath}:${contractsDir}:${maxLines}:${maxSteps}`;
  }
}

function readTraceLines(
  tracePath: string,
  maxLines: number
): { lines: string[]; issues: string[] } {
  const issues: string[] = [];
  const command = `zstd -dc ${shellEscape(tracePath)} | sed -n '1,${maxLines}p'`;
  const run = spawnSync('/bin/zsh', ['-lc', command], {
    encoding: 'utf-8',
    maxBuffer: 128 * 1024 * 1024
  });

  if (run.error) {
    issues.push(`trace decode failed: ${run.error.message}`);
    return { lines: [], issues };
  }

  const stderr = (run.stderr || '').trim();
  if (stderr.length > 0 && !stderr.includes('Broken pipe')) {
    issues.push(`trace decode stderr: ${stderr}`);
  }

  const stdout = run.stdout || '';
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return { lines, issues };
}

function updateVariables(
  pending: PendingInstruction,
  effectKey: string,
  payload: Record<string, unknown>
): void {
  let variable: ParsedTraceVariable | undefined;

  if (effectKey === 'Read' || effectKey === 'Write') {
    const location = summarizeLocation(payload.location);
    const rawValue =
      effectKey === 'Read'
        ? payload.root_value_read ?? payload.value_read ?? payload.read
        : payload.root_value_after_write ?? payload.value_written ?? payload.write;

    variable = {
      name: location,
      location,
      kind: effectKey,
      value: summarizeAny(rawValue)
    };
  }

  if ((effectKey === 'Push' || effectKey === 'Pop') && !variable) {
    const firstKey = Object.keys(payload)[0];
    const rawValue = firstKey ? (payload as Record<string, unknown>)[firstKey] : payload;
    variable = {
      name: `${effectKey}#${pending.effectCount}`,
      kind: effectKey,
      value: summarizeAny(rawValue)
    };
  }

  if (!variable) {
    variable = {
      name: `${effectKey}#${pending.effectCount}`,
      kind: effectKey,
      value: summarizeAny(payload)
    };
  }

  pending.variables.unshift(variable);
  if (pending.variables.length > 12) {
    pending.variables.length = 12;
  }
}

function applyEffect(
  pending: PendingInstruction | undefined,
  effectContainer: Record<string, unknown>,
  counters: TraceCounters
): void {
  if (!pending) return;
  counters.effect += 1;

  const effectKey = Object.keys(effectContainer)[0];
  if (!effectKey) return;

  const effectPayload = asRecord(effectContainer[effectKey]);
  pending.effectCount += 1;

  if (effectKey === 'Push') counters.push += 1;
  if (effectKey === 'Pop') counters.pop += 1;
  if (effectKey === 'Read') counters.read += 1;
  if (effectKey === 'Write') counters.write += 1;

  pending.afterState = snapshotCounters(counters);

  if (effectPayload) {
    updateVariables(pending, effectKey, effectPayload);
  }
}

function startInstruction(
  instructionPayload: Record<string, unknown>,
  lineNumber: number,
  stack: TraceFrame[],
  counters: TraceCounters
): PendingInstruction {
  const currentFrame = stack[stack.length - 1];

  return {
    lineNumber,
    instruction:
      typeof instructionPayload.instruction === 'string'
        ? instructionPayload.instruction
        : 'UNKNOWN',
    pc: typeof instructionPayload.pc === 'number' ? instructionPayload.pc : undefined,
    gasLeft:
      typeof instructionPayload.gas_left === 'number' ? instructionPayload.gas_left : undefined,
    module: currentFrame?.module,
    functionName: currentFrame?.functionName,
    sourceFile: currentFrame?.sourceFile,
    sourceLine: currentFrame?.sourceLine,
    callStack: stack.map((frame) => ({
      frameId: frame.frameId,
      module: frame.module,
      functionName: frame.functionName,
      sourceFile: frame.sourceFile,
      sourceLine: frame.sourceLine
    })),
    beforeState: snapshotCounters(counters),
    afterState: snapshotCounters(counters),
    variables: [],
    effectCount: 0
  };
}

function finalizeInstruction(pending: PendingInstruction, output: ParsedTraceStep[]): void {
  const stateDiff = diffCounters(pending.beforeState, pending.afterState);
  const moduleName = pending.module ?? 'unknown_module';
  const functionName = pending.functionName ?? 'unknown_function';

  output.push({
    id: `trace-instruction-${output.length + 1}`,
    title: `${moduleName}::${functionName} pc=${pending.pc ?? '?'} ${pending.instruction}`,
    detail: `gas_left=${pending.gasLeft ?? 'n/a'} effects=${pending.effectCount}`,
    module: pending.module,
    functionName: pending.functionName,
    instruction: pending.instruction,
    pc: pending.pc,
    gasLeft: pending.gasLeft,
    sourceFile: pending.sourceFile,
    sourceLine: pending.sourceLine,
    callStack: pending.callStack,
    variables: pending.variables,
    state: {
      before: pending.beforeState,
      after: pending.afterState,
      diff: stateDiff
    },
    metadata: {
      line: pending.lineNumber,
      module: pending.module ?? null,
      functionName: pending.functionName ?? null,
      instruction: pending.instruction,
      pc: pending.pc ?? null,
      gasLeft: pending.gasLeft ?? null,
      stackDepth: pending.callStack.length,
      effectCount: pending.effectCount
    }
  });
}

export function parseTraceFile(tracePath: string, options: ParseOptions): ParsedTraceResult {
  const maxLines = Math.max(200, options.maxLines ?? 120000);
  const maxSteps = Math.max(50, options.maxSteps ?? 1200);

  const cacheKey = buildCacheKey(tracePath, options.contractsDir, maxLines, maxSteps);
  const cached = parseCache.get(cacheKey);
  if (cached) return cached;

  const issues: string[] = [];
  const { lines, issues: decodeIssues } = readTraceLines(tracePath, maxLines);
  issues.push(...decodeIssues);

  const steps: ParsedTraceStep[] = [];
  const counters: TraceCounters = {
    instruction: 0,
    effect: 0,
    openFrame: 0,
    closeFrame: 0,
    push: 0,
    pop: 0,
    read: 0,
    write: 0
  };

  const stack: TraceFrame[] = [];
  let pending: PendingInstruction | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (steps.length >= maxSteps) break;

    const raw = lines[lineIndex];
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (!parsed) continue;

    const openFramePayload = asRecord(parsed.OpenFrame);
    if (openFramePayload) {
      const frame = asRecord(openFramePayload.frame);
      if (frame) {
        const frameId = typeof frame.frame_id === 'number' ? frame.frame_id : -1;
        const functionName =
          typeof frame.function_name === 'string' ? frame.function_name : 'unknown_function';

        const moduleData = asRecord(frame.module);
        const moduleName =
          moduleData && typeof moduleData.name === 'string' ? moduleData.name : 'unknown_module';
        const source = sourceForFrame(options.contractsDir, moduleName, functionName);

        stack.push({
          frameId,
          module: moduleName,
          functionName,
          sourceFile: source.sourceFile,
          sourceLine: source.sourceLine
        });
      }
      counters.openFrame += 1;
      continue;
    }

    const closeFramePayload = asRecord(parsed.CloseFrame);
    if (closeFramePayload) {
      const frameId =
        typeof closeFramePayload.frame_id === 'number' ? closeFramePayload.frame_id : undefined;
      if (typeof frameId === 'number') {
        const index = stack.findIndex((frame) => frame.frameId === frameId);
        if (index >= 0) {
          stack.splice(index, 1);
        } else {
          stack.pop();
        }
      } else {
        stack.pop();
      }
      counters.closeFrame += 1;
      continue;
    }

    const instructionPayload = asRecord(parsed.Instruction);
    if (instructionPayload) {
      if (pending) {
        finalizeInstruction(pending, steps);
      }
      counters.instruction += 1;
      pending = startInstruction(instructionPayload, lineIndex + 1, stack, counters);
      continue;
    }

    const effectPayload = asRecord(parsed.Effect);
    if (effectPayload) {
      applyEffect(pending, effectPayload, counters);
    }
  }

  if (pending && steps.length < maxSteps) {
    finalizeInstruction(pending, steps);
  }

  const stats: ParsedTraceStats = {
    parsedLines: lines.length,
    instructionSteps: steps.length,
    openFrames: counters.openFrame,
    closeFrames: counters.closeFrame,
    effects: counters.effect,
    truncatedByLines: lines.length >= maxLines,
    truncatedBySteps: steps.length >= maxSteps,
    maxLines,
    maxSteps
  };

  if (stats.truncatedByLines) {
    issues.push(`Trace parsing reached line cap (${maxLines}).`);
  }
  if (stats.truncatedBySteps) {
    issues.push(`Trace parsing reached step cap (${maxSteps}).`);
  }

  const result: ParsedTraceResult = {
    steps,
    stats,
    issues
  };

  parseCache.clear();
  parseCache.set(cacheKey, result);
  return result;
}
