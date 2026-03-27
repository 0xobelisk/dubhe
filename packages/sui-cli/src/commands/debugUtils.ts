import fs from 'fs';
import path from 'path';

export type MoveAbortRecord = {
  modulePath: string;
  moduleName: string;
  functionName: string;
  abortCode: number;
};

export type MoveAbortSourceHint = {
  modulePath: string;
  functionName: string;
  abortCode: number;
  sourceFile?: string;
  matchingErrorConstants: string[];
};

export type SourceContextLine = {
  line: number;
  text: string;
};

export type SourceContextSnippet = {
  label: string;
  startLine: number;
  endLine: number;
  lines: SourceContextLine[];
};

export type DebugSourceHintDetail = MoveAbortSourceHint & {
  snippets: SourceContextSnippet[];
};

export type DebugSessionReport = {
  generatedAt: string;
  configPath: string;
  projectPath: string;
  command: string;
  reproCommand?: string;
  failedTests: string[];
  hints: string[];
  sourceHints: DebugSourceHintDetail[];
  logOut?: string;
  sourceContextLines: number;
};

export function resolveDebugReplayCommand(
  payload: unknown,
  preferReproCommand: boolean = true
): string | undefined {
  if (typeof payload !== 'object' || payload == null) return undefined;
  const command =
    typeof (payload as any).command === 'string' ? (payload as any).command.trim() : '';
  const reproCommand =
    typeof (payload as any).reproCommand === 'string' ? (payload as any).reproCommand.trim() : '';

  if (preferReproCommand) {
    return reproCommand || command || undefined;
  }
  return command || reproCommand || undefined;
}

export function renderReplayShellScript(
  command: string,
  title: string = 'Dubhe debug replay'
): string {
  const normalized = command.trim();
  if (!normalized) {
    throw new Error('Replay command is empty');
  }
  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    `# ${title}`,
    `# generated at ${new Date().toISOString()}`,
    `echo "[dubhe] replay: ${normalized.replaceAll('"', '\\"')}"`,
    normalized,
    ''
  ].join('\n');
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatLocation(filePath: string | undefined, line: number | undefined): string {
  if (!filePath) return 'n/a';
  if (typeof line === 'number' && line > 0) return `${filePath}:${line}`;
  return filePath;
}

