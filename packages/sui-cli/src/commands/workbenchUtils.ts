import fs from 'fs';
import path from 'path';

export type WorkbenchSeverity = 'info' | 'warn' | 'error';
export type WorkbenchCategory = 'debug' | 'gas' | 'trace' | 'fork' | 'replay';

export type WorkbenchEvent = {
  id: string;
  category: WorkbenchCategory;
  severity: WorkbenchSeverity;
  title: string;
  detail?: string;
  timestamp?: string;
  sourceFile?: string;
  sourceLine?: number;
  command?: string;
  tags: string[];
};

export type WorkbenchSummary = {
  generatedAt: string;
  totalEvents: number;
  errorEvents: number;
  warnEvents: number;
  infoEvents: number;
  categories: Record<WorkbenchCategory, number>;
};

export type WorkbenchArtifacts = {
  debugSession?: any;
  gasSourceMap?: any;
  gasRegression?: any;
  traceCallGraph?: any;
  traceConsistency?: any;
  forkReplay?: any;
  debugReplayScript?: string;
  traceReplayScript?: string;
};

export type WorkbenchPayload = {
  title: string;
  generatedAt: string;
  summary: WorkbenchSummary;
  events: WorkbenchEvent[];
  replayCommands: string[];
  artifacts: {
    debugSession?: any;
    gasSourceMap?: any;
    gasRegression?: any;
    traceCallGraph?: any;
    traceConsistency?: any;
    forkReplay?: any;
  };
};

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeJsonForHtml(raw: string): string {
  return raw.replaceAll('</script>', '<\\/script>');
}

function normalizeIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function readOptionalJsonFile(filePath: string): unknown | undefined {
  if (!filePath || !fs.existsSync(filePath)) return undefined;
  return readJsonFile(filePath);
}

