import fs from 'fs';
import path from 'path';
import { parseTraceFile } from './trace-parser';

export type StepSeverity = 'info' | 'warn' | 'error';
export type StepCategory = 'debug' | 'gas' | 'trace' | 'fork' | 'replay';

export type SourceSnippetLine = {
  line: number;
  text: string;
};

export type SourceSnippet = {
  label: string;
  filePath: string;
  startLine: number;
  endLine: number;
  lines: SourceSnippetLine[];
};

export type WorkbenchStep = {
  id: string;
  index: number;
  category: StepCategory;
  severity: StepSeverity;
  title: string;
  detail?: string;
  timestamp?: string;
  sourceFile?: string;
  sourceLine?: number;
  command?: string;
  tags: string[];
  snippet?: SourceSnippet;
  callStack?: {
    frameId: number;
    module: string;
    functionName: string;
    sourceFile?: string;
    sourceLine?: number;
  }[];
  variables?: {
    name: string;
    value: string;
    location?: string;
    kind?: string;
  }[];
  state?: {
    before: Record<string, number>;
    after: Record<string, number>;
    diff: Record<string, number>;
  };
  metadata?: Record<string, string | number | boolean | null>;
};

export type TraceFileInfo = {
  path: string;
  relativePath: string;
  size: number;
  updatedAt: string;
};

export type WorkbenchSummary = {
  totalSteps: number;
  errorSteps: number;
  warnSteps: number;
  infoSteps: number;
  categories: Record<StepCategory, number>;
};

export type ArtifactAvailability = {
  debugSession: boolean;
  gasSourceMap: boolean;
  gasRegression: boolean;
  traceCallGraph: boolean;
  traceConsistency: boolean;
  forkReplay: boolean;
  debugReplayScript: boolean;
  traceReplayScript: boolean;
};

export type ArtifactStats = {
  availability: ArtifactAvailability;
  traceGraph: {
    nodes: number;
    edges: number;
  };
  debug: {
    failedTests: number;
    hints: number;
    sourceHints: number;
  };
  gas: {
    rows: number;
    regressions: number;
    improvements: number;
  };
  traceRuntime: {
    parsedLines: number;
    instructionSteps: number;
    openFrames: number;
    closeFrames: number;
    effects: number;
    truncated: boolean;
  };
};

export type WorkbenchSnapshot = {
  revision: string;
  generatedAt: string;
  contractsDir: string;
  reportsDir: string;
  summary: WorkbenchSummary;
  steps: WorkbenchStep[];
  replayCommands: string[];
  traceFiles: TraceFileInfo[];
  artifactStats: ArtifactStats;
  issues: string[];
};

type BuildOptions = {
  contractsDir?: string;
  traceFileLimit?: number;
};

const DEBUG_DIRNAME = '.reports/move';

function toIso(input: unknown): string | undefined {
  if (typeof input !== 'string' || input.trim().length === 0) return undefined;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function readJsonFile(filePath: string): unknown | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  } catch {
    return undefined;
  }
}

function readTextFile(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

function parseReplayScriptCommands(scriptContent: string): string[] {
  return scriptContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('set '))
    .filter((line) => !line.startsWith('echo '))
    .filter((line) => !line.startsWith('printf '))
    .filter((line) => line !== 'true');
}

function readSourceSnippet(
  filePath: string,
  lineNumber: number,
  contextLines: number = 2
): SourceSnippet | undefined {
  if (!filePath || !Number.isFinite(lineNumber) || lineNumber <= 0) return undefined;
  if (!fs.existsSync(filePath)) return undefined;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const startLine = Math.max(1, Math.floor(lineNumber) - contextLines);
    const endLine = Math.min(lines.length, Math.floor(lineNumber) + contextLines);
    const snippetLines: SourceSnippetLine[] = [];
    for (let line = startLine; line <= endLine; line += 1) {
      snippetLines.push({
        line,
        text: lines[line - 1] ?? ''
      });
    }
    return {
      label: 'source-context',
      filePath,
      startLine,
      endLine,
      lines: snippetLines
    };
  } catch {
    return undefined;
  }
}