export function renderDebugSessionHtml(
  report: DebugSessionReport,
  title: string = 'Dubhe Debug Session'
): string {
  const hintRows = report.sourceHints
    .map((item) => {
      const firstSnippet = item.snippets[0];
      const location = formatLocation(item.sourceFile, firstSnippet?.startLine);
      return `<tr>
  <td><code>${escapeHtml(item.modulePath)}</code></td>
  <td style="text-align:right">${item.abortCode}</td>
  <td><code>${escapeHtml(item.functionName)}</code></td>
  <td><code>${escapeHtml(location)}</code></td>
  <td>${escapeHtml(item.matchingErrorConstants.join(', ') || 'n/a')}</td>
</tr>`;
    })
    .join('\n');

  const details = report.sourceHints
    .map((item) => {
      const snippetHtml = item.snippets
        .map((snippet) => {
          const lines = snippet.lines
            .map(
              (line) =>
                `<div><span class="ln">${String(line.line).padStart(4)}</span> ${escapeHtml(
                  line.text
                )}</div>`
            )
            .join('');
          return `<div class="snippet">
  <div class="snippet-title">${escapeHtml(snippet.label)} (${snippet.startLine}-${
            snippet.endLine
          })</div>
  <pre>${lines}</pre>
</div>`;
        })
        .join('\n');

      return `<section class="detail">
  <h3>${escapeHtml(item.modulePath)} (code=${item.abortCode})</h3>
  <p>Function: <code>${escapeHtml(item.functionName)}</code></p>
  <p>Source: <code>${escapeHtml(item.sourceFile || 'n/a')}</code></p>
  <p>Constants: ${escapeHtml(item.matchingErrorConstants.join(', ') || 'n/a')}</p>
  ${snippetHtml || '<p>No source snippets.</p>'}
</section>`;
    })
    .join('\n');

  const failedTests = report.failedTests
    .map((item) => `<li><code>${escapeHtml(item)}</code></li>`)
    .join('\n');
  const hintList = report.hints.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');

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
      h1, h2, h3 { margin: 0 0 10px; }
      .panel {
        background: #fff;
        border: 1px solid #d9e2ec;
        padding: 12px;
        margin-bottom: 14px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th, td {
        border-bottom: 1px solid #d9e2ec;
        padding: 8px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th { background: #d9e2ec; }
      .detail {
        background: #fff;
        border: 1px solid #d9e2ec;
        padding: 12px;
        margin-bottom: 12px;
      }
      .snippet {
        margin-top: 10px;
      }
      .snippet-title {
        font-size: 12px;
        color: #486581;
        margin-bottom: 4px;
      }
      pre {
        margin: 0;
        background: #f2f7fb;
        border: 1px solid #d9e2ec;
        padding: 8px;
        overflow: auto;
      }
      .ln {
        color: #486581;
        display: inline-block;
        min-width: 44px;
      }
      code {
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="panel">
      <p>Generated at: ${escapeHtml(report.generatedAt)}</p>
      <p>Command: <code>${escapeHtml(report.command)}</code></p>
      <p>Repro: <code>${escapeHtml(report.reproCommand || 'n/a')}</code></p>
      <p>Project: <code>${escapeHtml(report.projectPath)}</code></p>
      <p>Config: <code>${escapeHtml(report.configPath)}</code></p>
      <p>Log: <code>${escapeHtml(report.logOut || 'n/a')}</code></p>
      <p>Context lines: ${report.sourceContextLines}</p>
    </div>
    <div class="panel">
      <h2>Failing Tests (${report.failedTests.length})</h2>
      <ul>
${failedTests || '<li>n/a</li>'}
      </ul>
    </div>
    <div class="panel">
      <h2>Abort/Error Hints (${report.hints.length})</h2>
      <ul>
${hintList || '<li>n/a</li>'}
      </ul>
    </div>
    <div class="panel">
      <h2>Source Hint Index (${report.sourceHints.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Module Path</th>
            <th>Code</th>
            <th>Function</th>
            <th>Location</th>
            <th>Constants</th>
          </tr>
        </thead>
        <tbody>
${hintRows || '<tr><td colspan="5">n/a</td></tr>'}
        </tbody>
      </table>
    </div>
    <h2>Source Details</h2>
${details || '<p>No source details.</p>'}
  </body>
</html>`;
}

export function extractPotentialAbortHints(output: string, maxLines: number = 20): string[] {
  const lines = output.split(/\r?\n/);
  const matched = lines.filter((line) =>
    /(Move abort|Assertion|FAIL|error\[|Execution Error|abort code)/i.test(line)
  );
  const unique = Array.from(new Set(matched.map((line) => line.trim()).filter(Boolean)));
  return unique.slice(0, maxLines);
}

export function extractFailedMoveTests(output: string, maxItems: number = 20): string[] {
  const lines = output.split(/\r?\n/);
  const failed: string[] = [];
  const bracketStyle = /\[\s*FAIL\s*\]\s+([A-Za-z0-9_:]+)/;
  const rustStyle = /test\s+([A-Za-z0-9_:]+)\s+\.\.\.\s+FAILED/i;

  for (const line of lines) {
    const bracketMatch = line.match(bracketStyle);
    if (bracketMatch?.[1]) {
      failed.push(bracketMatch[1].trim());
      continue;
    }
    const rustMatch = line.match(rustStyle);
    if (rustMatch?.[1]) {
      failed.push(rustMatch[1].trim());
    }
  }

  return Array.from(new Set(failed)).slice(0, maxItems);
}

export function extractMoveAbortRecords(output: string, maxItems: number = 20): MoveAbortRecord[] {
  const regex = /Move abort in ([0-9a-zA-Z_]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+) with code (\d+)/g;
  const records: MoveAbortRecord[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output)) !== null) {
    const modulePath = match[1];
    const abortCode = Number.parseInt(match[2], 10);
    if (!modulePath || Number.isNaN(abortCode)) continue;
    const parts = modulePath.split('::');
    if (parts.length < 3) continue;
    const moduleName = parts[1];
    const functionName = parts[2];
    const key = `${modulePath}#${abortCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ modulePath, moduleName, functionName, abortCode });
    if (records.length >= maxItems) break;
  }
  return records;
}

function listMoveSourceFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMoveSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.move')) {
      files.push(fullPath);
    }
  }

  return files;
}

export function findMoveModuleFile(projectPath: string, moduleName: string): string | undefined {
  const sourcesDir = path.join(projectPath, 'sources');
  const files = listMoveSourceFiles(sourcesDir);
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const moduleRegex = new RegExp(`\\bmodule\\s+[^\\s{]*::${escaped}\\b`);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (moduleRegex.test(content)) return filePath;
  }
  return undefined;
}

export function findAbortCodeConstants(filePath: string, abortCode: number): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*u64\s*=\s*([0-9_]+)\s*;/g;
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const value = Number.parseInt(match[2].replace(/_/g, ''), 10);
    if (!name || Number.isNaN(value)) continue;
    if (value === abortCode) {
      names.push(name);
    }
  }
  return names;
}

