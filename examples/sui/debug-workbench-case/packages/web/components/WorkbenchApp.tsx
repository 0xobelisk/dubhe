'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  StepCategory,
  StepSeverity,
  WorkbenchSnapshot,
  WorkbenchStep
} from '@/lib/debug-data';

type StreamState = 'connecting' | 'live' | 'degraded';

type CompareStats = {
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

type CompareResponse = {
  left: {
    path: string;
    stats: CompareStats;
    issues: string[];
  };
  right: {
    path: string;
    stats: CompareStats;
    issues: string[];
  };
  summary: {
    instructionDelta: number;
    effectDelta: number;
    lineDelta: number;
    sharedInstructionKeys: number;
    onlyLeftInstructionKeys: number;
    onlyRightInstructionKeys: number;
  };
  topInstructionDiffs: { key: string; left: number; right: number; delta: number }[];
  topFunctionDiffs: { key: string; left: number; right: number; delta: number }[];
  onlyLeftSamples: string[];
  onlyRightSamples: string[];
  error?: string;
};

type RunResponse = {
  ok: boolean;
  command?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  error?: string;
};

type StepAnnotation = {
  starred: boolean;
  note: string;
  updatedAt: string;
};

type AnnotationResponse = {
  ok: boolean;
  revision: string;
  updatedAt: string;
  annotations: Record<string, StepAnnotation>;
  error?: string;
  currentRevision?: string;
  currentAnnotations?: Record<string, StepAnnotation>;
};

type AnnotationSyncState = 'idle' | 'pulling' | 'pushing' | 'synced' | 'conflict' | 'error';

type StepCluster = {
  key: string;
  count: number;
  severity: StepSeverity;
  category: StepCategory;
  sampleStepId: string;
  sampleTitle: string;
  sampleDetail: string;
  topFrame: string;
};

type BreakpointContext = {
  category: StepCategory;
  severity: StepSeverity;
  title: string;
  detail: string;
  module: string;
  functionName: string;
  instruction: string;
  tags: string[];
  vars: Record<string, string>;
  metadata: Record<string, string | number | boolean | null>;
};

type BreakpointPredicate = (ctx: BreakpointContext) => boolean;

type CommandAction = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  run: () => void;
};

const POLL_INTERVAL_MS = 5000;
const DEFAULT_PLAYBACK_MS = 500;
const PLAYBACK_SPEED_OPTIONS = [200, 500, 1000, 2000] as const;
const CATEGORY_VALUES: StepCategory[] = ['debug', 'gas', 'trace', 'fork', 'replay'];
const SEVERITY_VALUES: StepSeverity[] = ['info', 'warn', 'error'];
const STORAGE_ANNOTATIONS_KEY = 'dubhe-workbench-v06-annotations';
const TIMELINE_CHUNK_SIZE = 220;

