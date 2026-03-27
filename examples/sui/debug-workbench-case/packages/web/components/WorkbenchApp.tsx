'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  StepCategory,
  StepSeverity,
  WorkbenchSnapshot,
  WorkbenchStep
} from '@/lib/debug-data';

type StreamState = 'connecting' | 'live' | 'degraded';

const POLL_INTERVAL_MS = 5000;

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

function severityClass(severity: StepSeverity): string {
  if (severity === 'error') return 'sev-error';
  if (severity === 'warn') return 'sev-warn';
  return 'sev-info';
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function matchesBreakpoint(
  step: WorkbenchStep,
  moduleFilter: string,
  functionFilter: string,
  instructionFilter: string
): boolean {
  const moduleNeedle = moduleFilter.trim().toLowerCase();
  const functionNeedle = functionFilter.trim().toLowerCase();
  const instructionNeedle = instructionFilter.trim().toLowerCase();

  if (!moduleNeedle && !functionNeedle && !instructionNeedle) {
    return false;
  }

  const moduleValue = normalized(step.metadata?.module);
  const functionValue = normalized(step.metadata?.functionName);
  const instructionValue = normalized(step.metadata?.instruction);

  if (moduleNeedle && !moduleValue.includes(moduleNeedle)) return false;
  if (functionNeedle && !functionValue.includes(functionNeedle)) return false;
  if (instructionNeedle && !instructionValue.includes(instructionNeedle)) return false;

  return true;
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
  const [breakpointEnabled, setBreakpointEnabled] = useState(false);
  const [breakpointModule, setBreakpointModule] = useState('');
  const [breakpointFunction, setBreakpointFunction] = useState('');
  const [breakpointInstruction, setBreakpointInstruction] = useState('');

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

  useEffect(() => {
    void refreshSnapshot('initial');
  }, [refreshSnapshot]);

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
        step.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [snapshot, category, severity, search]);

  const breakpointMatches = useMemo(() => {
    return filteredSteps.filter((step) =>
      matchesBreakpoint(step, breakpointModule, breakpointFunction, breakpointInstruction)
    );
  }, [filteredSteps, breakpointModule, breakpointFunction, breakpointInstruction]);

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

  const selectedStep = useMemo(() => {
    if (!selectedStepId) return null;
    return filteredSteps.find((step) => step.id === selectedStepId) ?? null;
  }, [filteredSteps, selectedStepId]);

  const selectedStepIndex = useMemo(() => {
    if (!selectedStep) return -1;
    return filteredSteps.findIndex((step) => step.id === selectedStep.id);
  }, [filteredSteps, selectedStep]);

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
    for (let idx = startIndex; idx < filteredSteps.length; idx += 1) {
      const candidate = filteredSteps[idx];
      if (
        matchesBreakpoint(candidate, breakpointModule, breakpointFunction, breakpointInstruction)
      ) {
        setSelectedStepId(candidate.id);
        return;
      }
    }
  }, [
    breakpointFunction,
    breakpointInstruction,
    breakpointModule,
    filteredSteps,
    selectedStepIndex
  ]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setSelectedStepId((currentId) => {
        const currentIndex = filteredSteps.findIndex((step) => step.id === currentId);
        const normalizedIndex = currentIndex < 0 ? 0 : currentIndex + 1;

        if (breakpointEnabled) {
          for (let idx = normalizedIndex; idx < filteredSteps.length; idx += 1) {
            const step = filteredSteps[idx];
            if (
              matchesBreakpoint(step, breakpointModule, breakpointFunction, breakpointInstruction)
            ) {
              setIsPlaying(false);
              return step.id;
            }
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
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [
    breakpointEnabled,
    breakpointFunction,
    breakpointInstruction,
    breakpointModule,
    filteredSteps,
    isPlaying
  ]);

  return (
    <main className="wb-root">
      <header className="wb-header panel">
        <div>
          <p className="eyebrow">Local Debug Console</p>
          <h1>Dubhe Workbench v4</h1>
          <p className="muted">
            Realtime flow over `.reports/move` + trace instructions. Revision:{' '}
            <code>{snapshot?.revision ?? 'n/a'}</code>
          </p>
        </div>

        <div className="header-actions">
          <span className={`status-dot ${streamState}`} title={`stream: ${streamState}`} />
          <span className="muted">{streamState}</span>
          <button className="btn" onClick={() => void refreshSnapshot()} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

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
          <p className="k">Generated</p>
          <p className="v small">{formatDate(snapshot?.generatedAt)}</p>
        </article>
      </section>

      <section className="workbench-grid">
        <aside className="panel timeline-pane">
          <div className="pane-head">
            <h2>Timeline</h2>
            <span className="muted">{filteredSteps.length} rows</span>
          </div>

          <div className="filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search title, detail, command"
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
              filteredSteps.map((step) => (
                <button
                  key={step.id}
                  className={`timeline-item ${selectedStepId === step.id ? 'active' : ''}`}
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <div className="row-top">
                    <span className={`badge ${severityClass(step.severity)}`}>{step.severity}</span>
                    <span className="muted mono">{step.category}</span>
                    <span className="muted mono">#{step.index + 1}</span>
                  </div>
                  <div className="row-title">{step.title}</div>
                  <div className="row-time muted">{formatDate(step.timestamp)}</div>
                </button>
              ))
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
              <button
                className="btn"
                onClick={() => setIsPlaying((value) => !value)}
                disabled={filteredSteps.length === 0}
              >
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
            </div>
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
            <p className="muted">breakpoint matches: {breakpointMatches.length}</p>
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
                  <button className="btn" onClick={() => void copyText(selectedStep.command ?? '')}>
                    Copy
                  </button>
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
                      {selectedStep.variables.map((item, idx) => (
                        <tr key={`${item.name}-${idx}`}>
                          <td className="mono">{item.kind || 'var'}</td>
                          <td className="mono">{item.name}</td>
                          <td className="mono">{item.value}</td>
                        </tr>
                      ))}
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
            </article>
          )}
        </section>

        <aside className="panel side-pane">
          <div className="pane-head">
            <h2>Realtime Artifacts</h2>
          </div>

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
                  <button className="btn" onClick={() => void copyText(command)}>
                    Copy
                  </button>
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
                {snapshot.traceFiles.slice(0, 40).map((trace) => (
                  <div className="trace-item" key={trace.path}>
                    <p className="mono tight">{trace.relativePath}</p>
                    <p className="muted tight">
                      {formatBytes(trace.size)} | {formatDate(trace.updatedAt)}
                    </p>
                    <button
                      className="btn"
                      onClick={() => void copyText(`dubhe debug-open --trace-file ${trace.path}`)}
                    >
                      Copy Open Command
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
