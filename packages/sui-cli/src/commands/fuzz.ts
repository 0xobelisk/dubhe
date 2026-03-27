import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import { FuzzRunResult, formatFuzzSummary, generateFuzzSeeds } from './qualityUtils';

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
  iterations?: number;
  'base-seed'?: number;
  'replay-seed'?: number;
  'rand-num-iters'?: number;
  'stop-on-fail'?: boolean;
  'report-out'?: string;
  trace?: boolean;
  debug?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'fuzz',
  describe: 'Run repeated seeded Move random_test executions and report flaky seeds',
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
        desc: 'Gas limit for each run'
      },
      iterations: {
        type: 'number',
        default: 20,
        desc: 'How many seeded runs to execute'
      },
      'base-seed': {
        type: 'number',
        desc: 'Base seed (run i uses base-seed+i)'
      },
      'replay-seed': {
        type: 'number',
        desc: 'Run exactly one seed to reproduce failure'
      },
      'rand-num-iters': {
        type: 'number',
        default: 50,
        desc: 'Pass-through for sui --rand-num-iters'
      },
      'stop-on-fail': {
        type: 'boolean',
        default: true,
        desc: 'Stop on first failure'
      },
      'report-out': {
        type: 'string',
        desc: 'Write json fuzz report to file'
      },
      trace: {
        type: 'boolean',
        default: false,
        desc: 'Enable Move trace output'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print debug command lines'
      }
    });
  },
  async handler({
    'config-path': configPath,
    filter,
    'gas-limit': gasLimit,
    iterations,
    'base-seed': baseSeed,
    'replay-seed': replaySeed,
    'rand-num-iters': randNumIters,
    'stop-on-fail': stopOnFail,
    'report-out': reportOut,
    trace,
    debug
  }) {
    try {
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const cwd = process.cwd();
      const projectPath = path.join(cwd, 'src', dubheConfig.name);

      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;
      const buildEnvArg = buildEnv ? `--build-env ${buildEnv}` : '';
      const traceArg = trace ? '--trace' : '';
      const filterArg = filter ? ` ${filter}` : '';

      const seeds = generateFuzzSeeds(iterations ?? 20, baseSeed, replaySeed);
      const results: FuzzRunResult[] = [];
      const seedAndRandItersConflict = typeof randNumIters === 'number' && randNumIters > 0;

      console.log(chalk.blue(`Fuzz run seeds: ${seeds.join(', ')}`));
      if (seedAndRandItersConflict) {
        console.log(
          chalk.yellow(
            'Current Sui CLI forbids using --seed with --rand-num-iters together; running seeded mode without --rand-num-iters'
          )
        );
      }
      for (const seed of seeds) {
        const cmd = `sui move test ${buildEnvArg} --path ${projectPath} --gas-limit ${gasLimit} --seed ${seed} ${traceArg}${filterArg}`;
        if (debug) {
          console.log(chalk.gray(`[debug] ${cmd}`));
        } else {
          console.log(chalk.gray(`Running seed=${seed} ...`));
        }

        const start = Date.now();
        try {
          const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
          results.push({
            seed,
            ok: true,
            durationMs: Date.now() - start,
            output
          });
        } catch (error: any) {
          const combinedOutput = `${error?.stdout || ''}${error?.stderr || ''}`;
          results.push({
            seed,
            ok: false,
            durationMs: Date.now() - start,
            output: combinedOutput,
            error: error?.message || 'unknown error'
          });

          process.stdout.write(combinedOutput);
          const repro = `dubhe fuzz --config-path ${configPath} --replay-seed ${seed}${
            filter ? ` --filter ${filter}` : ''
          }`;
          console.error(chalk.red(`\nFuzz failure seed=${seed}`));
          console.error(chalk.yellow(`Repro: ${repro}`));

          if (stopOnFail ?? true) break;
        }
      }

      const summary = formatFuzzSummary(results);
      process.stdout.write(`${summary}\n`);

      if (reportOut) {
        fs.mkdirSync(path.dirname(reportOut), { recursive: true });
        fs.writeFileSync(
          reportOut,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              configPath,
              filter,
              seeds,
              results
            },
            null,
            2
          ),
          'utf-8'
        );
        console.log(chalk.green(`Fuzz report written to: ${reportOut}`));
      }

      if (results.some((item) => !item.ok)) {
        handlerExit(1);
        return;
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
