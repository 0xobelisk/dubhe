import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import {
  buildMoveAbortSourceHints,
  extractMoveSourceSnippets,
  extractFailedMoveTests,
  extractPotentialAbortHints,
  resolveDebugReplayCommand
} from './debugUtils';

function getActiveSuiEnv(): string {
  try {
    return execSync('sui client active-env', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return 'testnet';
  }
}

type Options = {
  'config-path': string;
  filter?: string;
  'gas-limit'?: string;
  trace?: boolean;
  statistics?: string;
  'list-tests'?: boolean;
  'show-abort-hints'?: boolean;
  'source-hints'?: boolean;
  'source-hints-max'?: number;
  'show-source-context'?: boolean;
  'source-context-lines'?: number;
  'coverage-module'?: string;
  'log-out'?: string;
  'repro-out'?: string;
  'replay-artifact'?: string;
  'replay-use-repro'?: boolean;
  debug?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'debug',
  describe: 'Run Move tests with deep debug output and optional source-level coverage view',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Path to the Dubhe config file'
      },
      filter: {
        type: 'string',
        desc: 'Optional test filter'
      },
      'gas-limit': {
        type: 'string',
        default: '500000000',
        desc: 'Gas limit for debug test run'
      },
      trace: {
        type: 'boolean',
        default: true,
        desc: 'Enable Move VM trace'
      },
      statistics: {
        type: 'string',
        choices: ['text', 'csv'],
        desc: 'Enable statistics output'
      },
      'list-tests': {
        type: 'boolean',
        default: false,
        desc: 'List tests only (sui move test --list)'
      },
      'show-abort-hints': {
        type: 'boolean',
        default: true,
        desc: 'Show extracted abort/error hints when run fails'
      },
      'source-hints': {
        type: 'boolean',
        default: true,
        desc: 'Map Move abort module/code to local source file and matching error constants'
      },
      'source-hints-max': {
        type: 'number',
        default: 10,
        desc: 'Max Move abort source hints to print'
      },
      'show-source-context': {
        type: 'boolean',
        default: true,
        desc: 'Print source code snippets around abort function/constant matches'
      },
      'source-context-lines': {
        type: 'number',
        default: 2,
        desc: 'Context lines before/after each source snippet line'
      },
      'coverage-module': {
        type: 'string',
        desc: 'Also print source-level coverage for this module'
      },
      'log-out': {
        type: 'string',
        desc: 'Write full debug output to file'
      },
      'repro-out': {
        type: 'string',
        desc: 'Write structured failure repro artifact to file'
      },
      'replay-artifact': {
        type: 'string',
        desc: 'Replay a previous debug repro artifact JSON (uses reproCommand/command)'
      },
      'replay-use-repro': {
        type: 'boolean',
        default: true,
        desc: 'Prefer reproCommand over raw command when replaying artifact'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print underlying command lines'
      }
    });
  },
  async handler({
    'config-path': configPath,
    filter,
    'gas-limit': gasLimit,
    trace,
    statistics,
    'list-tests': listTests,
    'show-abort-hints': showAbortHints,
    'source-hints': sourceHints,
    'source-hints-max': sourceHintsMax,
    'show-source-context': showSourceContext,
    'source-context-lines': sourceContextLines,
    'coverage-module': coverageModule,
    'log-out': logOut,
    'repro-out': reproOut,
    'replay-artifact': replayArtifact,
    'replay-use-repro': replayUseRepro,
    debug
  }) {
    try {
      if (replayArtifact) {
        const replayPayload = JSON.parse(fs.readFileSync(replayArtifact, 'utf-8'));
        const replayCommand = resolveDebugReplayCommand(replayPayload, replayUseRepro ?? true);
        if (!replayCommand) {
          throw new Error(
            `Unable to resolve replay command from artifact: ${replayArtifact} (expected reproCommand or command)`
          );
        }
        if (debug) console.log(chalk.gray(`[debug] replay ${replayCommand}`));
        const output = execSync(replayCommand, { stdio: 'pipe', encoding: 'utf-8' });
        if (output) process.stdout.write(output);
        console.log(chalk.green(`Replay command executed from artifact: ${replayArtifact}`));
        handlerExit();
        return;
      }

      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const cwd = process.cwd();
      const projectPath = path.join(cwd, 'src', dubheConfig.name);
      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;
      const args = ['sui move test'];
      if (buildEnv) args.push(`--build-env ${buildEnv}`);
      args.push(`--path ${projectPath}`);
      args.push(`--gas-limit ${gasLimit}`);
      if (listTests) args.push('--list');
      if (trace) args.push('--trace');
      if (statistics === 'text') args.push('--statistics');
      if (statistics === 'csv') args.push('--statistics csv');
      if (filter) args.push(filter);

      const testCmd = args.join(' ');
      if (debug) console.log(chalk.gray(`[debug] ${testCmd}`));

      let combined = '';
      let testFailed = false;
      try {
        const output = execSync(testCmd, { stdio: 'pipe', encoding: 'utf-8' });
        combined += output;
        process.stdout.write(output);
      } catch (error: any) {
        testFailed = true;
        const output = `${error?.stdout || ''}${error?.stderr || ''}`;
        combined += output;
        process.stdout.write(output);
      }

      if (logOut) {
        fs.mkdirSync(path.dirname(logOut), { recursive: true });
        fs.writeFileSync(logOut, combined, 'utf-8');
        console.log(chalk.green(`Debug log written to: ${logOut}`));
      }

      if (coverageModule) {
        const coverageCmd = `sui move coverage source ${
          buildEnv ? `--build-env ${buildEnv}` : ''
        } --path ${projectPath} --module ${coverageModule}`;
        if (debug) console.log(chalk.gray(`[debug] ${coverageCmd}`));
        const coverageOut = execSync(coverageCmd, { stdio: 'pipe', encoding: 'utf-8' });
        process.stdout.write(coverageOut);
      }

      const failedTests = testFailed ? extractFailedMoveTests(combined) : [];
      const hints =
        testFailed && (showAbortHints ?? true) ? extractPotentialAbortHints(combined) : [];
      const sourceHintItems =
        testFailed && (sourceHints ?? true)
          ? buildMoveAbortSourceHints(
              combined,
              projectPath,
              Math.max(1, Math.floor(sourceHintsMax ?? 10))
            )
          : [];

      if (testFailed && hints.length > 0) {
        if (hints.length > 0) {
          console.error(chalk.yellow('\nPotential abort/error hints:'));
          for (const hint of hints) {
            console.error(`  - ${hint}`);
          }
        }
      }

      if (testFailed && failedTests.length > 0) {
        console.error(chalk.yellow('\nFailing tests:'));
        for (const testName of failedTests.slice(0, 20)) {
          console.error(`  - ${testName}`);
        }
      }

      if (testFailed && sourceHintItems.length > 0) {
        console.error(chalk.yellow('\nMove abort source hints:'));
        for (const item of sourceHintItems) {
          const relPath = item.sourceFile ? path.relative(cwd, item.sourceFile) : undefined;
          const sourceLabel = relPath && relPath.length > 0 ? relPath : item.sourceFile;
          console.error(
            `  - ${item.modulePath} (code=${item.abortCode})${
              sourceLabel ? ` -> ${sourceLabel}` : ' -> source file not found'
            }`
          );
          if (item.matchingErrorConstants.length > 0) {
            console.error(`    constants: ${item.matchingErrorConstants.join(', ')}`);
          }

          if ((showSourceContext ?? true) && item.sourceFile) {
            const snippets = extractMoveSourceSnippets(
              item.sourceFile,
              item.functionName,
              item.matchingErrorConstants,
              Math.max(0, Math.floor(sourceContextLines ?? 2))
            );
            for (const snippet of snippets) {
              console.error(`    snippet (${snippet.label}):`);
              for (const line of snippet.lines) {
                console.error(`      ${String(line.line).padStart(4)} | ${line.text}`);
              }
            }
          }
        }
      }

      const reproFilter = filter || failedTests[0];
      const reproCommand = [
        'dubhe debug',
        `--config-path ${configPath}`,
        reproFilter ? `--filter ${reproFilter}` : '',
        `--gas-limit ${gasLimit}`,
        trace ? '--trace' : '',
        statistics ? `--statistics ${statistics}` : ''
      ]
        .filter(Boolean)
        .join(' ');

      if (testFailed) {
        console.error(chalk.yellow(`\nRepro command: ${reproCommand}`));
      }

      if (testFailed && reproOut) {
        fs.mkdirSync(path.dirname(reproOut), { recursive: true });
        fs.writeFileSync(
          reproOut,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              configPath,
              projectPath,
              command: testCmd,
              failedTests,
              hints,
              sourceHints: sourceHintItems,
              sourceContextLines: sourceContextLines ?? 2,
              reproCommand
            },
            null,
            2
          ),
          'utf-8'
        );
        console.log(chalk.green(`Debug repro artifact written to: ${reproOut}`));
      }

      if (testFailed) {
        handlerExit(1);
        return;
      }
      handlerExit();
    } catch (error: any) {
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
    }
  }
};

export default commandModule;