function extractSnippetFromHint(sourceHint: any): SourceSnippet | undefined {
  if (!sourceHint || typeof sourceHint !== 'object') return undefined;
  const snippets = Array.isArray(sourceHint.snippets) ? sourceHint.snippets : [];
  const first = snippets[0];
  if (!first || typeof first !== 'object' || !Array.isArray(first.lines)) return undefined;

  return {
    label: typeof first.label === 'string' ? first.label : 'source-hint',
    filePath: typeof sourceHint.sourceFile === 'string' ? sourceHint.sourceFile : '',
    startLine: typeof first.startLine === 'number' ? first.startLine : 0,
    endLine: typeof first.endLine === 'number' ? first.endLine : 0,
    lines: first.lines
      .filter((line: any) => line && typeof line === 'object')
      .map((line: any) => ({
        line: typeof line.line === 'number' ? line.line : 0,
        text: typeof line.text === 'string' ? line.text : ''
      }))
      .filter((line: SourceSnippetLine) => line.line > 0)
  };
}

function listTraceFiles(contractsDir: string, traceFileLimit: number): TraceFileInfo[] {
  const srcRoot = path.join(contractsDir, 'src');
  if (!fs.existsSync(srcRoot)) return [];

  const stack = [srcRoot];
  const files: TraceFileInfo[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.json.zst')) continue;
      let stats: fs.Stats;
      try {
        stats = fs.statSync(fullPath);
      } catch {
        continue;
      }
      files.push({
        path: fullPath,
        relativePath: path.relative(contractsDir, fullPath),
        size: stats.size,
        updatedAt: stats.mtime.toISOString()
      });
    }
  }

  return files
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, traceFileLimit);
}

function makeSummary(steps: WorkbenchStep[]): WorkbenchSummary {
  const categories: Record<StepCategory, number> = {
    debug: 0,
    gas: 0,
    trace: 0,
    fork: 0,
    replay: 0
  };

  let errorSteps = 0;
  let warnSteps = 0;
  let infoSteps = 0;

  for (const step of steps) {
    categories[step.category] += 1;
    if (step.severity === 'error') errorSteps += 1;
    if (step.severity === 'warn') warnSteps += 1;
    if (step.severity === 'info') infoSteps += 1;
  }

  return {
    totalSteps: steps.length,
    errorSteps,
    warnSteps,
    infoSteps,
    categories
  };
}

function computeRevision(paths: string[]): string {
  let maxMtimeMs = 0;
  let existingCount = 0;
  let totalSize = 0;

  for (const filePath of paths) {
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) continue;
      existingCount += 1;
      totalSize += stats.size;
      if (stats.mtimeMs > maxMtimeMs) {
        maxMtimeMs = stats.mtimeMs;
      }
    } catch {
      // Ignore missing files.
    }
  }

  return `${Math.floor(maxMtimeMs)}:${existingCount}:${totalSize}`;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function extractTraceGraphStats(traceCallGraph: unknown): { nodes: number; edges: number } {
  if (!traceCallGraph || typeof traceCallGraph !== 'object') {
    return { nodes: 0, edges: 0 };
  }
  const graph = traceCallGraph as Record<string, unknown>;
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const edges = Array.isArray(graph.edges) ? graph.edges.length : 0;
  return { nodes, edges };
}

function stepSort(a: WorkbenchStep, b: WorkbenchStep): number {
  const aTime = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
  const bTime = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
  const bothValid = Number.isFinite(aTime) && Number.isFinite(bTime);
  if (bothValid && aTime !== bTime) {
    return bTime - aTime;
  }

  const severityRank: Record<StepSeverity, number> = {
    error: 0,
    warn: 1,
    info: 2
  };
  if (a.severity !== b.severity) {
    return severityRank[a.severity] - severityRank[b.severity];
  }

  return a.id.localeCompare(b.id);
}

