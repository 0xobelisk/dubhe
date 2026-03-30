import type { CommandModule } from 'yargs';
import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import { handlerExit } from './shell';
import {
  buildWorkbenchPayload,
  readOptionalJsonFile,
  type WorkbenchCategory,
  type WorkbenchEvent,
  type WorkbenchPayload,
  type WorkbenchSeverity
} from './workbenchUtils';
import {
  buildPseudoCallStack,
  clampIndex,
  extractDigestFromEvent,
  filterWorkbenchEvents,
  findContinueIndex,
  type DebugTuiFilters
} from './debugTuiUtils';

type Options = {
  title?: string;
  'debug-session'?: string;
  'gas-source-map'?: string;
  'gas-regression'?: string;
  'trace-call-graph-json'?: string;
  'trace-consistency'?: string;
  'fork-replay'?: string;
  'debug-replay-script'?: string;
  'trace-replay-script'?: string;
  'strict-files'?: boolean;
  category?: string;
  severity?: string;
  search?: string;
  'start-index'?: number;
};

function readOptionalTextFile(filePath: string): string | undefined {
  if (!filePath || !fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf-8');
}

function assertOrWarn(
  filePath: string | undefined,
  strict: boolean | undefined,
  label: string
): void {
  if (!filePath) return;
  if (fs.existsSync(filePath)) return;
  const message = `${label} file not found: ${filePath}`;
  if (strict) {
    throw new Error(message);
  }
  console.log(chalk.yellow(`[debug-tui] ${message}`));
}

function renderEventBlock(event: WorkbenchEvent | undefined): string[] {
  if (!event) return ['No event selected'];
  const lines: string[] = [];
  lines.push(
    `${chalk.bold(`[${event.severity.toUpperCase()}]`)} ${event.title} ${chalk.gray(
      `(${event.category})`
    )}`
  );
  if (event.timestamp) lines.push(`time: ${event.timestamp}`);
  if (event.detail) lines.push(`detail: ${event.detail}`);
  if (event.sourceFile) {
    const src = event.sourceLine ? `${event.sourceFile}:${event.sourceLine}` : event.sourceFile;
    lines.push(`source: ${src}`);
  }
  if (event.command) lines.push(`command: ${event.command}`);
  if (event.tags?.length > 0) lines.push(`tags: ${event.tags.join(', ')}`);
  return lines;
}

function printNonInteractive(payload: WorkbenchPayload, filters: DebugTuiFilters): void {
  const filtered = filterWorkbenchEvents(payload.events, filters);
  console.log(chalk.bold('Dubhe Debug TUI (non-interactive mode)'));
  console.log(
    `events=${filtered.length}/${payload.events.length} category=${filters.category} severity=${filters.severity} search="${filters.search}"`
  );
  for (const event of filtered.slice(0, 20)) {
    console.log(
      `- [${event.severity}] ${event.category} ${event.title}${
        event.detail ? ` :: ${event.detail}` : ''
      }`
    );
  }
  if (filtered.length > 20) {
    console.log(`... ${filtered.length - 20} more events`);
  }
}

type RuntimeState = {
  filters: DebugTuiFilters;
  filteredEvents: WorkbenchEvent[];
  cursor: number;
  breakpoints: Set<string>;
  status: string;
  prompting: boolean;
};

function categoryFromKey(key: string): WorkbenchCategory | 'all' | undefined {
  if (key === '0') return 'all';
  if (key === '1') return 'debug';
  if (key === '2') return 'gas';
  if (key === '3') return 'trace';
  if (key === '4') return 'fork';
  if (key === '5') return 'replay';
  return undefined;
}

function severityFromKey(key: string): WorkbenchSeverity | 'all' | undefined {
  if (key === 'a') return 'all';
  if (key === 'i') return 'info';
  if (key === 'w') return 'warn';
  if (key === 'e') return 'error';
  return undefined;
}

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[0f');
}

async function runInteractiveTui(
  payload: WorkbenchPayload,
  initialFilters: DebugTuiFilters,
  startIndex: number
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  readline.emitKeypressEvents(process.stdin, rl);
  const tty = process.stdin.isTTY;
  if (tty) process.stdin.setRawMode(true);

  const state: RuntimeState = {
    filters: initialFilters,
    filteredEvents: filterWorkbenchEvents(payload.events, initialFilters),
    cursor: clampIndex(startIndex, payload.events.length),
    breakpoints: new Set<string>(),
    status:
      'keys: n/p step, c continue, b breakpoint, 0-5 category, a/i/w/e severity, / search, r reset, q quit',
    prompting: false
  };

  state.cursor = clampIndex(state.cursor, state.filteredEvents.length);

  const render = (): void => {
    clearScreen();
    const event = state.filteredEvents[state.cursor];
    const digest = event ? extractDigestFromEvent(event) : undefined;
    const stack = buildPseudoCallStack(payload.artifacts.traceCallGraph, digest);
    const eventBlock = renderEventBlock(event);
    const indexLabel = state.filteredEvents.length
      ? `${state.cursor + 1}/${state.filteredEvents.length}`
      : '0/0';

    const header = [
      chalk.bold('Dubhe Debug TUI'),
      chalk.gray(`title: ${payload.title}`),
      `event: ${indexLabel} (total=${payload.events.length})`,
      `filters: category=${state.filters.category}, severity=${state.filters.severity}, search="${state.filters.search}"`,
      `breakpoints: ${state.breakpoints.size}`
    ];

    const stackBlock =
      stack.length > 0
        ? ['call stack (pseudo):', ...stack.map((item, i) => `  ${i + 1}. ${item}`)]
        : ['call stack (pseudo): n/a'];

    const commands = payload.replayCommands.slice(0, 5);
    const commandBlock =
      commands.length > 0
        ? ['replay cmds:', ...commands.map((item) => `  - ${item}`)]
        : ['replay cmds: n/a'];

    const lines = [
      ...header,
      '',
      ...eventBlock,
      '',
      ...stackBlock,
      '',
      ...commandBlock,
      '',
      `status: ${state.status}`
    ];
    process.stdout.write(lines.join('\n'));
  };

  const refreshFiltered = (): void => {
    state.filteredEvents = filterWorkbenchEvents(payload.events, state.filters);
    state.cursor = clampIndex(state.cursor, state.filteredEvents.length);
  };

  const promptSearch = async (): Promise<void> => {
    if (!tty) return;
    state.prompting = true;
    process.stdin.setRawMode(false);
    process.stdout.write('\n');
    const answer = await new Promise<string>((resolve) => {
      rl.question('search> ', (input) => resolve(input));
    });
    state.filters.search = answer.trim();
    refreshFiltered();
    state.status = `search updated (${state.filteredEvents.length} events)`;
    process.stdin.setRawMode(true);
    state.prompting = false;
    render();
  };

  const shutdown = (status: number): void => {
    process.stdout.write('\n');
    process.stdin.removeListener('keypress', onKeyPress);
    if (tty) process.stdin.setRawMode(false);
    rl.close();
    handlerExit(status);
  };

  const onKeyPress = async (str: string, key: readline.Key): Promise<void> => {
    if (state.prompting) return;
    const event = state.filteredEvents[state.cursor];
    if (key?.ctrl && key.name === 'c') {
      shutdown(0);
      return;
    }
    if (str === 'q' || key.name === 'escape') {
      shutdown(0);
      return;
    }

    if (str === 'n' || str === 's' || key.name === 'right' || key.name === 'down' || str === 'j') {
      state.cursor = clampIndex(state.cursor + 1, state.filteredEvents.length);
      state.status = 'step/next';
      render();
      return;
    }
    if (str === 'p' || key.name === 'left' || key.name === 'up' || str === 'k') {
      state.cursor = clampIndex(state.cursor - 1, state.filteredEvents.length);
      state.status = 'step back';
      render();
      return;
    }
    if (str === 'c') {
      const next = findContinueIndex(state.filteredEvents, state.cursor, state.breakpoints);
      if (typeof next === 'number') {
        state.cursor = next;
        state.status = 'continue -> next breakpoint/warn/error';
      } else {
        state.status = 'continue: no further breakpoint/warn/error';
      }
      render();
      return;
    }
    if (str === 'b') {
      if (!event) {
        state.status = 'no event to set breakpoint';
      } else if (state.breakpoints.has(event.id)) {
        state.breakpoints.delete(event.id);
        state.status = `breakpoint removed: ${event.id}`;
      } else {
        state.breakpoints.add(event.id);
        state.status = `breakpoint added: ${event.id}`;
      }
      render();
      return;
    }

    const category = categoryFromKey(str);
    if (category) {
      state.filters.category = category;
      refreshFiltered();
      state.status = `category filter => ${category}`;
      render();
      return;
    }

    const severity = severityFromKey(str);
    if (severity) {
      state.filters.severity = severity;
      refreshFiltered();
      state.status = `severity filter => ${severity}`;
      render();
      return;
    }

    if (str === 'r') {
      state.filters = { category: 'all', severity: 'all', search: '' };
      refreshFiltered();
      state.status = 'filters reset';
      render();
      return;
    }

    if (str === '/') {
      await promptSearch();
      return;
    }
  };

  process.stdin.on('keypress', onKeyPress);
  render();
}

const commandModule: CommandModule<Options, Options> = {
  command: 'debug-tui',
  describe:
    'Open an interactive terminal debugger over Dubhe debug/gas/trace artifacts (step/continue/breakpoint over timeline events)',
  builder(yargs) {
    return yargs.options({
      title: {
        type: 'string',
        default: 'Dubhe Debug Workbench',
        desc: 'Workbench title'
      },
      'debug-session': {
        type: 'string',
        default: '.reports/move/debug-session.json',
        desc: 'Debug session JSON artifact path'
      },
      'gas-source-map': {
        type: 'string',
        default: '.reports/move/gas-source-map.json',
        desc: 'Gas source-map JSON artifact path'
      },
      'gas-regression': {
        type: 'string',
        default: '.reports/move/gas-regression.json',
        desc: 'Gas regression JSON artifact path'
      },
      'trace-call-graph-json': {
        type: 'string',
        default: '.reports/move/trace-call-graph.json',
        desc: 'Trace call-graph JSON artifact path'
      },
      'trace-consistency': {
        type: 'string',
        default: '.reports/move/trace-replay-consistency.json',
        desc: 'Trace replay consistency JSON artifact path'
      },
      'fork-replay': {
        type: 'string',
        default: '.reports/snapshots/fork-replay-report.json',
        desc: 'Fork replay consistency JSON artifact path'
      },
      'debug-replay-script': {
        type: 'string',
        default: '.reports/move/debug-replay.sh',
        desc: 'Debug replay shell script path'
      },
      'trace-replay-script': {
        type: 'string',
        default: '.reports/move/trace-replay.sh',
        desc: 'Trace replay shell script path'
      },
      'strict-files': {
        type: 'boolean',
        default: false,
        desc: 'Fail when any provided artifact file is missing'
      },
      category: {
        type: 'string',
        choices: ['all', 'debug', 'gas', 'trace', 'fork', 'replay'],
        default: 'all',
        desc: 'Initial category filter'
      },
      severity: {
        type: 'string',
        choices: ['all', 'info', 'warn', 'error'],
        default: 'all',
        desc: 'Initial severity filter'
      },
      search: {
        type: 'string',
        default: '',
        desc: 'Initial search text'
      },
      'start-index': {
        type: 'number',
        default: 0,
        desc: 'Initial cursor index in filtered event list'
      }
    });
  },
  handler: async ({
    title,
    'debug-session': debugSessionPath,
    'gas-source-map': gasSourceMapPath,
    'gas-regression': gasRegressionPath,
    'trace-call-graph-json': traceCallGraphJsonPath,
    'trace-consistency': traceConsistencyPath,
    'fork-replay': forkReplayPath,
    'debug-replay-script': debugReplayScriptPath,
    'trace-replay-script': traceReplayScriptPath,
    'strict-files': strictFiles,
    category,
    severity,
    search,
    'start-index': startIndex
  }) => {
    try {
      const checks = [
        [debugSessionPath, 'debug-session'],
        [gasSourceMapPath, 'gas-source-map'],
        [gasRegressionPath, 'gas-regression'],
        [traceCallGraphJsonPath, 'trace-call-graph-json'],
        [traceConsistencyPath, 'trace-consistency'],
        [forkReplayPath, 'fork-replay'],
        [debugReplayScriptPath, 'debug-replay-script'],
        [traceReplayScriptPath, 'trace-replay-script']
      ] as const;
      for (const [filePath, label] of checks) {
        assertOrWarn(filePath, strictFiles, label);
      }

      const payload = buildWorkbenchPayload(title || 'Dubhe Debug Workbench', {
        debugSession: readOptionalJsonFile(debugSessionPath || ''),
        gasSourceMap: readOptionalJsonFile(gasSourceMapPath || ''),
        gasRegression: readOptionalJsonFile(gasRegressionPath || ''),
        traceCallGraph: readOptionalJsonFile(traceCallGraphJsonPath || ''),
        traceConsistency: readOptionalJsonFile(traceConsistencyPath || ''),
        forkReplay: readOptionalJsonFile(forkReplayPath || ''),
        debugReplayScript: readOptionalTextFile(debugReplayScriptPath || ''),
        traceReplayScript: readOptionalTextFile(traceReplayScriptPath || '')
      });

      const initialFilters: DebugTuiFilters = {
        category: (category || 'all') as DebugTuiFilters['category'],
        severity: (severity || 'all') as DebugTuiFilters['severity'],
        search: search || ''
      };
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        printNonInteractive(payload, initialFilters);
        handlerExit();
        return;
      }

      if (payload.events.length === 0) {
        console.log(
          chalk.yellow(
            'No events available. Generate artifacts first (e.g. dubhe debug --session-out ..., dubhe test, dubhe trace).'
          )
        );
        handlerExit();
        return;
      }

      await runInteractiveTui(payload, initialFilters, Math.max(0, Math.floor(startIndex || 0)));
    } catch (error: any) {
      const message = error?.message || String(error);
      process.stderr.write(`${message}\n`);
      handlerExit(1);
    }
  }
};

export default commandModule;
