import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import { extractPotentialAbortHints } from './debugUtils';

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
  statistics?: 'text' | 'csv';
  'list-tests'?: boolean;
  'show-abort-hints'?: boolean;
  'coverage-module'?: string;
  'log-out'?: string;
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
      'coverage-module': {
        type: 'string',
        desc: 'Also print source-level coverage for this module'
      },
      'log-out': {
        type: 'string',
        desc: 'Write full debug output to file'
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
    'coverage-module': coverageModule,
    'log-out': logOut,
    debug
  }) {
    try {
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

      if (testFailed && (showAbortHints ?? true)) {
        const hints = extractPotentialAbortHints(combined);
        if (hints.length > 0) {
          console.error(chalk.yellow('\nPotential abort/error hints:'));
          for (const hint of hints) {
            console.error(`  - ${hint}`);
          }
        }
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
