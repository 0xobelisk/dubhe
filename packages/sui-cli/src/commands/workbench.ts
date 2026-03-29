import type { CommandModule } from 'yargs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { handlerExit } from './shell';
import {
  buildWorkbenchPayload,
  readOptionalJsonFile,
  renderWorkbenchHtml,
  writeWorkbenchHtml
} from './workbenchUtils';

type Options = {
  out: string;
  title?: string;
  'json-out'?: string;
  'debug-session'?: string;
  'gas-source-map'?: string;
  'gas-regression'?: string;
  'trace-call-graph-json'?: string;
  'trace-consistency'?: string;
  'fork-replay'?: string;
  'debug-replay-script'?: string;
  'trace-replay-script'?: string;
  'strict-files'?: boolean;
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
  console.log(chalk.yellow(`[workbench] ${message}`));
}

const commandModule: CommandModule<Options, Options> = {
  command: 'workbench',
  describe:
    'Build an interactive debug workbench HTML from debug/gas/trace/fork artifacts (timeline + filters + replay)',
  builder(yargs) {
    return yargs.options({
      out: {
        type: 'string',
        default: '.reports/move/workbench.html',
        desc: 'Output HTML file path'
      },
      title: {
        type: 'string',
        default: 'Dubhe Debug Workbench',
        desc: 'Workbench title'
      },
      'json-out': {
        type: 'string',
        desc: 'Optional output path for merged workbench JSON payload'
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
      }
    });
  },
  handler: async ({
    out,
    title,
    'json-out': jsonOut,
    'debug-session': debugSessionPath,
    'gas-source-map': gasSourceMapPath,
    'gas-regression': gasRegressionPath,
    'trace-call-graph-json': traceCallGraphJsonPath,
    'trace-consistency': traceConsistencyPath,
    'fork-replay': forkReplayPath,
    'debug-replay-script': debugReplayScriptPath,
    'trace-replay-script': traceReplayScriptPath,
    'strict-files': strictFiles
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

      const html = renderWorkbenchHtml(payload);
      writeWorkbenchHtml(out, html);
      console.log(chalk.green(`Workbench HTML written to: ${out}`));

      if (jsonOut) {
        fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
        fs.writeFileSync(jsonOut, JSON.stringify(payload, null, 2), 'utf-8');
        console.log(chalk.green(`Workbench JSON written to: ${jsonOut}`));
      }

      handlerExit();
    } catch (error: any) {
      if (error?.message) process.stderr.write(String(error.message));
      handlerExit(1);
    }
  }
};

export default commandModule;
