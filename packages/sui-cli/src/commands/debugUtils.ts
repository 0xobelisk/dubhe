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