export function buildMoveAbortSourceHints(
  output: string,
  projectPath: string,
  maxItems: number = 20
): MoveAbortSourceHint[] {
  const records = extractMoveAbortRecords(output, maxItems);
  return records.map((record) => {
    const sourceFile = findMoveModuleFile(projectPath, record.moduleName);
    const matchingErrorConstants = sourceFile
      ? findAbortCodeConstants(sourceFile, record.abortCode)
      : [];
    return {
      modulePath: record.modulePath,
      functionName: record.functionName,
      abortCode: record.abortCode,
      sourceFile,
      matchingErrorConstants
    };
  });
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSnippet(
  fileLines: string[],
  centerLine: number,
  contextLines: number,
  label: string
): SourceContextSnippet {
  const start = Math.max(1, centerLine - contextLines);
  const end = Math.min(fileLines.length, centerLine + contextLines);
  const lines: SourceContextLine[] = [];
  for (let i = start; i <= end; i += 1) {
    lines.push({
      line: i,
      text: fileLines[i - 1]
    });
  }
  return {
    label,
    startLine: start,
    endLine: end,
    lines
  };
}

export function extractMoveSourceSnippets(
  filePath: string,
  functionName: string,
  constantNames: string[],
  contextLines: number = 2,
  maxSnippets: number = 8
): SourceContextSnippet[] {
  if (!fs.existsSync(filePath)) return [];
  const fileLines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  const snippets: SourceContextSnippet[] = [];

  const functionRegex = new RegExp(`\\bfun\\s+${escapeRegex(functionName)}\\b`);
  for (let i = 0; i < fileLines.length; i += 1) {
    if (!functionRegex.test(fileLines[i])) continue;
    snippets.push(buildSnippet(fileLines, i + 1, contextLines, `function ${functionName}`));
    break;
  }

  const uniqueConstantNames = Array.from(
    new Set(constantNames.map((item) => item.trim()).filter(Boolean))
  );
  for (const constantName of uniqueConstantNames) {
    const constantRegex = new RegExp(`\\bconst\\s+${escapeRegex(constantName)}\\b`);
    for (let i = 0; i < fileLines.length; i += 1) {
      if (!constantRegex.test(fileLines[i])) continue;
      snippets.push(buildSnippet(fileLines, i + 1, contextLines, `const ${constantName}`));
      break;
    }
    if (snippets.length >= maxSnippets) break;
  }

  return snippets.slice(0, maxSnippets);
}
