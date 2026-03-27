import type {
  DryRunTransactionBlockResponse,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';

export type TraceReportEntry = {
  digest: string;
  trace: SuiTransactionBlockResponse;
  dryRun?: DryRunTransactionBlockResponse;
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
