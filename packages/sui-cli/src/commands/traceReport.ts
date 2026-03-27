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