function formatDate(value?: string): string {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(size >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDelta(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function normalizeMessage(value: string): string {
  return value
    .toLowerCase()
    .replace(/0x[a-f0-9]+/g, '0x#')
    .replace(/\b\d+\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replaceAll(',', ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function metadataNumber(step: WorkbenchStep, key: string): number | undefined {
  if (!step.metadata) return undefined;
  return asNumber(step.metadata[key]);
}

async function fetchSnapshot(signal?: AbortSignal): Promise<WorkbenchSnapshot> {
  const response = await fetch('/api/debug/payload', {
    method: 'GET',
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    throw new Error(`snapshot request failed: ${response.status}`);
  }

  return (await response.json()) as WorkbenchSnapshot;
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function severityClass(severity: StepSeverity): string {
  if (severity === 'error') return 'sev-error';
  if (severity === 'warn') return 'sev-warn';
  return 'sev-info';
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseCategory(value: string | null): '' | StepCategory {
  if (!value) return '';
  return CATEGORY_VALUES.includes(value as StepCategory) ? (value as StepCategory) : '';
}

function parseSeverity(value: string | null): '' | StepSeverity {
  if (!value) return '';
  return SEVERITY_VALUES.includes(value as StepSeverity) ? (value as StepSeverity) : '';
}

function parsePlaybackSpeed(value: string | null): number {
  if (!value) return DEFAULT_PLAYBACK_MS;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PLAYBACK_MS;
  return PLAYBACK_SPEED_OPTIONS.includes(parsed as (typeof PLAYBACK_SPEED_OPTIONS)[number])
    ? parsed
    : DEFAULT_PLAYBACK_MS;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function setOrDeleteQueryParam(params: URLSearchParams, key: string, value?: string): void {
  if (typeof value === 'string' && value.length > 0) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function parseWatchVariables(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
    )
  );
}

function annotationUpdatedAt(annotation: StepAnnotation | undefined): number {
  if (!annotation) return 0;
  const ts = Date.parse(annotation.updatedAt);
  return Number.isFinite(ts) ? ts : 0;
}

function mergeAnnotationsByUpdatedAt(
  local: Record<string, StepAnnotation>,
  remote: Record<string, StepAnnotation>
): Record<string, StepAnnotation> {
  const merged: Record<string, StepAnnotation> = { ...local };
  for (const [stepId, incoming] of Object.entries(remote)) {
    const current = merged[stepId];
    if (!current || annotationUpdatedAt(incoming) >= annotationUpdatedAt(current)) {
      merged[stepId] = incoming;
    }
  }
  return merged;
}

function buildBreakpointContext(step: WorkbenchStep): BreakpointContext {
  const vars: Record<string, string> = {};
  for (const variable of step.variables ?? []) {
    vars[variable.name] = variable.value;
  }

  return {
    category: step.category,
    severity: step.severity,
    title: step.title,
    detail: step.detail ?? '',
    module: normalized(step.metadata?.module),
    functionName: normalized(step.metadata?.functionName),
    instruction: normalized(step.metadata?.instruction),
    tags: step.tags,
    vars,
    metadata: step.metadata ?? {}
  };
}

function compileBreakpointExpression(expression: string): {
  fn: BreakpointPredicate | null;
  error: string | null;
} {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { fn: null, error: null };
  }

  try {
    const fn = new Function(
      'ctx',
      `const { category, severity, title, detail, module, functionName, instruction, tags, vars, metadata } = ctx;\nreturn Boolean(${trimmed});`
    ) as BreakpointPredicate;
    return { fn, error: null };
  } catch (error) {
    return {
      fn: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function toFrameLabel(step: WorkbenchStep): string {
  const topFrame = step.callStack?.[0];
  if (topFrame) {
    return `${topFrame.module}::${topFrame.functionName}`;
  }
  const module = normalized(step.metadata?.module);
  const fn = normalized(step.metadata?.functionName);
  if (module || fn) {
    return `${module || 'unknown'}::${fn || 'unknown'}`;
  }
  return 'n/a';
}

function computeClusterKey(step: WorkbenchStep): string {
  const detail = normalizeMessage(step.detail || step.title);
  return `${step.category}|${toFrameLabel(step)}|${detail}`;
}

function findNextBreakpointIndex(
  steps: WorkbenchStep[],
  startIndex: number,
  match: (step: WorkbenchStep) => boolean,
  hitEvery: number
): number {
  let hitCount = 0;

  for (let idx = startIndex; idx < steps.length; idx += 1) {
    if (!match(steps[idx])) continue;
    hitCount += 1;
    if (hitCount >= hitEvery) {
      return idx;
    }
  }

  return -1;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function WorkbenchApp() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | StepCategory>('');
  const [severity, setSeverity] = useState<'' | StepSeverity>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState>('connecting');

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMs, setPlaybackMs] = useState(DEFAULT_PLAYBACK_MS);

  const [breakpointEnabled, setBreakpointEnabled] = useState(false);
  const [breakpointModule, setBreakpointModule] = useState('');
  const [breakpointFunction, setBreakpointFunction] = useState('');
  const [breakpointInstruction, setBreakpointInstruction] = useState('');
  const [breakpointExpression, setBreakpointExpression] = useState('');
  const [breakpointWatchVariables, setBreakpointWatchVariables] = useState('');
  const [breakpointHitEvery, setBreakpointHitEvery] = useState(1);

  const [compareLeft, setCompareLeft] = useState('');
  const [compareRight, setCompareRight] = useState('');
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const [annotations, setAnnotations] = useState<Record<string, StepAnnotation>>({});
  const [serverRevision, setServerRevision] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<AnnotationSyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [runBusy, setRunBusy] = useState(false);
  const [runLabel, setRunLabel] = useState('');
  const [runResult, setRunResult] = useState<RunResponse | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const [urlStateLoaded, setUrlStateLoaded] = useState(false);
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_CHUNK_SIZE);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
  const autoSyncTimerRef = useRef<number | null>(null);
  const annotationsRef = useRef<Record<string, StepAnnotation>>({});
  const lastSyncedSignatureRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('q') ?? '');
    setCategory(parseCategory(params.get('category')));
    setSeverity(parseSeverity(params.get('severity')));
    setSelectedStepId(params.get('step') || null);
    setBreakpointEnabled(params.get('bp') === '1');
    setBreakpointModule(params.get('bpm') ?? '');
    setBreakpointFunction(params.get('bpf') ?? '');
    setBreakpointInstruction(params.get('bpi') ?? '');
    setBreakpointExpression(params.get('bpe') ?? '');
    setBreakpointWatchVariables(params.get('bpw') ?? '');
    setBreakpointHitEvery(parsePositiveInt(params.get('bph'), 1));
    setPlaybackMs(parsePlaybackSpeed(params.get('speed')));
    setUrlStateLoaded(true);

    try {
      const raw = window.localStorage.getItem(STORAGE_ANNOTATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, StepAnnotation>;
        if (parsed && typeof parsed === 'object') {
          setAnnotations(parsed);
        }
      }
    } catch {
      // Keep empty annotations on parse failures.
    }
  }, []);

  useEffect(() => {
    if (!urlStateLoaded) return;
    const params = new URLSearchParams(window.location.search);
    setOrDeleteQueryParam(params, 'q', search.trim() || undefined);
    setOrDeleteQueryParam(params, 'category', category || undefined);
    setOrDeleteQueryParam(params, 'severity', severity || undefined);
    setOrDeleteQueryParam(params, 'step', selectedStepId || undefined);
    setOrDeleteQueryParam(params, 'bp', breakpointEnabled ? '1' : undefined);
    setOrDeleteQueryParam(params, 'bpm', breakpointModule.trim() || undefined);
    setOrDeleteQueryParam(params, 'bpf', breakpointFunction.trim() || undefined);
    setOrDeleteQueryParam(params, 'bpi', breakpointInstruction.trim() || undefined);
    setOrDeleteQueryParam(params, 'bpe', breakpointExpression.trim() || undefined);
    setOrDeleteQueryParam(params, 'bpw', breakpointWatchVariables.trim() || undefined);
    setOrDeleteQueryParam(
      params,
      'bph',
      breakpointHitEvery > 1 ? String(Math.max(1, Math.floor(breakpointHitEvery))) : undefined
    );
    setOrDeleteQueryParam(
      params,
      'speed',
      playbackMs === DEFAULT_PLAYBACK_MS ? undefined : String(playbackMs)
    );

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [
    breakpointEnabled,
    breakpointExpression,
    breakpointFunction,
    breakpointHitEvery,
    breakpointInstruction,
    breakpointModule,
    breakpointWatchVariables,
    category,
    playbackMs,
    search,
    selectedStepId,
    severity,
    urlStateLoaded
  ]);

  useEffect(() => {
    if (!urlStateLoaded) return;
    window.localStorage.setItem(STORAGE_ANNOTATIONS_KEY, JSON.stringify(annotations));
  }, [annotations, urlStateLoaded]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const refreshSnapshot = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const nextSnapshot = await fetchSnapshot();
      setSnapshot(nextSnapshot);
      setError(null);
      setSelectedStepId((current) => current ?? nextSnapshot.steps[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const pullAnnotations = useCallback(async () => {
    setSyncState('pulling');
    setSyncError(null);

    try {
      const params = new URLSearchParams();
      if (snapshot?.contractsDir) {
        params.set('contractsDir', snapshot.contractsDir);
      }
      const query = params.toString();
      const response = await fetch(`/api/debug/annotations${query ? `?${query}` : ''}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const result = (await response.json()) as AnnotationResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `annotations pull failed: ${response.status}`);
      }

      setServerRevision(result.revision);
      setLastSyncedAt(result.updatedAt);
      setAnnotations((current) => {
        const merged = mergeAnnotationsByUpdatedAt(current, result.annotations ?? {});
        const signature = JSON.stringify(merged);
        lastSyncedSignatureRef.current = signature;
        annotationsRef.current = merged;
        return merged;
      });
      setSyncState('synced');
      return true;
    } catch (requestError) {
      setSyncState('error');
      setSyncError(requestError instanceof Error ? requestError.message : String(requestError));
      return false;
    }
  }, [snapshot?.contractsDir]);

  const pushAnnotations = useCallback(
    async (silent: boolean = false) => {
      if (!urlStateLoaded || !snapshot?.contractsDir || serverRevision === null) return false;
      if (!silent) {
        setSyncState('pushing');
      }
      setSyncError(null);

      try {
        const payload = {
          contractsDir: snapshot.contractsDir,
          revision: serverRevision,
          annotations: annotationsRef.current
        };
        const response = await fetch('/api/debug/annotations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const result = (await response.json()) as AnnotationResponse;

        if (response.status === 409) {
          const remote = result.currentAnnotations ?? {};
          const merged = mergeAnnotationsByUpdatedAt(annotationsRef.current, remote);
          const mergedSignature = JSON.stringify(merged);
          lastSyncedSignatureRef.current = mergedSignature;
          annotationsRef.current = merged;
          setAnnotations(merged);
          setServerRevision(result.currentRevision ?? serverRevision);
          setSyncState('conflict');
          setSyncError(
            'Server annotations updated concurrently. Pulled latest state, please push again.'
          );
          return false;
        }

        if (!response.ok || !result.ok) {
          throw new Error(result.error || `annotations push failed: ${response.status}`);
        }

        const signature = JSON.stringify(annotationsRef.current);
        lastSyncedSignatureRef.current = signature;
        setServerRevision(result.revision);
        setLastSyncedAt(result.updatedAt);
        setSyncState('synced');
        return true;
      } catch (requestError) {
        setSyncState('error');
        setSyncError(requestError instanceof Error ? requestError.message : String(requestError));
        return false;
      }
    },
    [serverRevision, snapshot?.contractsDir, urlStateLoaded]
  );

  useEffect(() => {
    void refreshSnapshot('initial');
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!urlStateLoaded || !snapshot?.contractsDir || serverRevision !== null) return;
    void pullAnnotations();
  }, [pullAnnotations, serverRevision, snapshot?.contractsDir, urlStateLoaded]);

  useEffect(() => {
    if (!urlStateLoaded || serverRevision === null) return;
    const signature = JSON.stringify(annotations);
    if (signature === lastSyncedSignatureRef.current) return;

    if (autoSyncTimerRef.current !== null) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(() => {
      void pushAnnotations(true);
    }, 1200);

    return () => {
      if (autoSyncTimerRef.current !== null) {
        window.clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [annotations, pushAnnotations, serverRevision, urlStateLoaded]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshSnapshot();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    const source = new EventSource('/api/debug/stream');

    const onRevision = () => {
      setStreamState('live');
      void refreshSnapshot();
    };

    const onStreamError = () => {
      setStreamState('degraded');
    };

    source.addEventListener('revision', onRevision);
    source.addEventListener('error', onStreamError);
    source.onerror = onStreamError;

    return () => {
      source.removeEventListener('revision', onRevision);
      source.removeEventListener('error', onStreamError);
      source.close();
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!snapshot?.traceFiles || snapshot.traceFiles.length === 0) return;
    setCompareLeft((current) => current || snapshot.traceFiles[0].path);
    setCompareRight((current) => {
      if (current) return current;
      if (snapshot.traceFiles.length > 1) return snapshot.traceFiles[1].path;
      return snapshot.traceFiles[0].path;
    });
  }, [snapshot?.traceFiles]);

  const filteredSteps = useMemo(() => {
    const rows = snapshot?.steps ?? [];
    const keyword = search.trim().toLowerCase();

    return rows.filter((step) => {
      if (category && step.category !== category) return false;
      if (severity && step.severity !== severity) return false;
      if (!keyword) return true;

      const haystack = [
        step.title,
        step.detail ?? '',
        step.sourceFile ?? '',
        step.command ?? '',
        step.tags.join(' '),
        JSON.stringify(step.metadata ?? {})
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [snapshot, category, severity, search]);

  const visibleTimelineSteps = useMemo(() => {
    return filteredSteps.slice(0, Math.min(filteredSteps.length, timelineVisibleCount));
  }, [filteredSteps, timelineVisibleCount]);

  const selectedStep = useMemo(() => {
    if (!selectedStepId) return null;
    return filteredSteps.find((step) => step.id === selectedStepId) ?? null;
  }, [filteredSteps, selectedStepId]);

  const selectedStepIndex = useMemo(() => {
    if (!selectedStep) return -1;
    return filteredSteps.findIndex((step) => step.id === selectedStep.id);
  }, [filteredSteps, selectedStep]);

  const hiddenTimelineCount = Math.max(0, filteredSteps.length - visibleTimelineSteps.length);

  useEffect(() => {
    if (filteredSteps.length === 0) {
      setSelectedStepId(null);
      return;
    }

    const exists = selectedStepId
      ? filteredSteps.some((step) => step.id === selectedStepId)
      : false;
    if (!exists) {
      setSelectedStepId(filteredSteps[0].id);
    }
  }, [filteredSteps, selectedStepId]);

  useEffect(() => {
    setTimelineVisibleCount(TIMELINE_CHUNK_SIZE);
  }, [search, category, severity]);

  useEffect(() => {
    if (selectedStepIndex < 0) return;
    if (selectedStepIndex < timelineVisibleCount) return;

    const nextVisible =
      Math.ceil((selectedStepIndex + 1) / TIMELINE_CHUNK_SIZE) * TIMELINE_CHUNK_SIZE;
    setTimelineVisibleCount(Math.min(filteredSteps.length, nextVisible));
  }, [filteredSteps.length, selectedStepIndex, timelineVisibleCount]);

  const watchTokens = useMemo(
    () => parseWatchVariables(breakpointWatchVariables),
    [breakpointWatchVariables]
  );

  const { fn: breakpointPredicate, error: breakpointExpressionError } = useMemo(
    () => compileBreakpointExpression(breakpointExpression),
    [breakpointExpression]
  );

  const isBreakpointMatch = useCallback(
    (step: WorkbenchStep): boolean => {
      const moduleNeedle = breakpointModule.trim().toLowerCase();
      const functionNeedle = breakpointFunction.trim().toLowerCase();
      const instructionNeedle = breakpointInstruction.trim().toLowerCase();
      const hasAnyFilter =
        !!moduleNeedle ||
        !!functionNeedle ||
        !!instructionNeedle ||
        !!breakpointExpression.trim() ||
        watchTokens.length > 0;

      if (!hasAnyFilter) return false;

      const context = buildBreakpointContext(step);

      if (moduleNeedle && !context.module.includes(moduleNeedle)) return false;
      if (functionNeedle && !context.functionName.includes(functionNeedle)) return false;
      if (instructionNeedle && !context.instruction.includes(instructionNeedle)) return false;

      if (watchTokens.length > 0) {
        const names = Object.keys(context.vars).map((name) => name.toLowerCase());
        const watched = watchTokens.some((token) => names.some((name) => name.includes(token)));
        if (!watched) return false;
      }

      if (breakpointPredicate) {
        try {
          if (!breakpointPredicate(context)) return false;
        } catch {
          return false;
        }
      }

      return true;
    },
    [
      breakpointExpression,
      breakpointFunction,
      breakpointInstruction,
      breakpointModule,
      breakpointPredicate,
      watchTokens
    ]
  );

  const breakpointMatches = useMemo(() => {
    return filteredSteps.filter((step) => isBreakpointMatch(step));
  }, [filteredSteps, isBreakpointMatch]);

  const issueDraft = useMemo(() => {
    if (!selectedStep) return '';
    return [
      '## Dubhe Debug Report',
      `- revision: ${snapshot?.revision ?? 'n/a'}`,
      `- generatedAt: ${snapshot?.generatedAt ?? 'n/a'}`,
      `- step: #${selectedStep.index + 1} (${selectedStep.id})`,
      `- category/severity: ${selectedStep.category}/${selectedStep.severity}`,
      `- source: ${
        selectedStep.sourceFile
          ? `${selectedStep.sourceFile}${
              selectedStep.sourceLine ? `:${selectedStep.sourceLine}` : ''
            }`
          : 'n/a'
      }`,
      `- title: ${selectedStep.title}`,
      selectedStep.detail ? `- detail: ${selectedStep.detail}` : '- detail: n/a',
      '',
      '### Replay',
      ...(snapshot?.replayCommands.length ? snapshot.replayCommands.slice(0, 3) : ['n/a'])
    ].join('\n');
  }, [selectedStep, snapshot?.generatedAt, snapshot?.replayCommands, snapshot?.revision]);

  const togglePlay = useCallback(() => {
    setIsPlaying((value) => !value);
  }, []);

  const goPrev = useCallback(() => {
    if (selectedStepIndex <= 0) return;
    setSelectedStepId(filteredSteps[selectedStepIndex - 1].id);
  }, [filteredSteps, selectedStepIndex]);

  const goNext = useCallback(() => {
    if (selectedStepIndex < 0 || selectedStepIndex >= filteredSteps.length - 1) return;
    setSelectedStepId(filteredSteps[selectedStepIndex + 1].id);
  }, [filteredSteps, selectedStepIndex]);

  const goNextBreakpoint = useCallback(() => {
    if (filteredSteps.length === 0) return;
    const startIndex = Math.max(0, selectedStepIndex + 1);
    const idx = findNextBreakpointIndex(
      filteredSteps,
      startIndex,
      isBreakpointMatch,
      Math.max(1, Math.floor(breakpointHitEvery))
    );
    if (idx >= 0) {
      setSelectedStepId(filteredSteps[idx].id);
    }
  }, [breakpointHitEvery, filteredSteps, isBreakpointMatch, selectedStepIndex]);

  const loadMoreTimeline = useCallback(() => {
    setTimelineVisibleCount((current) =>
      Math.min(filteredSteps.length, current + TIMELINE_CHUNK_SIZE)
    );
  }, [filteredSteps.length]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setSelectedStepId((currentId) => {
        const currentIndex = filteredSteps.findIndex((step) => step.id === currentId);
        const normalizedIndex = currentIndex < 0 ? 0 : currentIndex + 1;

        if (breakpointEnabled) {
          const idx = findNextBreakpointIndex(
            filteredSteps,
            normalizedIndex,
            isBreakpointMatch,
            Math.max(1, Math.floor(breakpointHitEvery))
          );
          if (idx >= 0) {
            setIsPlaying(false);
            return filteredSteps[idx].id;
          }
          setIsPlaying(false);
          return currentId;
        }

        if (normalizedIndex >= filteredSteps.length) {
          setIsPlaying(false);
          return currentId;
        }

        return filteredSteps[normalizedIndex].id;
      });
    }, playbackMs);

    return () => {
      clearInterval(timer);
    };
  }, [
    breakpointEnabled,
    breakpointHitEvery,
    filteredSteps,
    isBreakpointMatch,
    isPlaying,
    playbackMs
  ]);

  const copyShareLink = useCallback(() => {
    void copyText(window.location.href);
  }, []);

  const copyIssueDraft = useCallback(() => {
    if (!issueDraft) return;
    void copyText(issueDraft);
  }, [issueDraft]);

  const runAction = useCallback(
    async (
      payload: {
        action: 'collect' | 'debug-open' | 'replay';
        traceFile?: string;
        command?: string;
      },
      label: string
    ) => {
      setRunBusy(true);
      setRunLabel(label);
      setRunResult(null);

      try {
        const response = await fetch('/api/debug/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = (await response.json()) as RunResponse;
        setRunResult(result);

        if (result.ok) {
          void refreshSnapshot();
        }
      } catch (requestError) {
        setRunResult({
          ok: false,
          error: requestError instanceof Error ? requestError.message : String(requestError)
        });
      } finally {
        setRunBusy(false);
      }
    },
    [refreshSnapshot]
  );

  const runCollect = useCallback(() => {
    void runAction({ action: 'collect' }, 'Collect Debug Artifacts');
  }, [runAction]);

  const runDebugOpen = useCallback(
    (traceFile?: string) => {
      void runAction({ action: 'debug-open', traceFile }, 'Run debug-open (headless)');
    },
    [runAction]
  );

  const runReplay = useCallback(
    (command: string) => {
      void runAction({ action: 'replay', command }, 'Replay Command');
    },
    [runAction]
  );

  const runCompare = useCallback(async () => {
    if (!compareLeft || !compareRight) {
      setCompareError('Select two trace files first.');
      return;
    }
    if (compareLeft === compareRight) {
      setCompareError('Trace A and Trace B must be different.');
      return;
    }

    setIsComparing(true);
    setCompareError(null);

    try {
      const params = new URLSearchParams({ a: compareLeft, b: compareRight });
      const response = await fetch(`/api/debug/compare?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const data = (await response.json()) as CompareResponse;
      if (!response.ok) {
        throw new Error(data.error || `compare request failed: ${response.status}`);
      }
      setCompareData(data);
    } catch (requestError) {
      setCompareData(null);
      setCompareError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsComparing(false);
    }
  }, [compareLeft, compareRight]);

  const swapCompare = useCallback(() => {
    setCompareLeft(compareRight);
    setCompareRight(compareLeft);
  }, [compareLeft, compareRight]);

  const compareLatestTwo = useCallback(() => {
    if (!snapshot || snapshot.traceFiles.length < 2) return;
    setCompareLeft(snapshot.traceFiles[1].path);
    setCompareRight(snapshot.traceFiles[0].path);
  }, [snapshot]);

  const updateAnnotation = useCallback((stepId: string, patch: Partial<StepAnnotation>) => {
    setAnnotations((prev) => {
      const current = prev[stepId] ?? {
        starred: false,
        note: '',
        updatedAt: new Date(0).toISOString()
      };
      const next: StepAnnotation = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };

      if (!next.starred && !next.note.trim()) {
        const clone = { ...prev };
        delete clone[stepId];
        return clone;
      }

      return {
        ...prev,
        [stepId]: next
      };
    });
  }, []);

  const selectedAnnotation = useMemo(() => {
    if (!selectedStep) return undefined;
    return annotations[selectedStep.id];
  }, [annotations, selectedStep]);

  const bookmarkedSteps = useMemo(() => {
    if (!snapshot) return [];
    const rows: { step: WorkbenchStep; annotation: StepAnnotation }[] = [];

    for (const [stepId, annotation] of Object.entries(annotations)) {
      const step = snapshot.steps.find((item) => item.id === stepId);
      if (!step) continue;
      rows.push({ step, annotation });
    }

    rows.sort((a, b) => Date.parse(b.annotation.updatedAt) - Date.parse(a.annotation.updatedAt));
    return rows;
  }, [annotations, snapshot]);

  const exceptionClusters = useMemo(() => {
    const rows = snapshot?.steps ?? [];
    const clusters = new Map<string, StepCluster>();

    for (const step of rows) {
      if (step.severity === 'info') continue;
      const key = computeClusterKey(step);
      const current = clusters.get(key);

      if (current) {
        current.count += 1;
        continue;
      }

      clusters.set(key, {
        key,
        count: 1,
        severity: step.severity,
        category: step.category,
        sampleStepId: step.id,
        sampleTitle: step.title,
        sampleDetail: step.detail ?? '',
        topFrame: toFrameLabel(step)
      });
    }

    return Array.from(clusters.values()).sort((a, b) => b.count - a.count);
  }, [snapshot?.steps]);

  const gasHeatRows = useMemo(() => {
    const rows = snapshot?.steps ?? [];
    const bucket = new Map<
      string,
      {
        sourceFile: string;
        sourceLine: number;
        totalGas: number;
        maxGas: number;
        hits: number;
        stepId: string;
      }
    >();

    for (const step of rows) {
      if (step.category !== 'gas') continue;
      if (!step.sourceFile || !step.sourceLine) continue;
      const gas =
        metadataNumber(step, 'gas') ?? asNumber(step.detail?.match(/gas=([\d,]+)/)?.[1]) ?? 0;
      if (!Number.isFinite(gas) || gas <= 0) continue;

      const key = `${step.sourceFile}:${step.sourceLine}`;
      const current = bucket.get(key);
      if (current) {
        current.totalGas += gas;
        current.maxGas = Math.max(current.maxGas, gas);
        current.hits += 1;
      } else {
        bucket.set(key, {
          sourceFile: step.sourceFile,
          sourceLine: step.sourceLine,
          totalGas: gas,
          maxGas: gas,
          hits: 1,
          stepId: step.id
        });
      }
    }

    return Array.from(bucket.values()).sort((a, b) => b.maxGas - a.maxGas);
  }, [snapshot?.steps]);

  const gasRegressionRows = useMemo(() => {
    const rows = snapshot?.steps ?? [];
    const out: {
      id: string;
      title: string;
      deltaPct: number;
      deltaGas: number;
      severity: StepSeverity;
    }[] = [];

    for (const step of rows) {
      if (step.category !== 'gas') continue;
      if (!(step.tags.includes('regression') || step.tags.includes('improvement'))) continue;
      const deltaPct = metadataNumber(step, 'deltaPct') ?? 0;
      const deltaGas = metadataNumber(step, 'deltaGas') ?? 0;
      out.push({
        id: step.id,
        title: String(step.metadata?.name ?? step.title),
        deltaPct,
        deltaGas,
        severity: step.severity
      });
    }

    return out.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  }, [snapshot?.steps]);

  const reportBundle = useMemo(() => {
    return {
      meta: {
        revision: snapshot?.revision ?? 'n/a',
        generatedAt: snapshot?.generatedAt ?? new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        selectedStepId: selectedStep?.id ?? null
      },
      filters: {
        search,
        category,
        severity
      },
      breakpoint: {
        enabled: breakpointEnabled,
        module: breakpointModule,
        functionName: breakpointFunction,
        instruction: breakpointInstruction,
        expression: breakpointExpression,
        watchVariables: watchTokens,
        hitEvery: Math.max(1, Math.floor(breakpointHitEvery))
      },
      summary: snapshot?.summary,
      selectedStep,
      bookmarks: bookmarkedSteps.map((item) => ({
        stepId: item.step.id,
        title: item.step.title,
        severity: item.step.severity,
        category: item.step.category,
        note: item.annotation.note,
        starred: item.annotation.starred,
        updatedAt: item.annotation.updatedAt
      })),
      clusters: exceptionClusters.slice(0, 30),
      compare: compareData,
      runResult
    };
  }, [
    bookmarkedSteps,
    breakpointEnabled,
    breakpointExpression,
    breakpointFunction,
    breakpointHitEvery,
    breakpointInstruction,
    breakpointModule,
    category,
    compareData,
    exceptionClusters,
    runResult,
    search,
    selectedStep,
    severity,
    snapshot?.generatedAt,
    snapshot?.revision,
    snapshot?.summary,
    watchTokens
  ]);

  const copyShareBundle = useCallback(() => {
    const text = JSON.stringify(reportBundle, null, 2);
    void copyText(text);
  }, [reportBundle]);

  const exportJson = useCallback(() => {
    const json = JSON.stringify(reportBundle, null, 2);
    downloadText(
      `dubhe-workbench-report-${Date.now()}.json`,
      json,
      'application/json;charset=utf-8'
    );
  }, [reportBundle]);

  const exportMarkdown = useCallback(() => {
    const md = [
      '# Dubhe Workbench Report',
      '',
      `- revision: ${reportBundle.meta.revision}`,
      `- generatedAt: ${reportBundle.meta.generatedAt}`,
      `- url: ${reportBundle.meta.url || 'n/a'}`,
      `- selectedStepId: ${reportBundle.meta.selectedStepId || 'n/a'}`,
      '',
      '## Summary',
      `- totalSteps: ${reportBundle.summary?.totalSteps ?? 0}`,
      `- errors: ${reportBundle.summary?.errorSteps ?? 0}`,
      `- warnings: ${reportBundle.summary?.warnSteps ?? 0}`,
      '',
      '## Filters',
      `- search: ${reportBundle.filters.search || 'n/a'}`,
      `- category: ${reportBundle.filters.category || 'all'}`,
      `- severity: ${reportBundle.filters.severity || 'all'}`,
      '',
      '## Breakpoint',
      `- enabled: ${reportBundle.breakpoint.enabled}`,
      `- module: ${reportBundle.breakpoint.module || 'n/a'}`,
      `- function: ${reportBundle.breakpoint.functionName || 'n/a'}`,
      `- instruction: ${reportBundle.breakpoint.instruction || 'n/a'}`,
      `- expression: ${reportBundle.breakpoint.expression || 'n/a'}`,
      `- watch: ${reportBundle.breakpoint.watchVariables.join(', ') || 'n/a'}`,
      `- hitEvery: ${reportBundle.breakpoint.hitEvery}`,
      '',
      '## Selected Step',
      reportBundle.selectedStep
        ? `- #${reportBundle.selectedStep.index + 1} ${reportBundle.selectedStep.title}`
        : '- n/a',
      reportBundle.selectedStep?.detail
        ? `- detail: ${reportBundle.selectedStep.detail}`
        : '- detail: n/a',
      '',
      '## Bookmarks',
      ...(reportBundle.bookmarks.length
        ? reportBundle.bookmarks.map(
            (item) =>
              `- ${item.starred ? '★' : '-'} [${item.severity}] ${item.category} ${item.title} :: ${
                item.note || 'no note'
              }`
          )
        : ['- n/a']),
      '',
      '## Top Exception Clusters',
      ...(reportBundle.clusters.length
        ? reportBundle.clusters.slice(0, 12).map((item) => `- x${item.count} ${item.sampleTitle}`)
        : ['- n/a'])
    ].join('\n');

    downloadText(`dubhe-workbench-report-${Date.now()}.md`, md, 'text/markdown;charset=utf-8');
  }, [reportBundle]);

  const exportHtml = useCallback(() => {
    const json = escapeHtml(JSON.stringify(reportBundle, null, 2));
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Dubhe Workbench Report</title>
  <style>
    body{font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; margin:0; padding:24px; background:#f6f1e9; color:#2b1d0f}
    h1{margin:0 0 12px}
    .card{border:1px solid #d9c6a6; border-radius:12px; background:#fffdf8; padding:14px}
    pre{white-space:pre-wrap; word-break:break-word; margin:0; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; line-height:1.45}
  </style>
</head>
<body>
  <h1>Dubhe Workbench Report</h1>
  <div class="card">
    <pre>${json}</pre>
  </div>
</body>
</html>`;

    downloadText(`dubhe-workbench-report-${Date.now()}.html`, html, 'text/html;charset=utf-8');
  }, [reportBundle]);

  const commandActions = useMemo<CommandAction[]>(() => {
    return [
      {
        id: 'refresh',
        label: 'Refresh Snapshot',
        hint: 'Reload latest artifacts from /api/debug/payload',
        keywords: 'refresh reload sync',
        run: () => {
          void refreshSnapshot();
        }
      },
      {
        id: 'sync-pull',
        label: 'Pull Shared Notes',
        hint: 'Fetch latest workbench annotations from server',
        keywords: 'annotations pull sync shared notes',
        run: () => {
          void pullAnnotations();
        }
      },
      {
        id: 'sync-push',
        label: 'Push Shared Notes',
        hint: 'Upload local annotations to shared store',
        keywords: 'annotations push sync shared notes',
        run: () => {
          void pushAnnotations();
        }
      },
      {
        id: 'toggle-play',
        label: isPlaying ? 'Pause Playback' : 'Play Playback',
        hint: 'Toggle step autoplay',
        keywords: 'play pause playback',
        run: togglePlay
      },
      {
        id: 'next',
        label: 'Next Step',
        hint: 'Move to next timeline row',
        keywords: 'next step',
        run: goNext
      },
      {
        id: 'prev',
        label: 'Previous Step',
        hint: 'Move to previous timeline row',
        keywords: 'previous prev step',
        run: goPrev
      },
      {
        id: 'next-break',
        label: 'Jump To Next Breakpoint',
        hint: 'Use conditional breakpoint match + hit count',
        keywords: 'breakpoint jump',
        run: goNextBreakpoint
      },
      {
        id: 'copy-link',
        label: 'Copy Share Link',
        hint: 'Copy current URL with debug state',
        keywords: 'copy link share',
        run: () => {
          void copyShareLink();
        }
      },
      {
        id: 'copy-issue',
        label: 'Copy Issue Draft',
        hint: 'Draft report from selected step',
        keywords: 'issue report copy',
        run: () => {
          void copyIssueDraft();
        }
      },
      {
        id: 'collect',
        label: 'Run Debug Collect',
        hint: 'Trigger contracts debug:collect:once',
        keywords: 'collect debug artifacts',
        run: runCollect
      },
      {
        id: 'compare',
        label: 'Compare Selected Traces',
        hint: 'Run A/B diff on trace instructions',
        keywords: 'compare trace diff',
        run: () => {
          void runCompare();
        }
      },
      {
        id: 'bookmark',
        label: selectedStep
          ? selectedAnnotation?.starred
            ? 'Unstar Selected Step'
            : 'Star Selected Step'
          : 'Star Selected Step',
        hint: 'Toggle bookmark state for focused step',
        keywords: 'bookmark star annotation',
        run: () => {
          if (!selectedStep) return;
          updateAnnotation(selectedStep.id, { starred: !selectedAnnotation?.starred });
        }
      },
      {
        id: 'export-json',
        label: 'Export Report JSON',
        hint: 'Download structured debug report bundle',
        keywords: 'export json report',
        run: exportJson
      },
      {
        id: 'export-md',
        label: 'Export Report Markdown',
        hint: 'Download markdown summary report',
        keywords: 'export markdown report',
        run: exportMarkdown
      },
      {
        id: 'export-html',
        label: 'Export Report HTML',
        hint: 'Download standalone HTML report',
        keywords: 'export html report',
        run: exportHtml
      }
    ];
  }, [
    copyIssueDraft,
    copyShareLink,
    exportHtml,
    exportJson,
    exportMarkdown,
    goNext,
    goNextBreakpoint,
    goPrev,
    isPlaying,
    pullAnnotations,
    pushAnnotations,
    refreshSnapshot,
    runCollect,
    runCompare,
    selectedAnnotation?.starred,
    selectedStep,
    togglePlay,
    updateAnnotation
  ]);

  const paletteActions = useMemo(() => {
    const keyword = paletteQuery.trim().toLowerCase();
    if (!keyword) return commandActions;
    return commandActions.filter((action) => {
      const haystack = `${action.label} ${action.hint} ${action.keywords}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [commandActions, paletteQuery]);

  const executePaletteAction = useCallback((action: CommandAction) => {
    action.run();
    setPaletteOpen(false);
    setPaletteQuery('');
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    paletteInputRef.current?.focus();
  }, [paletteOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }

      if (paletteOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setPaletteOpen(false);
          setPaletteQuery('');
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          const top = paletteActions[0];
          if (top) {
            executePaletteAction(top);
          }
        }
        return;
      }

      if (event.key === '/') {
        if (isEditingTarget(event.target)) return;
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (isEditingTarget(event.target)) return;

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === 'b') {
        event.preventDefault();
        goNextBreakpoint();
        return;
      }
      if (event.key === 'r') {
        event.preventDefault();
        void refreshSnapshot();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    executePaletteAction,
    goNext,
    goNextBreakpoint,
    goPrev,
    paletteActions,
    paletteOpen,
    refreshSnapshot,
    togglePlay
  ]);

  const watchedVariableSet = useMemo(() => new Set(watchTokens), [watchTokens]);

  return (
    <main className="wb-root">
      <header className="wb-header panel">
        <div>
          <p className="eyebrow">Local Debug Console</p>
          <h1>Dubhe Workbench v0.5</h1>
          <p className="muted">
            Realtime flow over `.reports/move` + advanced trace/gas triage. Revision:{' '}
            <code>{snapshot?.revision ?? 'n/a'}</code>
          </p>
        </div>

        <div className="header-actions">
          <span className={`status-dot ${streamState}`} title={`stream: ${streamState}`} />
          <span className="muted">{streamState}</span>
          <button className="btn" onClick={copyShareLink}>
            Copy Link
          </button>
          <button className="btn" onClick={runCollect} disabled={runBusy}>
            {runBusy && runLabel === 'Collect Debug Artifacts' ? 'Collecting...' : 'Collect'}
          </button>
          <button className="btn" onClick={() => setPaletteOpen(true)}>
            Command Palette
          </button>
          <button className="btn" onClick={() => void refreshSnapshot()} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="panel guide-panel">
        <div className="guide-head">
          <h2>新手引导 / Quick Guide</h2>
          <p className="muted">按 1 → 6 使用，覆盖采集、对比、断点、复现、导出全流程。</p>
        </div>

        <div className="guide-grid">
          <article className="guide-card">
            <h3>1. 先产出调试数据</h3>
            <p>
              在案例根目录执行 <code>pnpm run debug:collect</code> 或点页面 <code>Collect</code>。
            </p>
          </article>

          <article className="guide-card">
            <h3>2. Timeline 缩小范围</h3>
            <p>
              先按 <code>category</code> / <code>severity</code>{' '}
              过滤，再搜索函数、指令或命令关键字。
            </p>
          </article>

          <article className="guide-card">
            <h3>3. 条件断点定位</h3>
            <p>
              支持模块/函数/指令、表达式断点、watch 变量、命中次数控制，配合 <code>Next Break</code>
              。
            </p>
          </article>

          <article className="guide-card">
            <h3>4. A/B Trace 对比</h3>
            <p>
              在 <code>Trace A/B Compare</code> 选择两个 trace，比较指令和函数级差异，定位回归点。
            </p>
          </article>

          <article className="guide-card">
            <h3>5. 一键复现与书签注释</h3>
            <p>直接执行 replay/debug-open；对 step 打星和备注，生成可共享调试包。</p>
          </article>

          <article className="guide-card">
            <h3>6. 导出报告</h3>
            <p>
              一键导出 <code>JSON/Markdown/HTML</code>，附带筛选、断点、对比和注释上下文。
            </p>
          </article>
        </div>
      </section>

      {(snapshot?.issues.length ?? 0) > 0 && (
        <section className="panel issues">
          <h2>Data Issues</h2>
          <ul>
            {snapshot?.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <section className="panel error-banner">
          <strong>Failed to load snapshot</strong>
          <p>{error}</p>
        </section>
      )}

      <section className="panel metrics-grid">
        <article className="metric-card">
          <p className="k">Total Steps</p>
          <p className="v">{snapshot?.summary.totalSteps ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="k">Errors</p>
          <p className="v">{snapshot?.summary.errorSteps ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="k">Warnings</p>
          <p className="v">{snapshot?.summary.warnSteps ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="k">Trace Files</p>
          <p className="v">{snapshot?.traceFiles.length ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="k">Instr Steps</p>
          <p className="v">{snapshot?.artifactStats.traceRuntime.instructionSteps ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="k">Bookmarks</p>
          <p className="v">{bookmarkedSteps.length}</p>
        </article>
      </section>

      <section className="workbench-grid">
        <aside className="panel timeline-pane">
          <div className="pane-head">
            <h2>Timeline</h2>
            <span className="muted">
              {visibleTimelineSteps.length}/{filteredSteps.length} rows
            </span>
          </div>

          <div className="filters">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search title, detail, command (/)"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as '' | StepCategory)}
            >
              <option value="">all categories</option>
              <option value="debug">debug</option>
              <option value="gas">gas</option>
              <option value="trace">trace</option>
              <option value="fork">fork</option>
              <option value="replay">replay</option>
            </select>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as '' | StepSeverity)}
            >
              <option value="">all severities</option>
              <option value="error">error</option>
              <option value="warn">warn</option>
              <option value="info">info</option>
            </select>
          </div>

          <div className="timeline-list">
            {isLoading && !snapshot ? (
              <div className="muted">Loading...</div>
            ) : filteredSteps.length === 0 ? (
              <div className="muted">No rows match current filters.</div>
            ) : (
              <>
                {visibleTimelineSteps.map((step) => (
                  <button
                    key={step.id}
                    className={`timeline-item ${selectedStepId === step.id ? 'active' : ''}`}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <div className="row-top">
                      <span className={`badge ${severityClass(step.severity)}`}>
                        {step.severity}
                      </span>
                      <span className="muted mono">{step.category}</span>
                      <span className="muted mono">#{step.index + 1}</span>
                    </div>
                    <div className="row-title">{step.title}</div>
                    <div className="row-time muted">{formatDate(step.timestamp)}</div>
                  </button>
                ))}

                {hiddenTimelineCount > 0 && (
                  <button className="btn timeline-load-more" onClick={loadMoreTimeline}>
                    Load more ({hiddenTimelineCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </aside>

        <section className="panel detail-pane">
          <div className="pane-head">
            <h2>Step Inspector</h2>
            <div className="step-controls">
              <button className="btn" onClick={goPrev} disabled={selectedStepIndex <= 0}>
                Prev
              </button>
              <button className="btn" onClick={togglePlay} disabled={filteredSteps.length === 0}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                className="btn"
                onClick={goNext}
                disabled={
                  selectedStepIndex < 0 ||
                  selectedStepIndex >= Math.max(0, filteredSteps.length - 1)
                }
              >
                Next
              </button>
              <button className="btn" onClick={goNextBreakpoint}>
                Next Break
              </button>
              <label className="speed-control">
                speed
                <select
                  value={String(playbackMs)}
                  onChange={(event) => setPlaybackMs(parsePlaybackSpeed(event.target.value))}
                >
                  {PLAYBACK_SPEED_OPTIONS.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}ms
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="jump-bar">
            <input
              type="range"
              min={filteredSteps.length > 0 ? 1 : 0}
              max={Math.max(1, filteredSteps.length)}
              value={selectedStepIndex >= 0 ? selectedStepIndex + 1 : 0}
              disabled={filteredSteps.length === 0}
              onChange={(event) => {
                if (filteredSteps.length === 0) return;
                const idx = Math.min(
                  filteredSteps.length - 1,
                  Math.max(0, Number(event.target.value) - 1)
                );
                const target = filteredSteps[idx];
                if (target) {
                  setSelectedStepId(target.id);
                }
              }}
            />
            <span className="muted mono">
              {selectedStepIndex >= 0 ? selectedStepIndex + 1 : 0}/{filteredSteps.length}
            </span>
          </div>

          <div className="breakpoint-grid">
            <label>
              <input
                type="checkbox"
                checked={breakpointEnabled}
                onChange={(event) => setBreakpointEnabled(event.target.checked)}
              />{' '}
              Enable Breakpoints
            </label>
            <input
              placeholder="module contains..."
              value={breakpointModule}
              onChange={(event) => setBreakpointModule(event.target.value)}
            />
            <input
              placeholder="function contains..."
              value={breakpointFunction}
              onChange={(event) => setBreakpointFunction(event.target.value)}
            />
            <input
              placeholder="instruction contains..."
              value={breakpointInstruction}
              onChange={(event) => setBreakpointInstruction(event.target.value)}
            />
            <input
              placeholder="expression e.g. severity === 'error' || module.includes('counter')"
              value={breakpointExpression}
              onChange={(event) => setBreakpointExpression(event.target.value)}
            />
            <input
              placeholder="watch vars (comma separated): value, counter"
              value={breakpointWatchVariables}
              onChange={(event) => setBreakpointWatchVariables(event.target.value)}
            />
            <label className="hit-count-row">
              hit every
              <input
                type="number"
                min={1}
                step={1}
                value={Math.max(1, Math.floor(breakpointHitEvery))}
                onChange={(event) =>
                  setBreakpointHitEvery(Math.max(1, Number(event.target.value) || 1))
                }
              />
              match(es)
            </label>
            <p className="muted">breakpoint matches: {breakpointMatches.length}</p>
            {breakpointExpressionError && (
              <p className="warn-text mono">expression error: {breakpointExpressionError}</p>
            )}
          </div>

          {!selectedStep ? (
            <p className="muted">No step selected.</p>
          ) : (
            <article className="step-view">
              <div className="step-header">
                <span className={`badge ${severityClass(selectedStep.severity)}`}>
                  {selectedStep.severity}
                </span>
                <span className="mono">{selectedStep.category}</span>
                <span className="mono">#{selectedStep.index + 1}</span>
                <button
                  className="btn"
                  onClick={() =>
                    updateAnnotation(selectedStep.id, {
                      starred: !selectedAnnotation?.starred
                    })
                  }
                >
                  {selectedAnnotation?.starred ? 'Unstar' : 'Star'}
                </button>
              </div>

              <h3>{selectedStep.title}</h3>
              {selectedStep.detail && <p>{selectedStep.detail}</p>}

              <div className="kv-grid">
                <div>
                  <span className="k">Timestamp</span>
                  <span className="v">{formatDate(selectedStep.timestamp)}</span>
                </div>
                <div>
                  <span className="k">Source</span>
                  <span className="v mono">
                    {selectedStep.sourceFile
                      ? `${selectedStep.sourceFile}${
                          selectedStep.sourceLine ? `:${selectedStep.sourceLine}` : ''
                        }`
                      : 'n/a'}
                  </span>
                </div>
                <div>
                  <span className="k">Tags</span>
                  <span className="v">{selectedStep.tags.join(', ') || 'n/a'}</span>
                </div>
              </div>

              {selectedStep.command && (
                <div className="command-box">
                  <code>{selectedStep.command}</code>
                  <div className="inline-actions">
                    <button
                      className="btn"
                      onClick={() => void copyText(selectedStep.command ?? '')}
                    >
                      Copy
                    </button>
                    {selectedStep.command.startsWith('dubhe ') && (
                      <button className="btn" onClick={() => runReplay(selectedStep.command || '')}>
                        Run Replay
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedStep.callStack && selectedStep.callStack.length > 0 && (
                <div className="metadata-table">
                  <h4>Call Stack</h4>
                  <table>
                    <tbody>
                      {selectedStep.callStack.map((frame, idx) => (
                        <tr key={`${frame.frameId}-${idx}`}>
                          <td className="mono">#{frame.frameId}</td>
                          <td className="mono">{frame.module}</td>
                          <td className="mono">{frame.functionName}</td>
                          <td className="mono">
                            {frame.sourceFile
                              ? `${frame.sourceFile}${
                                  frame.sourceLine ? `:${frame.sourceLine}` : ''
                                }`
                              : 'n/a'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStep.variables && selectedStep.variables.length > 0 && (
                <div className="metadata-table">
                  <h4>Variables / Effects</h4>
                  <table>
                    <tbody>
                      {selectedStep.variables.map((item, idx) => {
                        const watched = Array.from(watchedVariableSet).some((token) =>
                          item.name.toLowerCase().includes(token)
                        );
                        return (
                          <tr key={`${item.name}-${idx}`} className={watched ? 'watched-row' : ''}>
                            <td className="mono">{item.kind || 'var'}</td>
                            <td className="mono">{item.name}</td>
                            <td className="mono">{item.value}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStep.state && (
                <div className="metadata-table">
                  <h4>State Diff</h4>
                  <table>
                    <tbody>
                      {Object.keys(selectedStep.state.after).map((key) => (
                        <tr key={key}>
                          <td className="mono">{key}</td>
                          <td>{selectedStep.state?.before[key] ?? 0}</td>
                          <td>{selectedStep.state?.after[key] ?? 0}</td>
                          <td>{selectedStep.state?.diff[key] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStep.metadata && Object.keys(selectedStep.metadata).length > 0 && (
                <div className="metadata-table">
                  <h4>Metadata</h4>
                  <table>
                    <tbody>
                      {Object.entries(selectedStep.metadata).map(([key, value]) => (
                        <tr key={key}>
                          <td className="mono">{key}</td>
                          <td>{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStep.snippet && selectedStep.snippet.lines.length > 0 && (
                <div className="snippet-box">
                  <h4>
                    {selectedStep.snippet.label} ({selectedStep.snippet.startLine}-
                    {selectedStep.snippet.endLine})
                  </h4>
                  <pre>
                    {selectedStep.snippet.lines.map((line) => (
                      <div key={`${selectedStep.id}-${line.line}`}>
                        <span className="mono ln">{String(line.line).padStart(4, ' ')}</span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              )}

              <div className="annotation-box">
                <h4>Annotation</h4>
                <div className={`annotation-sync ${syncState}`}>
                  <p className="tight">
                    <strong>Shared Sync</strong> · state=<code>{syncState}</code> · rev=
                    <code>{serverRevision ?? 'n/a'}</code>
                  </p>
                  <div className="inline-actions">
                    <button
                      className="btn"
                      onClick={() => void pullAnnotations()}
                      disabled={syncState === 'pulling' || syncState === 'pushing'}
                    >
                      Pull
                    </button>
                    <button
                      className="btn"
                      onClick={() => void pushAnnotations()}
                      disabled={
                        syncState === 'pulling' ||
                        syncState === 'pushing' ||
                        serverRevision === null
                      }
                    >
                      Push
                    </button>
                  </div>
                  {syncError && <p className="warn-text tight">{syncError}</p>}
                  {lastSyncedAt && (
                    <p className="muted tight">last synced: {formatDate(lastSyncedAt)}</p>
                  )}
                </div>
                <textarea
                  value={selectedAnnotation?.note ?? ''}
                  onChange={(event) =>
                    updateAnnotation(selectedStep.id, {
                      note: event.target.value
                    })
                  }
                  placeholder="write debugging notes, findings, follow-ups..."
                />
                <div className="inline-actions">
                  <button className="btn" onClick={copyIssueDraft}>
                    Copy Issue Draft
                  </button>
                  <button className="btn" onClick={copyShareBundle}>
                    Copy Share Bundle
                  </button>
                </div>
              </div>
            </article>
          )}
        </section>

        <aside className="panel side-pane">
          <div className="pane-head">
            <h2>Realtime Artifacts</h2>
          </div>

          <section className="artifact-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="btn" onClick={copyShareLink}>
                Copy Share Link
              </button>
              <button className="btn" onClick={copyIssueDraft} disabled={!selectedStep}>
                Copy Issue Draft
              </button>
              <button className="btn" onClick={runCollect} disabled={runBusy}>
                Run Collect
              </button>
              <button
                className="btn"
                onClick={() => void pullAnnotations()}
                disabled={syncState === 'pulling' || syncState === 'pushing'}
              >
                Pull Notes
              </button>
              <button
                className="btn"
                onClick={() => void pushAnnotations()}
                disabled={
                  syncState === 'pulling' || syncState === 'pushing' || serverRevision === null
                }
              >
                Push Notes
              </button>
              <button className="btn" onClick={() => setPaletteOpen(true)}>
                Open Palette
              </button>
            </div>
            <p className="muted tight">
              shortcuts: <code>Ctrl/Cmd+K</code> palette, <code>/</code> search, <code>j/k</code>{' '}
              nav, <code>space</code> play/pause, <code>b</code> next break, <code>r</code> refresh
            </p>

            {runResult && (
              <div className={`run-result ${runResult.ok ? 'ok' : 'err'}`}>
                <p className="tight">
                  <strong>{runLabel || 'Last command'}</strong> ·{' '}
                  {runResult.ok ? 'success' : 'failed'}
                  {typeof runResult.exitCode === 'number' ? ` · exit ${runResult.exitCode}` : ''}
                  {typeof runResult.durationMs === 'number'
                    ? ` · ${(runResult.durationMs / 1000).toFixed(2)}s`
                    : ''}
                </p>
                {runResult.command && <p className="mono tight">{runResult.command}</p>}
                {runResult.error && <p className="mono tight">{runResult.error}</p>}
                {(runResult.stderr || runResult.stdout) && (
                  <details>
                    <summary>Command Output</summary>
                    <pre>{runResult.stderr || runResult.stdout}</pre>
                  </details>
                )}
              </div>
            )}
          </section>

          <section className="artifact-card">
            <h3>Trace Runtime</h3>
            <ul>
              <li>
                <code>parsedLines</code>: {snapshot?.artifactStats.traceRuntime.parsedLines ?? 0}
              </li>
              <li>
                <code>instructionSteps</code>:{' '}
                {snapshot?.artifactStats.traceRuntime.instructionSteps ?? 0}
              </li>
              <li>
                <code>effects</code>: {snapshot?.artifactStats.traceRuntime.effects ?? 0}
              </li>
              <li>
                <code>frames</code>: {snapshot?.artifactStats.traceRuntime.openFrames ?? 0}/
                {snapshot?.artifactStats.traceRuntime.closeFrames ?? 0}
              </li>
              <li>
                <code>truncated</code>:{' '}
                {snapshot?.artifactStats.traceRuntime.truncated ? 'true' : 'false'}
              </li>
            </ul>
          </section>

          <section className="artifact-card">
            <h3>Availability</h3>
            <ul>
              {snapshot &&
                Object.entries(snapshot.artifactStats.availability).map(([name, ok]) => (
                  <li key={name}>
                    <span className={`mini-dot ${ok ? 'ok' : 'missing'}`} />
                    <code>{name}</code>
                  </li>
                ))}
            </ul>
          </section>

          <section className="artifact-card">
            <h3>Replay Commands</h3>
            {!snapshot || snapshot.replayCommands.length === 0 ? (
              <p className="muted">No replay command found.</p>
            ) : (
              snapshot.replayCommands.map((command) => (
                <div key={command} className="command-box compact">
                  <code>{command}</code>
                  <div className="inline-actions">
                    <button className="btn" onClick={() => void copyText(command)}>
                      Copy
                    </button>
                    <button className="btn" onClick={() => runReplay(command)} disabled={runBusy}>
                      Run
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="artifact-card">
            <h3>Trace Files</h3>
            {!snapshot || snapshot.traceFiles.length === 0 ? (
              <p className="muted">No trace file found.</p>
            ) : (
              <div className="trace-list">
                {snapshot.traceFiles.slice(0, 60).map((trace) => (
                  <div className="trace-item" key={trace.path}>
                    <p className="mono tight">{trace.relativePath}</p>
                    <p className="muted tight">
                      {formatBytes(trace.size)} | {formatDate(trace.updatedAt)}
                    </p>
                    <div className="inline-actions">
                      <button
                        className="btn"
                        onClick={() => void copyText(`dubhe debug-open --trace-file ${trace.path}`)}
                      >
                        Copy Open Cmd
                      </button>
                      <button
                        className="btn"
                        onClick={() => runDebugOpen(trace.path)}
                        disabled={runBusy}
                      >
                        Run Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="insight-grid">
        <article className="panel insight-card">
          <div className="pane-head">
            <h2>Trace A/B Compare</h2>
            <div className="inline-actions">
              <button
                className="btn"
                onClick={compareLatestTwo}
                disabled={(snapshot?.traceFiles.length ?? 0) < 2}
              >
                Latest 2
              </button>
              <button
                className="btn"
                onClick={swapCompare}
                disabled={!compareLeft || !compareRight}
              >
                Swap
              </button>
              <button className="btn" onClick={() => void runCompare()} disabled={isComparing}>
                {isComparing ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          </div>

          <div className="compare-grid">
            <label>
              Trace A
              <select value={compareLeft} onChange={(event) => setCompareLeft(event.target.value)}>
                <option value="">select trace A</option>
                {(snapshot?.traceFiles ?? []).map((item) => (
                  <option key={`left-${item.path}`} value={item.path}>
                    {item.relativePath}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trace B
              <select
                value={compareRight}
                onChange={(event) => setCompareRight(event.target.value)}
              >
                <option value="">select trace B</option>
                {(snapshot?.traceFiles ?? []).map((item) => (
                  <option key={`right-${item.path}`} value={item.path}>
                    {item.relativePath}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {compareError && <p className="warn-text">{compareError}</p>}

          {compareData && (
            <div className="compare-results">
              <div className="chip-list">
                <span className="chip">
                  Δ instructions: {formatDelta(compareData.summary.instructionDelta)}
                </span>
                <span className="chip">
                  Δ effects: {formatDelta(compareData.summary.effectDelta)}
                </span>
                <span className="chip">Δ lines: {formatDelta(compareData.summary.lineDelta)}</span>
                <span className="chip">shared: {compareData.summary.sharedInstructionKeys}</span>
                <span className="chip">
                  left-only: {compareData.summary.onlyLeftInstructionKeys}
                </span>
                <span className="chip">
                  right-only: {compareData.summary.onlyRightInstructionKeys}
                </span>
              </div>

              <div className="compare-tables">
                <div>
                  <h4>Top Instruction Diffs</h4>
                  <table>
                    <tbody>
                      {compareData.topInstructionDiffs.slice(0, 12).map((row) => (
                        <tr key={`op-${row.key}`}>
                          <td className="mono">{row.key}</td>
                          <td>{row.left}</td>
                          <td>{row.right}</td>
                          <td>{formatDelta(row.delta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4>Top Function Diffs</h4>
                  <table>
                    <tbody>
                      {compareData.topFunctionDiffs.slice(0, 12).map((row) => (
                        <tr key={`fn-${row.key}`}>
                          <td className="mono">{row.key}</td>
                          <td>{row.left}</td>
                          <td>{row.right}</td>
                          <td>{formatDelta(row.delta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="panel insight-card">
          <div className="pane-head">
            <h2>Gas Heatmap & Ranking</h2>
          </div>

          <div className="heatmap-list">
            {gasHeatRows.length === 0 ? (
              <p className="muted">No gas hotspot rows found.</p>
            ) : (
              gasHeatRows.slice(0, 18).map((row, idx) => {
                const maxGas = gasHeatRows[0]?.maxGas || 1;
                const width = Math.max(6, Math.round((row.maxGas / maxGas) * 100));
                return (
                  <button
                    key={`${row.sourceFile}:${row.sourceLine}`}
                    className="heatmap-row"
                    onClick={() => setSelectedStepId(row.stepId)}
                  >
                    <div className="heatmap-bar" style={{ width: `${width}%` }} />
                    <div className="heatmap-main">
                      <span className="mono">
                        {idx + 1}. {row.sourceFile}:{row.sourceLine}
                      </span>
                      <span className="mono">
                        max={Math.round(row.maxGas).toLocaleString('en-US')}
                      </span>
                      <span className="muted">hits={row.hits}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <h4>Regression Ranking</h4>
          <table>
            <tbody>
              {gasRegressionRows.slice(0, 12).map((item) => (
                <tr key={item.id}>
                  <td className="mono">{item.title}</td>
                  <td className={item.deltaPct >= 0 ? 'mono down' : 'mono up'}>
                    {item.deltaPct.toFixed(2)}%
                  </td>
                  <td className="mono">{Math.round(item.deltaGas).toLocaleString('en-US')}</td>
                  <td>
                    <button className="btn" onClick={() => setSelectedStepId(item.id)}>
                      Jump
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel insight-card">
          <div className="pane-head">
            <h2>Exception Clusters</h2>
          </div>

          {exceptionClusters.length === 0 ? (
            <p className="muted">No warning/error clusters found.</p>
          ) : (
            <div className="cluster-list">
              {exceptionClusters.slice(0, 30).map((cluster) => (
                <button
                  key={cluster.key}
                  className="cluster-item"
                  onClick={() => {
                    setSelectedStepId(cluster.sampleStepId);
                    setSeverity(cluster.severity);
                  }}
                >
                  <div className="row-top">
                    <span className={`badge ${severityClass(cluster.severity)}`}>
                      {cluster.severity}
                    </span>
                    <span className="muted mono">{cluster.category}</span>
                    <span className="muted mono">x{cluster.count}</span>
                  </div>
                  <p className="tight mono">{cluster.topFrame}</p>
                  <p className="tight">{cluster.sampleTitle}</p>
                  {cluster.sampleDetail && <p className="muted tight">{cluster.sampleDetail}</p>}
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="panel insight-card">
          <div className="pane-head">
            <h2>Bookmarks & Notes</h2>
            <span className="muted">{bookmarkedSteps.length}</span>
          </div>

          {bookmarkedSteps.length === 0 ? (
            <p className="muted">
              No bookmarks yet. Star a step and add annotation in Step Inspector.
            </p>
          ) : (
            <div className="bookmark-list">
              {bookmarkedSteps.map(({ step, annotation }) => (
                <button
                  key={step.id}
                  className="bookmark-item"
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <div className="row-top">
                    <span className={`badge ${severityClass(step.severity)}`}>{step.severity}</span>
                    <span className="muted mono">{annotation.starred ? '★' : '·'}</span>
                    <span className="muted mono">{formatDate(annotation.updatedAt)}</span>
                  </div>
                  <p className="tight">{step.title}</p>
                  <p className="muted tight">{annotation.note || 'no note'}</p>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="panel insight-card">
          <div className="pane-head">
            <h2>Export Reports</h2>
          </div>
          <div className="inline-actions">
            <button className="btn" onClick={exportJson}>
              Export JSON
            </button>
            <button className="btn" onClick={exportMarkdown}>
              Export MD
            </button>
            <button className="btn" onClick={exportHtml}>
              Export HTML
            </button>
            <button className="btn" onClick={copyShareBundle}>
              Copy Bundle
            </button>
          </div>
          <p className="muted">
            导出包含：当前过滤器、断点设置、选中 step、书签注释、异常聚类、trace 对比结果。
          </p>
        </article>
      </section>

      {paletteOpen && (
        <div className="palette-overlay" onClick={() => setPaletteOpen(false)}>
          <div className="palette-card" onClick={(event) => event.stopPropagation()}>
            <input
              ref={paletteInputRef}
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              placeholder="Type a command (Enter to run first result)"
            />
            <div className="palette-list">
              {paletteActions.length === 0 ? (
                <p className="muted">No command matched.</p>
              ) : (
                paletteActions.map((action) => (
                  <button
                    key={action.id}
                    className="palette-item"
                    onClick={() => executePaletteAction(action)}
                  >
                    <p>{action.label}</p>
                    <p className="muted tight">{action.hint}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