export function parseReplayScriptCommands(scriptContent: string): string[] {
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

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildDebugEvents(debugSession: any): WorkbenchEvent[] {
  if (!debugSession || typeof debugSession !== 'object') return [];
  const events: WorkbenchEvent[] = [];
  const generatedAt = normalizeIso((debugSession as any).generatedAt);
  const failedTests = toArray<string>((debugSession as any).failedTests);
  const hints = toArray<string>((debugSession as any).hints);
  const sourceHints = toArray<any>((debugSession as any).sourceHints);

  for (const testName of failedTests) {
    events.push({
      id: `debug-test-${events.length + 1}`,
      category: 'debug',
      severity: 'error',
      title: `Failing test: ${testName}`,
      detail: (debugSession as any).command,
      timestamp: generatedAt,
      command: (debugSession as any).reproCommand || (debugSession as any).command,
      tags: ['debug', 'failed-test', testName]
    });
  }

  for (const hint of hints) {
    events.push({
      id: `debug-hint-${events.length + 1}`,
      category: 'debug',
      severity: 'warn',
      title: 'Abort/Error hint',
      detail: hint,
      timestamp: generatedAt,
      tags: ['debug', 'hint']
    });
  }

  for (const item of sourceHints) {
    const snippets = toArray<any>(item?.snippets);
    const firstSnippet = snippets[0];
    events.push({
      id: `debug-source-${events.length + 1}`,
      category: 'debug',
      severity: 'warn',
      title: `${item?.modulePath || 'unknown module'} (code=${item?.abortCode ?? 'n/a'})`,
      detail:
        typeof item?.functionName === 'string'
          ? `function=${item.functionName}`
          : 'source hint available',
      timestamp: generatedAt,
      sourceFile: typeof item?.sourceFile === 'string' ? item.sourceFile : undefined,
      sourceLine: typeof firstSnippet?.startLine === 'number' ? firstSnippet.startLine : undefined,
      tags: ['debug', 'source-hint']
    });
  }

  const reproCommand = (debugSession as any).reproCommand;
  if (typeof reproCommand === 'string' && reproCommand.trim().length > 0) {
    events.push({
      id: `debug-repro-${events.length + 1}`,
      category: 'replay',
      severity: 'info',
      title: 'Debug repro command',
      detail: reproCommand,
      timestamp: generatedAt,
      command: reproCommand,
      tags: ['replay', 'debug']
    });
  }
  return events;
}

function buildGasEvents(gasSourceMap: any, gasRegression: any): WorkbenchEvent[] {
  const events: WorkbenchEvent[] = [];
  const sourceRows = toArray<any>(gasSourceMap?.rows);
  const sourceGeneratedAt = normalizeIso(gasSourceMap?.generatedAt);
  for (const row of sourceRows.slice(0, 80)) {
    const gas = typeof row?.gas === 'number' ? row.gas : Number(row?.gas || 0);
    events.push({
      id: `gas-source-${events.length + 1}`,
      category: 'gas',
      severity: gas > 1_000_000 ? 'warn' : 'info',
      title: `Gas hotspot: ${row?.name || 'unknown test'}`,
      detail: `gas=${Number.isFinite(gas) ? gas.toLocaleString('en-US') : 'n/a'}`,
      timestamp: sourceGeneratedAt,
      sourceFile: typeof row?.sourceFile === 'string' ? row.sourceFile : undefined,
      sourceLine: typeof row?.line === 'number' ? row.line : undefined,
      tags: ['gas', 'source-map']
    });
  }

  const baselineComparison = gasRegression?.baselineComparison;
  const generatedAt = normalizeIso(gasRegression?.generatedAt);
  const regressions = toArray<any>(baselineComparison?.regressions);
  const improvements = toArray<any>(baselineComparison?.improvements);

  for (const row of regressions) {
    const pct = typeof row?.deltaPct === 'number' ? row.deltaPct : Number(row?.deltaPct || 0);
    events.push({
      id: `gas-regression-${events.length + 1}`,
      category: 'gas',
      severity: 'error',
      title: `Gas regression: ${row?.name || 'unknown test'}`,
      detail: `deltaPct=${pct.toFixed(2)}%, deltaGas=${row?.deltaGas ?? 'n/a'}`,
      timestamp: generatedAt,
      tags: ['gas', 'regression']
    });
  }

  for (const row of improvements) {
    const pct = typeof row?.deltaPct === 'number' ? row.deltaPct : Number(row?.deltaPct || 0);
    events.push({
      id: `gas-improvement-${events.length + 1}`,
      category: 'gas',
      severity: 'info',
      title: `Gas improvement: ${row?.name || 'unknown test'}`,
      detail: `deltaPct=${pct.toFixed(2)}%, deltaGas=${row?.deltaGas ?? 'n/a'}`,
      timestamp: generatedAt,
      tags: ['gas', 'improvement']
    });
  }
  return events;
}

function buildReplayEvents(
  report: any,
  category: 'trace' | 'fork',
  labelPrefix: string
): WorkbenchEvent[] {
  if (!report || typeof report !== 'object') return [];
  const events: WorkbenchEvent[] = [];
  const generatedAt = normalizeIso(report.generatedAt);
  const checks = toArray<any>(report.checks);
  for (const item of checks) {
    const ok = !!item?.ok;
    const severity: WorkbenchSeverity = ok ? 'info' : 'error';
    events.push({
      id: `${category}-replay-${events.length + 1}`,
      category,
      severity,
      title: `${labelPrefix}: ${item?.digest || 'unknown digest'}`,
      detail: item?.error
        ? `error=${item.error}`
        : `status=${item?.statusOnChain || 'n/a'}/${item?.statusDryRun || 'n/a'}, gasDeltaPct=${
            typeof item?.gasDeltaPct === 'number' ? item.gasDeltaPct.toFixed(2) : 'n/a'
          }`,
      timestamp: generatedAt,
      tags: [category, 'replay', ok ? 'ok' : 'mismatch']
    });
  }
  return events;
}

function buildTraceGraphEvents(traceCallGraph: any): WorkbenchEvent[] {
  if (!traceCallGraph || typeof traceCallGraph !== 'object') return [];
  const events: WorkbenchEvent[] = [];
  const generatedAt = normalizeIso(traceCallGraph.generatedAt);
  const nodes = toArray<any>(traceCallGraph.nodes);
  for (const node of nodes) {
    if (node?.kind !== 'tx') continue;
    events.push({
      id: `trace-tx-${events.length + 1}`,
      category: 'trace',
      severity: 'info',
      title: `Trace tx: ${node?.digest || 'unknown digest'}`,
      detail: typeof node?.label === 'string' ? node.label : 'transaction trace',
      timestamp: generatedAt,
      tags: ['trace', 'transaction']
    });
  }
  return events;
}

function sortEvents(events: WorkbenchEvent[]): WorkbenchEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
    const bothValid = Number.isFinite(aTime) && Number.isFinite(bTime);
    if (bothValid && aTime !== bTime) return bTime - aTime;
    if (a.severity !== b.severity) {
      const order: Record<WorkbenchSeverity, number> = { error: 0, warn: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }
    return a.id.localeCompare(b.id);
  });
}

function computeSummary(generatedAt: string, events: WorkbenchEvent[]): WorkbenchSummary {
  const categories: Record<WorkbenchCategory, number> = {
    debug: 0,
    gas: 0,
    trace: 0,
    fork: 0,
    replay: 0
  };
  let errorEvents = 0;
  let warnEvents = 0;
  let infoEvents = 0;
  for (const event of events) {
    categories[event.category] += 1;
    if (event.severity === 'error') errorEvents += 1;
    if (event.severity === 'warn') warnEvents += 1;
    if (event.severity === 'info') infoEvents += 1;
  }
  return {
    generatedAt,
    totalEvents: events.length,
    errorEvents,
    warnEvents,
    infoEvents,
    categories
  };
}

