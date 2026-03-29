import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import { parseMoveCoveragePercent } from './qualityUtils';

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
  'threshold-pct'?: number;
  'lcov-out'?: string;
  'summary-out'?: string;
  'source-module'?: string;
  debug?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'coverage',
  describe: 'Run Move coverage and enforce coverage threshold gates',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Path to the Dubhe config file'
      },
      filter: {
        type: 'string',
        desc: 'Optional test filter (module/function substring)'
      },
      'gas-limit': {
        type: 'string',
        default: '500000000',
        desc: 'Gas limit for test run'
      },
      'threshold-pct': {
        type: 'number',
        desc: 'Fail if total Move coverage is below this percentage'
      },
      'lcov-out': {
        type: 'string',
        default: '.reports/move/lcov.info',
        desc: 'Output path for lcov info'
      },
      'summary-out': {
        type: 'string',
        desc: 'Output path for raw coverage summary text'
      },
      'source-module': {
        type: 'string',
        desc: 'Print source-level coverage for a specific module'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print debug command details'
      }
    });
  },
  async handler({
    'config-path': configPath,
    filter,
    'gas-limit': gasLimit,
    'threshold-pct': thresholdPct,
    'lcov-out': lcovOut,
    'summary-out': summaryOut,
    'source-module': sourceModule,
    debug
  }) {
    try {
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const cwd = process.cwd();
      const projectPath = path.join(cwd, 'src', dubheConfig.name);

      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;
      const buildEnvArg = buildEnv ? `--build-env ${buildEnv}` : '';
      const filterArg = filter ? ` ${filter}` : '';

      const testCmd = `sui move test ${buildEnvArg} --path ${projectPath} --coverage --trace --gas-limit ${gasLimit}${filterArg}`;
      if (debug) console.log(chalk.gray(`[debug] ${testCmd}`));
      process.stdout.write(execSync(testCmd, { stdio: 'pipe', encoding: 'utf-8' }));

      const summaryCmd = `sui move coverage summary ${buildEnvArg} --path ${projectPath}`;
      if (debug) console.log(chalk.gray(`[debug] ${summaryCmd}`));
      const summaryOutput = execSync(summaryCmd, { stdio: 'pipe', encoding: 'utf-8' });
      process.stdout.write(summaryOutput);

      if (summaryOut) {
        fs.mkdirSync(path.dirname(summaryOut), { recursive: true });
        fs.writeFileSync(summaryOut, summaryOutput, 'utf-8');
        console.log(chalk.green(`Coverage summary written to: ${summaryOut}`));
      }

      const coveragePct = parseMoveCoveragePercent(summaryOutput);
      if (coveragePct == null) {
        throw new Error('Failed to parse "% Move Coverage" from coverage summary output');
      }
      console.log(chalk.blue(`Parsed total Move coverage: ${coveragePct.toFixed(2)}%`));

      if (typeof thresholdPct === 'number' && coveragePct < thresholdPct) {
        throw new Error(
          `Coverage gate failed: ${coveragePct.toFixed(2)}% < threshold ${thresholdPct.toFixed(2)}%`
        );
      }

      const lcovCmd = `sui move coverage lcov ${buildEnvArg} --path ${projectPath}`;
      if (debug) console.log(chalk.gray(`[debug] ${lcovCmd}`));
      execSync(lcovCmd, { stdio: 'pipe', encoding: 'utf-8' });

      const generatedLcovPath = path.join(projectPath, 'lcov.info');
      if (!fs.existsSync(generatedLcovPath)) {
        throw new Error(`Expected lcov output was not generated: ${generatedLcovPath}`);
      }

      const lcovTarget = lcovOut || '.reports/move/lcov.info';
      fs.mkdirSync(path.dirname(lcovTarget), { recursive: true });
      fs.copyFileSync(generatedLcovPath, lcovTarget);
      console.log(chalk.green(`Coverage lcov written to: ${lcovTarget}`));

      if (sourceModule) {
        const sourceCmd = `sui move coverage source ${buildEnvArg} --path ${projectPath} --module ${sourceModule}`;
        if (debug) console.log(chalk.gray(`[debug] ${sourceCmd}`));
        const sourceOut = execSync(sourceCmd, { stdio: 'pipe', encoding: 'utf-8' });
        process.stdout.write(sourceOut);
      }
    } catch (error: any) {
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
      return;
    }
    handlerExit();
  }
};

export default commandModule;
