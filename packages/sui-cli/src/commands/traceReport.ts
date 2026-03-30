import type {
  DryRunTransactionBlockResponse,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';

export type TraceReportEntry = {
  digest: string;
  trace: SuiTransactionBlockResponse;
  dryRun?: DryRunTransactionBlockResponse;
};

export type TraceCallGraphNode = {
  id: string;
  digest: string;
  label: string;
  kind: 'tx' | 'kind' | 'call';
  callIndex?: number;
};

export type TraceCallGraphEdge = {
  from: string;
  to: string;
  digest: string;
};

export type TraceCallGraph = {
  title: string;
  generatedAt: string;
  nodes: TraceCallGraphNode[];
  edges: TraceCallGraphEdge[];
};

export type TraceReplayScriptOptions = {
  network: string;
  rpcUrl?: string;
  replay?: boolean;
  replayJson?: boolean;
  showInputs?: boolean;
  json?: boolean;
  continueOnError?: boolean;
  maxCalls?: number;
  maxEvents?: number;
  maxObjectChanges?: number;
  maxBalanceChanges?: number;
  callFilter?: string;
  callDetailIndex?: number;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function computeChargedGas(trace: SuiTransactionBlockResponse): number | undefined {
  const gasUsed = trace.effects?.gasUsed;
  if (!gasUsed) return undefined;
  const computation = toNumber(gasUsed.computationCost);
  const storage = toNumber(gasUsed.storageCost);
  const rebate = toNumber(gasUsed.storageRebate);
  if (
    typeof computation !== 'number' ||
    typeof storage !== 'number' ||
    typeof rebate !== 'number'
  ) {
    return undefined;
  }
  return computation + storage - rebate;
}

function summarizeEntry(entry: TraceReportEntry): {
  digest: string;
  status: string;
  chargedGas?: number;
  events: number;
  objectChanges: number;
  balanceChanges: number;
  programmableCalls: number;
} {
  const txKind = entry.trace.transaction?.data?.transaction;
  const programmableCalls =
    txKind?.kind === 'ProgrammableTransaction' ? txKind.transactions?.length ?? 0 : 0;

  return {
    digest: entry.digest,
    status: entry.trace.effects?.status?.status ?? 'unknown',
    chargedGas: computeChargedGas(entry.trace),
    events: entry.trace.events?.length ?? 0,
    objectChanges: entry.trace.objectChanges?.length ?? 0,
    balanceChanges: entry.trace.balanceChanges?.length ?? 0,
    programmableCalls
  };
}

function summarizeProgrammableCall(step: any): string {
  if (step && typeof step === 'object' && 'MoveCall' in step) {
    const call = step.MoveCall;
    const argCount = Array.isArray(call?.arguments) ? call.arguments.length : 0;
    return `${call?.module || 'unknown'}::${call?.function || 'unknown'} (${argCount} args)`;
  }
  if (step && typeof step === 'object' && 'TransferObjects' in step) {
    const payload = step.TransferObjects;
    const objectCount = Array.isArray(payload?.[0]) ? payload[0].length : 0;
    return `TransferObjects (${objectCount} objects)`;
  }
  if (step && typeof step === 'object' && 'SplitCoins' in step) {
    const payload = step.SplitCoins;
    const splitCount = Array.isArray(payload?.[1]) ? payload[1].length : 0;
    return `SplitCoins (${splitCount} splits)`;
  }
  if (step && typeof step === 'object' && 'MergeCoins' in step) {
    const payload = step.MergeCoins;
    const mergeCount = Array.isArray(payload?.[1]) ? payload[1].length : 0;
    return `MergeCoins (${mergeCount} merged)`;
  }
  if (step && typeof step === 'object' && 'Publish' in step) {
    const payload = step.Publish;
    const moduleCount = Array.isArray(payload) ? payload.length : 0;
    return `Publish (${moduleCount} modules)`;
  }
  if (step && typeof step === 'object' && 'Upgrade' in step) {
    return 'Upgrade';
  }
  if (step && typeof step === 'object' && 'MakeMoveVec' in step) {
    return 'MakeMoveVec';
  }
  return 'Unknown call';
}

function escapeMermaidLabel(raw: string): string {
  return raw
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '');
}

export function buildTraceCallGraph(entries: TraceReportEntry[], title: string): TraceCallGraph {
  const nodes: TraceCallGraphNode[] = [];
  const edges: TraceCallGraphEdge[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const summary = summarizeEntry(entry);
    const txId = `tx${i + 1}`;
    const txLabel = `${entry.digest.slice(0, 16)}...\n${summary.status.toUpperCase()}`;
    const rootNodeId = `${txId}_root`;
    nodes.push({
      id: rootNodeId,
      digest: entry.digest,
      label: txLabel,
      kind: 'tx'
    });

    const txKind = entry.trace.transaction?.data?.transaction;
    const calls =
      txKind?.kind === 'ProgrammableTransaction' && Array.isArray(txKind.transactions)
        ? txKind.transactions
        : [];

    if (calls.length === 0) {
      const kindNodeId = `${txId}_kind`;
      nodes.push({
        id: kindNodeId,
        digest: entry.digest,
        label: txKind?.kind || 'non-programmable',
        kind: 'kind'
      });
      edges.push({
        from: rootNodeId,
        to: kindNodeId,
        digest: entry.digest
      });
      continue;
    }

    let prevNodeId = rootNodeId;
    for (let callIndex = 0; callIndex < calls.length; callIndex += 1) {
      const callNodeId = `${txId}_c${callIndex + 1}`;
      nodes.push({
        id: callNodeId,
        digest: entry.digest,
        label: `${callIndex + 1}. ${summarizeProgrammableCall(calls[callIndex])}`,
        kind: 'call',
        callIndex: callIndex + 1
      });
      edges.push({
        from: prevNodeId,
        to: callNodeId,
        digest: entry.digest
      });
      prevNodeId = callNodeId;
    }
  }

  return {
    title,
    generatedAt: new Date().toISOString(),
    nodes,
    edges
  };
}

export function renderTraceCallGraphJson(entries: TraceReportEntry[], title: string): string {
  return JSON.stringify(buildTraceCallGraph(entries, title), null, 2);
}

export function renderTraceCallGraphMermaid(entries: TraceReportEntry[], title: string): string {
  const lines: string[] = [];
  lines.push(`%% ${title}`);
  lines.push('flowchart TD');

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const summary = summarizeEntry(entry);
    const txId = `tx${i + 1}`;
    const txLabel = `${entry.digest.slice(0, 16)}...\\n${summary.status.toUpperCase()}`;
    lines.push(`  subgraph ${txId}["${escapeMermaidLabel(entry.digest)}"]`);
    lines.push(`    ${txId}_root["${escapeMermaidLabel(txLabel)}"]`);

    const txKind = entry.trace.transaction?.data?.transaction;
    const calls =
      txKind?.kind === 'ProgrammableTransaction' && Array.isArray(txKind.transactions)
        ? txKind.transactions
        : [];
    if (calls.length === 0) {
      lines.push(`    ${txId}_kind["${escapeMermaidLabel(txKind?.kind || 'non-programmable')}"]`);
      lines.push(`    ${txId}_root --> ${txId}_kind`);
    } else {
      let prevNode = `${txId}_root`;
      for (let callIndex = 0; callIndex < calls.length; callIndex += 1) {
        const node = `${txId}_c${callIndex + 1}`;
        const label = `${callIndex + 1}. ${summarizeProgrammableCall(calls[callIndex])}`;
        lines.push(`    ${node}["${escapeMermaidLabel(label)}"]`);
        lines.push(`    ${prevNode} --> ${node}`);
        prevNode = node;
      }
    }
    lines.push('  end');
  }
  return lines.join('\n');
}