export function buildWorkbenchPayload(
  title: string,
  artifacts: WorkbenchArtifacts
): WorkbenchPayload {
  const generatedAt = new Date().toISOString();
  const events = sortEvents([
    ...buildDebugEvents(artifacts.debugSession),
    ...buildGasEvents(artifacts.gasSourceMap, artifacts.gasRegression),
    ...buildTraceGraphEvents(artifacts.traceCallGraph),
    ...buildReplayEvents(artifacts.traceConsistency, 'trace', 'Trace consistency'),
    ...buildReplayEvents(artifacts.forkReplay, 'fork', 'Fork replay')
  ]);
  const replayCommands = [
    ...(typeof artifacts.debugSession?.reproCommand === 'string'
      ? [artifacts.debugSession.reproCommand]
      : []),
    ...(typeof artifacts.debugReplayScript === 'string'
      ? parseReplayScriptCommands(artifacts.debugReplayScript)
      : []),
    ...(typeof artifacts.traceReplayScript === 'string'
      ? parseReplayScriptCommands(artifacts.traceReplayScript)
      : [])
  ];

  return {
    title,
    generatedAt,
    summary: computeSummary(generatedAt, events),
    events,
    replayCommands: Array.from(new Set(replayCommands)),
    artifacts: {
      debugSession: artifacts.debugSession,
      gasSourceMap: artifacts.gasSourceMap,
      gasRegression: artifacts.gasRegression,
      traceCallGraph: artifacts.traceCallGraph,
      traceConsistency: artifacts.traceConsistency,
      forkReplay: artifacts.forkReplay
    }
  };
}

