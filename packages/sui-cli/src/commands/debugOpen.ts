import type { CommandModule } from 'yargs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import {
  buildCodeOpenArgs,
  collectDefaultTraceCandidates,
  formatCommand,
  isTraceFile,
  pickNewestFile,
  upsertMoveDebugLaunchConfig,
  writeLaunchFile
} from './debugOpenUtils';

type Options = {
  'config-path': string;
  'project-path'?: string;
  'trace-file'?: string;
  'source-file'?: string;
  line?: number;
  'launch-path': string;
  'launch-name': string;
  open: boolean;
  'start-debug': boolean;
  'code-bin': string;
  'print-command': boolean;
  strict: boolean;
};

async function resolveProjectPath(configPath: string, projectPath?: string): Promise<string> {
  if (projectPath && projectPath.trim().length > 0) {
    return path.resolve(projectPath);
  }
  const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
  return path.join(process.cwd(), 'src', dubheConfig.name);
}

function assertExistingFile(filePath: string, label: string): string {
  const resolved = path.resolve(filePath);
  if (!resolved || !path.isAbsolute(resolved)) {
    throw new Error(`${label} must resolve to an absolute file path`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  return resolved;
}

const commandModule: CommandModule<Options, Options> = {
  command: 'debug-open',
  describe:
    'Prepare VSCode Move Trace Debugger launch config, auto-locate latest trace, and optionally open editor',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        desc: 'Path to Dubhe config file'
      },
      'project-path': {
        type: 'string',
        desc: 'Override Move package path (defaults to src/<dubheConfig.name>)'
      },
      'trace-file': {
        type: 'string',
        desc: 'Trace file (.json.zst) to open directly'
      },
      'source-file': {
        type: 'string',
        desc: 'Move source file to open directly'
      },
      line: {
        type: 'number',
        desc: 'Optional line number for --source-file'
      },
      'launch-path': {
        type: 'string',
        default: '.vscode/launch.json',
        desc: 'Path to VSCode launch.json'
      },
      'launch-name': {
        type: 'string',
        default: 'Dubhe Move Trace Debug',
        desc: 'Launch configuration name to create/update'
      },
      open: {
        type: 'boolean',
        default: true,
        desc: 'Open VSCode using code CLI after writing launch config'
      },
      'start-debug': {
        type: 'boolean',
        default: false,
        desc: 'Trigger VSCode debug start command after opening target file'
      },
      'code-bin': {
        type: 'string',
        default: 'code',
        desc: 'VSCode CLI binary name/path'
      },
      'print-command': {
        type: 'boolean',
        default: true,
        desc: 'Print generated code CLI command'
      },
      strict: {
        type: 'boolean',
        default: false,
        desc: 'Fail if trace auto-discovery cannot find any .json.zst file'
      }
    });
  },
  async handler({
    'config-path': configPath,
    'project-path': projectPathArg,
    'trace-file': traceFile,
    'source-file': sourceFile,
    line,
    'launch-path': launchPath,
    'launch-name': launchName,
    open,
    'start-debug': startDebug,
    'code-bin': codeBin,
    'print-command': printCommand,
    strict
  }) {
    try {
      const cwd = process.cwd();
      const projectPath = await resolveProjectPath(configPath, projectPathArg);
      const launchAbsPath = path.resolve(cwd, launchPath);

      let targetFile: string | undefined;
      if (traceFile) {
        targetFile = assertExistingFile(traceFile, '--trace-file');
        if (!isTraceFile(targetFile)) {
          throw new Error(`--trace-file must end with .json.zst: ${targetFile}`);
        }
      } else if (sourceFile) {
        targetFile = assertExistingFile(sourceFile, '--source-file');
      } else {
        const candidates = collectDefaultTraceCandidates(cwd, projectPath);
        targetFile = pickNewestFile(candidates);
        if (!targetFile && strict) {
          throw new Error(
            `No trace files found under ${path.join(projectPath, 'traces')} or ${path.join(
              cwd,
              '.replay'
            )}`
          );
        }
      }

      const { payload, changed } = upsertMoveDebugLaunchConfig(launchAbsPath, launchName);
      writeLaunchFile(launchAbsPath, payload);
      const launchStatus = changed ? 'updated' : 'verified';
      console.log(chalk.green(`VSCode launch config ${launchStatus}: ${launchAbsPath}`));

      if (!targetFile) {
        console.log(
          chalk.yellow(
            'No trace/source target selected. Run `dubhe debug --trace` or `dubhe trace --digest <tx> --replay` first, then re-run debug-open.'
          )
        );
        handlerExit();
        return;
      }

      const openLine = sourceFile ? line : undefined;
      const args = buildCodeOpenArgs(cwd, targetFile, openLine, startDebug);
      const commandString = formatCommand(codeBin, args);

      console.log(chalk.green(`Debug target: ${targetFile}`));
      if (printCommand) {
        console.log(chalk.blue(`Code command: ${commandString}`));
      }

      if (!open) {
        handlerExit();
        return;
      }

      const run = spawnSync(codeBin, args, { stdio: 'inherit' });
      if (run.error) {
        if ((run.error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(
            `Cannot find VSCode CLI binary '${codeBin}'. Install 'code' command in VSCode or use --code-bin <path>.`
          );
        }
        throw run.error;
      }
      if (typeof run.status === 'number' && run.status !== 0) {
        throw new Error(`VSCode CLI exited with status ${run.status}`);
      }

      handlerExit();
    } catch (error: any) {
      const message = error?.message || String(error);
      process.stderr.write(`${message}\n`);
      handlerExit(1);
    }
  }
};

export default commandModule;
