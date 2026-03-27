import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import chalk from 'chalk';
import { handlerExit } from './shell';
import {
  buildGasProfileReport,
  compareGasAgainstBaseline,
  formatGasStatisticsSummary,
  formatGasRegressionSummary,
  parseGasStatisticsCsv,
  readGasProfileReport,
  resolveStatisticsMode,
  writeGasProfileReport
} from './testProfiling';

/**
 * Returns the active Sui client environment (e.g. "localnet", "testnet").
 * Falls back to "testnet" if the command fails.
 */
function getActiveSuiEnv(): string {
  try {
    return execSync('sui client active-env', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return 'testnet';
  }
}

type Options = {
  'config-path': string;
  test?: string;
  'gas-limit'?: string;
  trace?: boolean;
  statistics?: string;
  'profile-gas'?: boolean;
  'profile-top'?: number;
  'profile-out'?: string;
  'profile-baseline'?: string;
  'profile-threshold-pct'?: number;
  'profile-fail-on-regression'?: boolean;
  'update-profile-baseline'?: boolean;
  debug?: boolean;
};

type TestRunOptions = {
  trace?: boolean;
  statistics?: 'text' | 'csv';
  debug?: boolean;
};

/**
 * Core Move test runner for Dubhe contracts.
 * Runs `sui move test` against the package at `src/<dubheConfig.name>`.
 *
 * Move unit tests compile packages locally — no network or published address required.
 */
export async function testHandler(
  dubheConfig: DubheConfig,
  test?: string,
  gasLimit: string = '100000000',
  buildEnv?: string,
  options?: TestRunOptions
): Promise<string> {
  const cwd = process.cwd();
  const projectPath = `${cwd}/src/${dubheConfig.name}`;
  const args = ['sui move test'];

  // --build-env overrides the active Sui client environment for dependency resolution.
  // Required for localnet (which is not in Move.toml [environments]) when the
  // active client env has been set to localnet from a previous run.
  if (buildEnv) args.push(`--build-env ${buildEnv}`);
  args.push(`--path ${projectPath}`);
  if (test) args.push(`--test ${test}`);
  args.push(`--gas-limit ${gasLimit}`);
  if (options?.trace) args.push('--trace');

  if (options?.statistics === 'text') {
    args.push('--statistics');
  } else if (options?.statistics === 'csv') {
    args.push('--statistics csv');
  }

  const command = args.join(' ');
  if (options?.debug) {
    console.log(chalk.gray(`[debug] command=${command}`));
  }

  return execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
}

const commandModule: CommandModule<Options, Options> = {
  command: 'test',

  describe: 'Run Move unit tests in Dubhe contracts',

  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Path to the Dubhe config file'
      },
      test: {
        type: 'string',
        desc: 'Run a specific test by name'
      },
      'gas-limit': {
        type: 'string',
        desc: 'Set the gas limit for the test',
        default: '100000000'
      },
      trace: {
        type: 'boolean',
        default: false,
        desc: 'Enable Move VM trace output'
      },
      statistics: {
        type: 'string',
        choices: ['text', 'csv'],
        desc: 'Enable Move test statistics output (text or csv)'
      },
      'profile-gas': {
        type: 'boolean',
        default: false,
        desc: 'Enable gas profiling summary (forces --statistics csv)'
      },
      'profile-top': {
        type: 'number',
        default: 10,
        desc: 'Top N tests by gas in profiling summary'
      },
      'profile-out': {
        type: 'string',
        desc: 'Write parsed gas profile JSON report to this file'
      },
      'profile-baseline': {
        type: 'string',
        desc: 'Path to baseline gas profile JSON for regression check'
      },
      'profile-threshold-pct': {
        type: 'number',
        default: 5,
        desc: 'Fail when gas increase exceeds this percentage vs baseline'
      },
      'profile-fail-on-regression': {
        type: 'boolean',
        default: true,
        desc: 'Exit non-zero if baseline regressions are detected'
      },
      'update-profile-baseline': {
        type: 'boolean',
        default: false,
        desc: 'Overwrite baseline file with current profiling result after run'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print debug execution details'
      }
    });
  },

  async handler({
    'config-path': configPath,
    test,
    'gas-limit': gasLimit,
    trace,
    statistics,
    'profile-gas': profileGas,
    'profile-top': profileTop,
    'profile-out': profileOut,
    'profile-baseline': profileBaseline,
    'profile-threshold-pct': profileThresholdPct,
    'profile-fail-on-regression': profileFailOnRegression,
    'update-profile-baseline': updateProfileBaseline,
    debug
  }) {
    try {
      console.log('🚀 Running move test');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

      // Ephemeral networks (localnet/devnet) are not defined in Move.toml [environments].
      // Use --build-env testnet for dependency resolution so `sui move test` can resolve
      // git dependencies without requiring a localnet env entry.
      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;
      const normalizedStatistics =
        statistics === 'text' || statistics === 'csv' ? statistics : undefined;
      const resolvedStatistics = resolveStatisticsMode(normalizedStatistics, profileGas);

      const output = await testHandler(dubheConfig, test, gasLimit, buildEnv, {
        trace,
        statistics: resolvedStatistics,
        debug
      });
      if (output) process.stdout.write(output);

      if (resolvedStatistics === 'csv' && profileGas) {
        const rows = parseGasStatisticsCsv(output);
        const top = Math.max(1, Math.floor(profileTop ?? 10));
        const summary = formatGasStatisticsSummary(rows, top);
        process.stdout.write(`${summary}\n`);
        const report = buildGasProfileReport(rows, top);

        if (profileOut) {
          writeGasProfileReport(profileOut, report);
          console.log(chalk.green(`Gas profile report written to: ${profileOut}`));
        }

        if (profileBaseline) {
          let baselineRows:
            | {
                name: string;
                nanos: number;
                gas: number;
              }[]
            | undefined;

          try {
            const baselineReport = readGasProfileReport(profileBaseline);
            baselineRows = baselineReport.rows;
          } catch (error) {
            if (!updateProfileBaseline) throw error;
            console.log(
              chalk.yellow(
                `Baseline not found/readable, will initialize it from current run: ${profileBaseline}`
              )
            );
          }

          if (baselineRows) {
            const threshold = Number(profileThresholdPct ?? 5);
            const comparison = compareGasAgainstBaseline(rows, baselineRows, threshold);
            process.stdout.write(`${formatGasRegressionSummary(comparison, top)}\n`);

            if ((profileFailOnRegression ?? true) && comparison.regressions.length > 0) {
              throw new Error(
                `Gas regression detected: ${comparison.regressions.length} tests exceeded ${threshold}% threshold`
              );
            }
          }

          if (updateProfileBaseline) {
            writeGasProfileReport(profileBaseline, report);
            console.log(chalk.green(`Gas baseline updated: ${profileBaseline}`));
          }
        }
      }
    } catch (error: any) {
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
