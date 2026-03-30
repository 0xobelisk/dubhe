import fs from 'fs';
import path from 'path';

export type MoveDebugLaunchConfig = {
  name: string;
  type: 'move-debug';
  request: 'launch';
  source: string;
  stopOnEntry: boolean;
  logLevel: 'none' | 'log' | 'verbose';
  traceInfo?: string;
};

type LaunchFilePayload = {
  version: string;
  configurations: Record<string, unknown>[];
};

export function isTraceFile(filePath: string): boolean {
  return filePath.endsWith('.json.zst');
}

function shellEscape(value: string): string {
  if (!value) return "''";
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function formatCommand(binary: string, args: string[]): string {
  return [binary, ...args].map((item) => shellEscape(item)).join(' ');
}

export function listTraceFilesRecursively(rootDir: string): string[] {
  const resolvedRoot = path.resolve(rootDir);
  if (!fs.existsSync(resolvedRoot)) return [];
  const entries = fs.readdirSync(resolvedRoot, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(resolvedRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTraceFilesRecursively(fullPath));
      continue;
    }
    if (entry.isFile() && isTraceFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function pickNewestFile(filePaths: string[]): string | undefined {
  const normalized = Array.from(new Set(filePaths.map((item) => path.resolve(item))));
  if (normalized.length === 0) return undefined;
  const ranked = normalized
    .map((filePath) => {
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(filePath).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
      return { filePath, mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return ranked[0]?.filePath;
}

export function collectDefaultTraceCandidates(cwd: string, projectPath: string): string[] {
  const projectTraces = listTraceFilesRecursively(path.join(projectPath, 'traces'));
  const replayTraces = listTraceFilesRecursively(path.join(cwd, '.replay'));
  return [...projectTraces, ...replayTraces];
}

export function buildMoveDebugLaunchConfig(
  name: string,
  source: string = '${file}'
): MoveDebugLaunchConfig {
  return {
    name,
    type: 'move-debug',
    request: 'launch',
    source,
    stopOnEntry: true,
    logLevel: 'log'
  };
}

function parseLaunchFile(filePath: string): LaunchFilePayload | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as any;
  if (typeof parsed !== 'object' || parsed == null) return undefined;
  const configurations = Array.isArray(parsed.configurations) ? parsed.configurations : [];
  const version = typeof parsed.version === 'string' ? parsed.version : '0.2.0';
  return {
    version,
    configurations
  };
}

export function upsertMoveDebugLaunchConfig(
  launchPath: string,
  launchName: string
): {
  payload: LaunchFilePayload;
  config: MoveDebugLaunchConfig;
  changed: boolean;
} {
  const resolvedLaunchPath = path.resolve(launchPath);
  const current = parseLaunchFile(resolvedLaunchPath) || {
    version: '0.2.0',
    configurations: []
  };

  const nextConfig = buildMoveDebugLaunchConfig(launchName, '${file}');
  const currentConfigs = Array.isArray(current.configurations) ? [...current.configurations] : [];
  const currentIndex = currentConfigs.findIndex(
    (item) => typeof item?.name === 'string' && item.name === launchName
  );

  const prev = currentIndex >= 0 ? currentConfigs[currentIndex] : undefined;
  let changed = false;
  if (!prev || typeof prev !== 'object') {
    changed = true;
  } else {
    const prevSnapshot = JSON.stringify(prev);
    const nextSnapshot = JSON.stringify({
      ...prev,
      ...nextConfig
    });
    changed = prevSnapshot !== nextSnapshot;
  }

  if (currentIndex >= 0) {
    currentConfigs[currentIndex] = {
      ...currentConfigs[currentIndex],
      ...nextConfig
    };
  } else {
    currentConfigs.push(nextConfig);
    changed = true;
  }

  const payload: LaunchFilePayload = {
    version: current.version || '0.2.0',
    configurations: currentConfigs
  };

  return {
    payload,
    config: nextConfig,
    changed
  };
}

export function writeLaunchFile(launchPath: string, payload: LaunchFilePayload): void {
  const resolved = path.resolve(launchPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

export function buildCodeOpenArgs(
  workspaceRoot: string,
  targetFile: string,
  line?: number,
  startDebug: boolean = false
): string[] {
  const location =
    typeof line === 'number' && Number.isFinite(line) && line > 0
      ? `${path.resolve(targetFile)}:${Math.floor(line)}`
      : path.resolve(targetFile);
  const args: string[] = ['--reuse-window', path.resolve(workspaceRoot), '--goto', location];
  if (startDebug) {
    args.push('--command', 'workbench.action.debug.start');
  }
  return args;
}