function shellEscape(value: string): string {
  if (value.length === 0) return "''";
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function buildTraceReplayCommand(digest: string, options: TraceReplayScriptOptions): string {
  const args: string[] = ['dubhe', 'trace', '--digest', digest, '--network', options.network];
  if (options.rpcUrl) {
    args.push('--rpc-url', options.rpcUrl);
  }
  if (options.json) args.push('--json');
  if (options.replay) args.push('--replay');
  if (options.replayJson) args.push('--replay-json');
  if (options.showInputs) args.push('--show-inputs');
  if (options.continueOnError) args.push('--continue-on-error');
  if (typeof options.maxCalls === 'number') args.push('--max-calls', `${options.maxCalls}`);
  if (typeof options.maxEvents === 'number') args.push('--max-events', `${options.maxEvents}`);
  if (typeof options.maxObjectChanges === 'number') {
    args.push('--max-object-changes', `${options.maxObjectChanges}`);
  }
  if (typeof options.maxBalanceChanges === 'number') {
    args.push('--max-balance-changes', `${options.maxBalanceChanges}`);
  }
  if (options.callFilter) args.push('--call-filter', options.callFilter);
  if (typeof options.callDetailIndex === 'number') {
    args.push('--call-detail-index', `${options.callDetailIndex}`);
  }
  return args.map((item) => shellEscape(item)).join(' ');
}

export function renderTraceReplayShellScript(
  digests: string[],
  options: TraceReplayScriptOptions
): string {
  const normalizedDigests = Array.from(new Set(digests.map((item) => item.trim()).filter(Boolean)));
  if (normalizedDigests.length === 0) {
    throw new Error('No digests provided for trace replay script');
  }

  const lines: string[] = [];
  lines.push('#!/usr/bin/env bash');
  lines.push('set -euo pipefail');
  lines.push('');
  lines.push('# Dubhe trace replay script');
  lines.push(`# generated at ${new Date().toISOString()}`);
  lines.push(`# network=${options.network}`);
  lines.push('');
  for (const digest of normalizedDigests) {
    lines.push(`echo "[dubhe] trace replay digest=${digest}"`);
    lines.push(buildTraceReplayCommand(digest, options));
    lines.push('');
  }
  return lines.join('\n');
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderTraceMarkdown(entries: TraceReportEntry[], title: string): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(
    '| Digest | Status | Charged Gas | Calls | Events | Object Changes | Balance Changes |'
  );
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: |');

  for (const entry of entries) {
    const summary = summarizeEntry(entry);
    lines.push(
      `| \`${summary.digest}\` | ${summary.status.toUpperCase()} | ${
        typeof summary.chargedGas === 'number' ? summary.chargedGas.toLocaleString('en-US') : 'n/a'
      } | ${summary.programmableCalls} | ${summary.events} | ${summary.objectChanges} | ${
        summary.balanceChanges
      } |`
    );
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');
  for (const entry of entries) {
    const summary = summarizeEntry(entry);
    lines.push(`### ${summary.digest}`);
    lines.push('');
    lines.push(`- Status: ${summary.status.toUpperCase()}`);
    if (typeof summary.chargedGas === 'number') {
      lines.push(`- Charged Gas: ${summary.chargedGas.toLocaleString('en-US')}`);
    }
    lines.push(`- Programmable Calls: ${summary.programmableCalls}`);
    lines.push(`- Events: ${summary.events}`);
    lines.push(`- Object Changes: ${summary.objectChanges}`);
    lines.push(`- Balance Changes: ${summary.balanceChanges}`);
    if (entry.dryRun?.effects?.status?.status) {
      lines.push(`- Replay Dry-Run Status: ${entry.dryRun.effects.status.status.toUpperCase()}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function renderTraceHtml(entries: TraceReportEntry[], title: string): string {
  const rows = entries
    .map((entry) => {
      const summary = summarizeEntry(entry);
      return `<tr>
  <td><code>${escapeHtml(summary.digest)}</code></td>
  <td>${escapeHtml(summary.status.toUpperCase())}</td>
  <td style="text-align:right">${
    typeof summary.chargedGas === 'number'
      ? escapeHtml(summary.chargedGas.toLocaleString('en-US'))
      : 'n/a'
  }</td>
  <td style="text-align:right">${summary.programmableCalls}</td>
  <td style="text-align:right">${summary.events}</td>
  <td style="text-align:right">${summary.objectChanges}</td>
  <td style="text-align:right">${summary.balanceChanges}</td>
</tr>`;
    })
    .join('\n');

  const detailSections = entries
    .map((entry) => {
      const summary = summarizeEntry(entry);
      const dryRunStatus = entry.dryRun?.effects?.status?.status?.toUpperCase() ?? 'N/A';
      return `<section class="detail">
  <h3>${escapeHtml(summary.digest)}</h3>
  <ul>
    <li>Status: ${escapeHtml(summary.status.toUpperCase())}</li>
    <li>Charged Gas: ${
      typeof summary.chargedGas === 'number'
        ? escapeHtml(summary.chargedGas.toLocaleString('en-US'))
        : 'n/a'
    }</li>
    <li>Programmable Calls: ${summary.programmableCalls}</li>
    <li>Events: ${summary.events}</li>
    <li>Object Changes: ${summary.objectChanges}</li>
    <li>Balance Changes: ${summary.balanceChanges}</li>
    <li>Replay Dry-Run Status: ${escapeHtml(dryRunStatus)}</li>
  </ul>
</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
        margin: 24px;
        color: #102a43;
        background: linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
      }
      h1, h2, h3 {
        margin: 0 0 12px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        background: #fff;
        border: 1px solid #d9e2ec;
      }
      th, td {
        border-bottom: 1px solid #d9e2ec;
        padding: 10px;
        text-align: left;
        font-size: 14px;
      }
      th {
        background: #d9e2ec;
      }
      .detail {
        background: #fff;
        border: 1px solid #d9e2ec;
        padding: 12px;
        margin-top: 14px;
      }
      code {
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated at: ${escapeHtml(new Date().toISOString())}</p>
    <h2>Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Digest</th>
          <th>Status</th>
          <th>Charged Gas</th>
          <th>Calls</th>
          <th>Events</th>
          <th>Object Changes</th>
          <th>Balance Changes</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <h2 style="margin-top:18px">Details</h2>
${detailSections}
  </body>
</html>`;
}