export function resolveContractsDir(input?: string): string {
  if (input && input.trim().length > 0) {
    return path.resolve(input);
  }
  if (process.env.DUBHE_CONTRACTS_DIR && process.env.DUBHE_CONTRACTS_DIR.trim().length > 0) {
    return path.resolve(process.env.DUBHE_CONTRACTS_DIR);
  }
  return path.resolve(process.cwd(), '..', 'contracts');
}

export function buildWorkbenchSnapshot(options: BuildOptions = {}): WorkbenchSnapshot {
  const contractsDir = resolveContractsDir(options.contractsDir);
  const reportsDir = path.join(contractsDir, DEBUG_DIRNAME);
  const traceFileLimit = Math.max(1, options.traceFileLimit ?? 400);

  const debugSessionPath = path.join(reportsDir, 'debug-session.json');
  const gasSourceMapPath = path.join(reportsDir, 'gas-source-map.json');
  const gasRegressionPath = path.join(reportsDir, 'gas-regression.json');
  const traceCallGraphPath = path.join(reportsDir, 'trace-call-graph.json');
  const traceConsistencyPath = path.join(reportsDir, 'trace-replay-consistency.json');
  const forkReplayPath = path.join(reportsDir, 'fork-replay-report.json');
  const debugReplayScriptPath = path.join(reportsDir, 'debug-replay.sh');
  const traceReplayScriptPath = path.join(reportsDir, 'trace-replay.sh');

  const debugSession = readJsonFile(debugSessionPath) as Record<string, unknown> | undefined;
  const gasSourceMap = readJsonFile(gasSourceMapPath) as Record<string, unknown> | undefined;
  const gasRegression = readJsonFile(gasRegressionPath) as Record<string, unknown> | undefined;
  const traceCallGraph = readJsonFile(traceCallGraphPath) as Record<string, unknown> | undefined;
  const traceConsistency = readJsonFile(traceConsistencyPath) as
    | Record<string, unknown>
    | undefined;
  const forkReplay = readJsonFile(forkReplayPath) as Record<string, unknown> | undefined;
  const debugReplayScript = readTextFile(debugReplayScriptPath);
  const traceReplayScript = readTextFile(traceReplayScriptPath);

  const traceFiles = listTraceFiles(contractsDir, traceFileLimit);
  const steps: WorkbenchStep[] = [];
  const issues: string[] = [];
  let traceRuntimeStats: ArtifactStats['traceRuntime'] = {
    parsedLines: 0,
    instructionSteps: 0,
    openFrames: 0,
    closeFrames: 0,
    effects: 0,
    truncated: false
  };

  const pushStep = (step: Omit<WorkbenchStep, 'index'>) => {
    steps.push({
      ...step,
      index: -1
    });
  };

  const debugGeneratedAt = toIso(debugSession?.generatedAt);
  const failedTests = Array.isArray(debugSession?.failedTests) ? debugSession.failedTests : [];
  for (const testName of failedTests) {
    if (typeof testName !== 'string') continue;
    pushStep({
      id: `debug-fail-${steps.length + 1}`,
      category: 'debug',
      severity: 'error',
      title: `Failing test: ${testName}`,
      detail: typeof debugSession?.command === 'string' ? debugSession.command : undefined,
      timestamp: debugGeneratedAt,
      command:
        typeof debugSession?.reproCommand === 'string'
          ? debugSession.reproCommand
          : typeof debugSession?.command === 'string'
          ? debugSession.command
          : undefined,
      tags: ['debug', 'failed-test', testName]
    });
  }

  const debugHints = Array.isArray(debugSession?.hints) ? debugSession.hints : [];
  for (const hint of debugHints) {
    if (typeof hint !== 'string') continue;
    pushStep({
      id: `debug-hint-${steps.length + 1}`,
      category: 'debug',
      severity: 'warn',
      title: 'Abort/Error hint',
      detail: hint,
      timestamp: debugGeneratedAt,
      tags: ['debug', 'hint']
    });
  }

  const sourceHints = Array.isArray(debugSession?.sourceHints) ? debugSession.sourceHints : [];
  for (const sourceHint of sourceHints) {
    if (!sourceHint || typeof sourceHint !== 'object') continue;
    const sourceHintObject = sourceHint as Record<string, unknown>;
    const snippet = extractSnippetFromHint(sourceHintObject);
    const sourceFile =
      typeof sourceHintObject.sourceFile === 'string' ? sourceHintObject.sourceFile : undefined;
    const sourceLine = snippet?.startLine;
    const abortCode = toNumber(sourceHintObject.abortCode);

    pushStep({
      id: `debug-source-${steps.length + 1}`,
      category: 'debug',
      severity: 'warn',
      title: `${
        typeof sourceHintObject.modulePath === 'string'
          ? sourceHintObject.modulePath
          : 'unknown-module'
      } (code=${abortCode ?? 'n/a'})`,
      detail:
        typeof sourceHintObject.functionName === 'string'
          ? `function=${sourceHintObject.functionName}`
          : 'source hint available',
      timestamp: debugGeneratedAt,
      sourceFile,
      sourceLine,
      snippet,
      tags: ['debug', 'source-hint'],
      metadata: {
        abortCode: abortCode ?? null,
        modulePath:
          typeof sourceHintObject.modulePath === 'string' ? sourceHintObject.modulePath : null,
        functionName:
          typeof sourceHintObject.functionName === 'string' ? sourceHintObject.functionName : null
      }
    });
  }

  const debugReproCommand =
    typeof debugSession?.reproCommand === 'string' ? debugSession.reproCommand : undefined;
  if (debugReproCommand && debugReproCommand.trim().length > 0) {
    pushStep({
      id: `replay-debug-repro-${steps.length + 1}`,
      category: 'replay',
      severity: 'info',
      title: 'Debug repro command',
      detail: debugReproCommand,
      timestamp: debugGeneratedAt,
      command: debugReproCommand,
      tags: ['replay', 'debug']
    });
  }

  const gasRows = Array.isArray(gasSourceMap?.rows) ? gasSourceMap.rows : [];
  const gasGeneratedAt = toIso(gasSourceMap?.generatedAt);
  for (const row of gasRows.slice(0, 100)) {
    if (!row || typeof row !== 'object') continue;
    const rowRecord = row as Record<string, unknown>;
    const gas = toNumber(rowRecord.gas) ?? 0;
    const sourceFile = typeof rowRecord.sourceFile === 'string' ? rowRecord.sourceFile : undefined;
    const sourceLine = toNumber(rowRecord.line);
    const snippet =
      sourceFile && sourceLine ? readSourceSnippet(sourceFile, sourceLine, 2) : undefined;

    pushStep({
      id: `gas-row-${steps.length + 1}`,
      category: 'gas',
      severity: gas > 1_000_000 ? 'warn' : 'info',
      title: `Gas hotspot: ${typeof rowRecord.name === 'string' ? rowRecord.name : 'unknown test'}`,
      detail: `gas=${gas.toLocaleString('en-US')}`,
      timestamp: gasGeneratedAt,
      sourceFile,
      sourceLine,
      snippet,
      tags: ['gas', 'source-map'],
      metadata: {
        module: typeof rowRecord.module === 'string' ? rowRecord.module : null,
        functionName: typeof rowRecord.functionName === 'string' ? rowRecord.functionName : null,
        nanos: toNumber(rowRecord.nanos) ?? null
      }
    });
  }

  const baselineComparison =
    gasRegression && typeof gasRegression === 'object'
      ? (gasRegression as Record<string, any>).baselineComparison
      : undefined;
  const regressionGeneratedAt = toIso(
    gasRegression && typeof gasRegression === 'object'
      ? (gasRegression as Record<string, unknown>).generatedAt
      : undefined
  );

  const regressions = Array.isArray(baselineComparison?.regressions)
    ? baselineComparison.regressions
    : [];
  for (const regression of regressions) {
    if (!regression || typeof regression !== 'object') continue;
    const row = regression as Record<string, unknown>;
    const deltaPct = toNumber(row.deltaPct);
    const deltaGas = toNumber(row.deltaGas);
    pushStep({
      id: `gas-regression-${steps.length + 1}`,
      category: 'gas',
      severity: 'error',
      title: `Gas regression: ${typeof row.name === 'string' ? row.name : 'unknown test'}`,
      detail: `deltaPct=${deltaPct?.toFixed(2) ?? 'n/a'}%, deltaGas=${deltaGas ?? 'n/a'}`,
      timestamp: regressionGeneratedAt,
      tags: ['gas', 'regression']
    });
  }

  const improvements = Array.isArray(baselineComparison?.improvements)
    ? baselineComparison.improvements
    : [];
  for (const improvement of improvements) {
    if (!improvement || typeof improvement !== 'object') continue;
    const row = improvement as Record<string, unknown>;
    const deltaPct = toNumber(row.deltaPct);
    const deltaGas = toNumber(row.deltaGas);
    pushStep({
      id: `gas-improvement-${steps.length + 1}`,
      category: 'gas',
      severity: 'info',
      title: `Gas improvement: ${typeof row.name === 'string' ? row.name : 'unknown test'}`,
      detail: `deltaPct=${deltaPct?.toFixed(2) ?? 'n/a'}%, deltaGas=${deltaGas ?? 'n/a'}`,
      timestamp: regressionGeneratedAt,
      tags: ['gas', 'improvement']
    });
  }

  const graphNodes = Array.isArray(traceCallGraph?.nodes) ? traceCallGraph.nodes : [];
  const traceGeneratedAt = toIso(traceCallGraph?.generatedAt);
  for (const node of graphNodes.slice(0, 200)) {
    if (!node || typeof node !== 'object') continue;
    const row = node as Record<string, unknown>;
    if (row.kind !== 'tx') continue;
    pushStep({
      id: `trace-graph-${steps.length + 1}`,
      category: 'trace',
      severity: 'info',
      title: `Trace tx: ${typeof row.digest === 'string' ? row.digest : 'unknown digest'}`,
      detail: typeof row.label === 'string' ? row.label : 'transaction trace',
      timestamp: traceGeneratedAt,
      tags: ['trace', 'graph']
    });
  }

  const createReplaySteps = (
    report: Record<string, unknown> | undefined,
    category: 'trace' | 'fork',
    labelPrefix: string
  ) => {
    if (!report) return;
    const reportGeneratedAt = toIso(report.generatedAt);
    const checks = Array.isArray(report.checks) ? report.checks : [];
    for (const check of checks) {
      if (!check || typeof check !== 'object') continue;
      const row = check as Record<string, unknown>;
      const ok = !!row.ok;
      const gasDeltaPct = toNumber(row.gasDeltaPct);
      const detail = row.error
        ? `error=${String(row.error)}`
        : `status=${String(row.statusOnChain ?? 'n/a')}/${String(
            row.statusDryRun ?? 'n/a'
          )}, gasDeltaPct=${gasDeltaPct?.toFixed(2) ?? 'n/a'}`;

      pushStep({
        id: `${category}-replay-${steps.length + 1}`,
        category,
        severity: ok ? 'info' : 'error',
        title: `${labelPrefix}: ${typeof row.digest === 'string' ? row.digest : 'unknown digest'}`,
        detail,
        timestamp: reportGeneratedAt,
        tags: [category, 'replay', ok ? 'ok' : 'mismatch']
      });
    }
  };

  createReplaySteps(
    traceConsistency as Record<string, unknown> | undefined,
    'trace',
    'Trace consistency'
  );
  createReplaySteps(forkReplay as Record<string, unknown> | undefined, 'fork', 'Fork replay');

  const latestTrace = traceFiles[0];
  if (latestTrace) {
    const parsedTrace = parseTraceFile(latestTrace.path, {
      contractsDir,
      maxLines: 120_000,
      maxSteps: 1_500
    });

    traceRuntimeStats = {
      parsedLines: parsedTrace.stats.parsedLines,
      instructionSteps: parsedTrace.stats.instructionSteps,
      openFrames: parsedTrace.stats.openFrames,
      closeFrames: parsedTrace.stats.closeFrames,
      effects: parsedTrace.stats.effects,
      truncated: parsedTrace.stats.truncatedByLines || parsedTrace.stats.truncatedBySteps
    };
    issues.push(...parsedTrace.issues);

    for (const instruction of parsedTrace.steps) {
      pushStep({
        id: `trace-instruction-${steps.length + 1}`,
        category: 'trace',
        severity: 'info',
        title: instruction.title,
        detail: instruction.detail,
        timestamp: latestTrace.updatedAt,
        sourceFile: instruction.sourceFile,
        sourceLine: instruction.sourceLine,
        command: `dubhe debug-open --trace-file ${latestTrace.path}`,
        tags: ['trace', 'instruction', (instruction.instruction || 'op').toLowerCase()],
        callStack: instruction.callStack,
        variables: instruction.variables,
        state: instruction.state,
        metadata: instruction.metadata
      });
    }
  }

  for (const traceFile of traceFiles) {
    pushStep({
      id: `trace-file-${steps.length + 1}`,
      category: 'trace',
      severity: 'info',
      title: `Trace file: ${path.basename(traceFile.path)}`,
      detail: `${traceFile.relativePath} (${traceFile.size.toLocaleString('en-US')} bytes)`,
      timestamp: traceFile.updatedAt,
      command: `dubhe debug-open --trace-file ${traceFile.path}`,
      tags: ['trace', 'file'],
      metadata: {
        size: traceFile.size,
        relativePath: traceFile.relativePath
      }
    });
  }

  const replayCommands = [
    ...(debugReproCommand ? [debugReproCommand] : []),
    ...(debugReplayScript ? parseReplayScriptCommands(debugReplayScript) : []),
    ...(traceReplayScript ? parseReplayScriptCommands(traceReplayScript) : [])
  ];

  for (const command of replayCommands) {
    pushStep({
      id: `replay-command-${steps.length + 1}`,
      category: 'replay',
      severity: 'info',
      title: 'Replay command',
      detail: command,
      command,
      timestamp: new Date().toISOString(),
      tags: ['replay', 'command']
    });
  }

  const sortedSteps = steps.sort(stepSort).map((step, index) => ({
    ...step,
    index
  }));

  const availability: ArtifactAvailability = {
    debugSession: !!debugSession,
    gasSourceMap: !!gasSourceMap,
    gasRegression: !!gasRegression,
    traceCallGraph: !!traceCallGraph,
    traceConsistency: !!traceConsistency,
    forkReplay: !!forkReplay,
    debugReplayScript: !!debugReplayScript,
    traceReplayScript: !!traceReplayScript
  };

  const artifactStats: ArtifactStats = {
    availability,
    traceGraph: extractTraceGraphStats(traceCallGraph),
    debug: {
      failedTests: failedTests.length,
      hints: debugHints.length,
      sourceHints: sourceHints.length
    },
    gas: {
      rows: gasRows.length,
      regressions: regressions.length,
      improvements: improvements.length
    },
    traceRuntime: traceRuntimeStats
  };

  const watchedPaths = [
    debugSessionPath,
    gasSourceMapPath,
    gasRegressionPath,
    traceCallGraphPath,
    traceConsistencyPath,
    forkReplayPath,
    debugReplayScriptPath,
    traceReplayScriptPath,
    ...traceFiles.map((item) => item.path)
  ];

  if (!availability.debugSession) {
    issues.push(
      'debug-session.json not found. Run: pnpm --filter contracts run debug:collect:once'
    );
  }
  if (!availability.gasSourceMap) {
    issues.push(
      'gas-source-map.json not found. Run: pnpm --filter contracts run debug:collect:once'
    );
  }
  if (traceFiles.length === 0) {
    issues.push('No trace .json.zst files found under contracts/src/**/traces.');
  }

  return {
    revision: computeRevision(watchedPaths),
    generatedAt: new Date().toISOString(),
    contractsDir,
    reportsDir,
    summary: makeSummary(sortedSteps),
    steps: sortedSteps,
    replayCommands: Array.from(new Set(replayCommands)),
    traceFiles,
    artifactStats,
    issues
  };
}
