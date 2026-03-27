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