export function renderWorkbenchHtml(payload: WorkbenchPayload): string {
  const embedded = escapeJsonForHtml(JSON.stringify(payload));
  const title = escapeHtml(payload.title);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --bg: #f3f8ff;
        --panel: #ffffff;
        --border: #d9e2ec;
        --text: #102a43;
        --muted: #486581;
        --error: #b42318;
        --warn: #b54708;
        --info: #0b69a3;
      }
      body {
        font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
        margin: 20px;
        color: var(--text);
        background: radial-gradient(circle at 10% 10%, #e4f0ff 0%, var(--bg) 45%, #edf3ff 100%);
      }
      h1, h2, h3 { margin: 0 0 10px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }
      .metric {
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px;
        background: #f8fbff;
      }
      .metric .k {
        font-size: 12px;
        color: var(--muted);
      }
      .metric .v {
        font-size: 22px;
        font-weight: 600;
      }
      .controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
        margin-bottom: 10px;
      }
      input, select {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 13px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th, td {
        border-bottom: 1px solid var(--border);
        padding: 8px;
        text-align: left;
        vertical-align: top;
        font-size: 13px;
      }
      th { background: #ecf4ff; }
      .sev-error { color: var(--error); font-weight: 600; }
      .sev-warn { color: var(--warn); font-weight: 600; }
      .sev-info { color: var(--info); font-weight: 600; }
      .cmd-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      code {
        font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
        font-size: 12px;
      }
      .btn {
        border: 1px solid var(--border);
        background: #f5f9ff;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
      }
      .muted { color: var(--muted); }
      .split {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 1100px) {
        .split {
          grid-template-columns: 1.25fr 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <h1>${title}</h1>
      <div class="muted">Generated at <code id="generatedAt"></code></div>
    </div>

    <div class="panel">
      <h2>Summary</h2>
      <div class="grid" id="summaryGrid"></div>
    </div>

    <div class="split">
      <div class="panel">
        <h2>Timeline</h2>
        <div class="controls">
          <input id="search" placeholder="search title/detail/tags" />
          <select id="category">
            <option value="">all categories</option>
            <option value="debug">debug</option>
            <option value="gas">gas</option>
            <option value="trace">trace</option>
            <option value="fork">fork</option>
            <option value="replay">replay</option>
          </select>
          <select id="severity">
            <option value="">all severities</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Event</th>
              <th>Source</th>
              <th>Command</th>
            </tr>
          </thead>
          <tbody id="timelineRows"></tbody>
        </table>
      </div>

      <div>
        <div class="panel">
          <h2>Replay</h2>
          <div id="replayCommands"></div>
        </div>
        <div class="panel">
          <h2>Trace Graph</h2>
          <div id="traceGraphStats" class="muted"></div>
        </div>
      </div>
    </div>

    <script id="payload" type="application/json">${embedded}</script>
    <script>
      const payload = JSON.parse(document.getElementById('payload').textContent || '{}');
      const events = Array.isArray(payload.events) ? payload.events : [];
      const replayCommands = Array.isArray(payload.replayCommands) ? payload.replayCommands : [];
      const summary = payload.summary || {};
      const artifacts = payload.artifacts || {};

      const summaryGrid = document.getElementById('summaryGrid');
      const generatedAt = document.getElementById('generatedAt');
      const timelineRows = document.getElementById('timelineRows');
      const replayNode = document.getElementById('replayCommands');
      const traceGraphStats = document.getElementById('traceGraphStats');

      generatedAt.textContent = payload.generatedAt || '';

      const summaryItems = [
        ['events', summary.totalEvents || 0],
        ['errors', summary.errorEvents || 0],
        ['warnings', summary.warnEvents || 0],
        ['info', summary.infoEvents || 0],
        ['debug', (summary.categories || {}).debug || 0],
        ['gas', (summary.categories || {}).gas || 0],
        ['trace', (summary.categories || {}).trace || 0],
        ['fork', (summary.categories || {}).fork || 0]
      ];
      summaryGrid.innerHTML = summaryItems.map(([k, v]) => {
        return '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
      }).join('');

      const copyText = async (text) => {
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      };

      if (replayCommands.length === 0) {
        replayNode.innerHTML = '<div class="muted">No replay commands found.</div>';
      } else {
        replayNode.innerHTML = replayCommands.map((cmd, idx) => {
          return '<div class="cmd-row"><button class="btn" data-copy="' + idx + '">Copy</button><code>' + cmd.replaceAll('<','&lt;') + '</code></div>';
        }).join('');
        replayNode.querySelectorAll('[data-copy]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const index = Number(btn.getAttribute('data-copy'));
            const command = replayCommands[index];
            await copyText(command);
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = 'Copy'; }, 900);
          });
        });
      }

      const traceNodes = Array.isArray((artifacts.traceCallGraph || {}).nodes) ? artifacts.traceCallGraph.nodes : [];
      const traceEdges = Array.isArray((artifacts.traceCallGraph || {}).edges) ? artifacts.traceCallGraph.edges : [];
      traceGraphStats.textContent = 'nodes=' + traceNodes.length + ', edges=' + traceEdges.length;

      const render = () => {
        const query = (document.getElementById('search').value || '').toLowerCase();
        const category = document.getElementById('category').value;
        const severity = document.getElementById('severity').value;

        const filtered = events.filter((item) => {
          if (category && item.category !== category) return false;
          if (severity && item.severity !== severity) return false;
          if (!query) return true;
          const haystack = [
            item.title || '',
            item.detail || '',
            Array.isArray(item.tags) ? item.tags.join(' ') : '',
            item.sourceFile || ''
          ].join(' ').toLowerCase();
          return haystack.includes(query);
        });

        if (filtered.length === 0) {
          timelineRows.innerHTML = '<tr><td colspan="6" class="muted">No events match current filter.</td></tr>';
          return;
        }

        timelineRows.innerHTML = filtered.map((item) => {
          const source = item.sourceFile
            ? '<a href="file://' + encodeURI(item.sourceFile) + '" target="_blank"><code>' + item.sourceFile + (item.sourceLine ? ':' + item.sourceLine : '') + '</code></a>'
            : '<span class="muted">n/a</span>';
          const command = item.command
            ? '<button class="btn cmd-copy" data-cmd="' + encodeURIComponent(item.command) + '">Copy</button>'
            : '<span class="muted">n/a</span>';
          return '<tr>' +
            '<td><code>' + (item.timestamp || '') + '</code></td>' +
            '<td>' + item.category + '</td>' +
            '<td class="sev-' + item.severity + '">' + item.severity + '</td>' +
            '<td><div><strong>' + (item.title || '') + '</strong></div><div class="muted">' + (item.detail || '') + '</div></td>' +
            '<td>' + source + '</td>' +
            '<td>' + command + '</td>' +
          '</tr>';
        }).join('');

        timelineRows.querySelectorAll('.cmd-copy').forEach((button) => {
          button.addEventListener('click', async () => {
            const cmd = decodeURIComponent(button.getAttribute('data-cmd') || '');
            await copyText(cmd);
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy'; }, 900);
          });
        });
      };

      document.getElementById('search').addEventListener('input', render);
      document.getElementById('category').addEventListener('change', render);
      document.getElementById('severity').addEventListener('change', render);
      render();
    </script>
  </body>
</html>`;
}

export function writeWorkbenchHtml(outPath: string, html: string): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf-8');
}
