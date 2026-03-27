import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import {
  InvariantCorpus,
  computeFailureRate,
  createEmptyInvariantCorpus,
  FuzzRunResult,
  formatFuzzSummary,
  generateFuzzSeeds,
  generateShrinkCandidateSeeds,
  mergeInvariantCorpus,
  mergeSeedQueues,
  parseInvariantCorpus
} from './qualityUtils';

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
  shrink?: boolean;
  'shrink-window'?: number;
  'shrink-floor'?: number;
  'minimize-attempts'?: number;
  'minimize-tail-window'?: number;
  'corpus-path'?: string;
  'use-corpus'?: boolean;
  'update-corpus'?: boolean;
  'report-out'?: string;
  trace?: boolean;
  debug?: boolean;
};

function runSeededInvariant(
  seed: number,
  baseArgs: string[],
  debug: boolean | undefined
): FuzzRunResult {
  const cmd = [...baseArgs, `--seed ${seed}`].join(' ');
  if (debug) {
    console.log(chalk.gray(`[debug] ${cmd}`));
  } else {
    console.log(chalk.gray(`Running seed=${seed} ...`));
  }

  const start = Date.now();
  try {
    const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    return {
      seed,
      ok: true,
      durationMs: Date.now() - start,
      output
    };
  } catch (error: any) {
    const combinedOutput = `${error?.stdout || ''}${error?.stderr || ''}`;
    return {
      seed,
      ok: false,
      durationMs: Date.now() - start,
      output: combinedOutput,
      error: error?.message || 'unknown error'
    };
  }
}

function readInvariantCorpus(corpusPath: string): InvariantCorpus {
  if (!fs.existsSync(corpusPath)) return createEmptyInvariantCorpus();
  try {
    return parseInvariantCorpus(fs.readFileSync(corpusPath, 'utf-8'));
  } catch {
    return createEmptyInvariantCorpus();
  }
}

function writeInvariantCorpus(corpusPath: string, corpus: InvariantCorpus): void {
  fs.mkdirSync(path.dirname(corpusPath), { recursive: true });
  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2), 'utf-8');
}

function minimizeFailingSeed(
  initialFailingSeed: number,
  floorSeed: number,
  maxAttempts: number,
  tailWindow: number,
  runCandidate: (seed: number) => FuzzRunResult
): { minimalFailingSeed: number; results: FuzzRunResult[] } {
  let minimalFailingSeed = initialFailingSeed;
  const results: FuzzRunResult[] = [];
  const seen = new Set<number>();
  let attempts = 0;
  let step = Math.max(1, Math.floor((minimalFailingSeed - floorSeed) / 2));

  while (step >= 1 && attempts < maxAttempts && minimalFailingSeed > floorSeed) {
    const candidate = minimalFailingSeed - step;
    if (candidate < floorSeed || seen.has(candidate)) {
      step = Math.floor(step / 2);
      continue;
    }

    seen.add(candidate);
    const result = runCandidate(candidate);
    results.push(result);
    attempts += 1;

    if (!result.ok) {
      minimalFailingSeed = candidate;
      continue;
    }
    step = Math.floor(step / 2);
  }

  let tailSeed = minimalFailingSeed - 1;
  let tailAttempts = 0;
  while (
    tailSeed >= floorSeed &&
    attempts < maxAttempts &&
    tailAttempts < Math.max(0, Math.floor(tailWindow))
  ) {
    if (!seen.has(tailSeed)) {
      seen.add(tailSeed);
      const result = runCandidate(tailSeed);
      results.push(result);
      attempts += 1;
      if (!result.ok) {
        minimalFailingSeed = tailSeed;
      }
    }
    tailSeed -= 1;
    tailAttempts += 1;
  }

  return {
    minimalFailingSeed,
    results
  };
}

const commandModule: CommandModule<Options, Options> = {
  command: 'invariant',
  describe:
    'Run seeded invariant loops with corpus replay and best-effort failing-seed minimization',
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
        default: 30,
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
        default: 200,
        desc: 'Reserved for future rand mode (ignored in seeded mode)'
      },
      'stop-on-fail': {
        type: 'boolean',
        default: true,
        desc: 'Stop primary loop at first failure before shrink phase'
      },
      shrink: {
        type: 'boolean',
        default: true,
        desc: 'Try lower seeds near first failing seed to find a smaller reproducible case'
      },
      'shrink-window': {
        type: 'number',
        default: 128,
        desc: 'How many lower seeds to probe during shrink phase'
      },
      'shrink-floor': {
        type: 'number',
        default: 0,
        desc: 'Do not try shrink seeds below this value'
      },
      'minimize-attempts': {
        type: 'number',
        default: 64,
        desc: 'Max attempts in minimization phase'
      },
      'minimize-tail-window': {
        type: 'number',
        default: 32,
        desc: 'Linear tail scan window after adaptive minimization'
      },
      'corpus-path': {
        type: 'string',
        default: '.reports/move/invariant-corpus.json',
        desc: 'Invariant corpus file path (failing/minimized seeds)'
      },
      'use-corpus': {
        type: 'boolean',
        default: true,
        desc: 'Replay known flaky seeds from corpus before generated seed loop'
      },
      'update-corpus': {
        type: 'boolean',
        default: true,
        desc: 'Update corpus with failing/minimized seeds from this run'
      },
      'report-out': {
        type: 'string',
        desc: 'Write json invariant report to file'
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
    shrink,
    'shrink-window': shrinkWindow,
    'shrink-floor': shrinkFloor,
    'minimize-attempts': minimizeAttempts,
    'minimize-tail-window': minimizeTailWindow,
    'corpus-path': corpusPath,
    'use-corpus': useCorpus,
    'update-corpus': updateCorpus,
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
      const filterArg = filter ? ` ${filter}` : '';
      const traceArg = trace ? '--trace' : '';
      const generatedSeeds = generateFuzzSeeds(iterations ?? 30, baseSeed, replaySeed);
      const seedAndRandItersConflict = typeof randNumIters === 'number' && randNumIters > 0;
      const resolvedCorpusPath = corpusPath || '.reports/move/invariant-corpus.json';
      const corpus = useCorpus
        ? readInvariantCorpus(resolvedCorpusPath)
        : createEmptyInvariantCorpus();
      const corpusReplaySeeds =
        typeof replaySeed === 'number'
          ? []
          : mergeSeedQueues(corpus.minimalFailingSeeds, corpus.failingSeeds).slice(-128);
      const seeds = mergeSeedQueues(corpusReplaySeeds, generatedSeeds);
      const baseArgs = [
        'sui move test',
        buildEnv ? `--build-env ${buildEnv}` : '',
        `--path ${projectPath}`,
        `--gas-limit ${gasLimit}`,
        traceArg,
        filterArg
      ].filter(Boolean);

      console.log(chalk.blue(`Invariant seeds: ${seeds.join(', ')}`));
      if (corpusReplaySeeds.length > 0) {
        console.log(
          chalk.blue(`Loaded ${corpusReplaySeeds.length} corpus seeds from ${resolvedCorpusPath}`)
        );
      }
      if (seedAndRandItersConflict) {
        console.log(
          chalk.yellow(
            'Current Sui CLI forbids using --seed with --rand-num-iters together; running seeded invariant mode without --rand-num-iters'
          )
        );
      }

      const primaryResults: FuzzRunResult[] = [];
      for (const seed of seeds) {
        const result = runSeededInvariant(seed, baseArgs, debug);
        primaryResults.push(result);

        if (!result.ok) {
          process.stdout.write(result.output);
          console.error(chalk.red(`\nInvariant failure seed=${seed}`));
          if (stopOnFail ?? true) break;
        }
      }

      const failingSeed = primaryResults.find((item) => !item.ok)?.seed;
      let minimalFailingSeed = failingSeed;
      const shrinkResults: FuzzRunResult[] = [];
      const minimizationResults: FuzzRunResult[] = [];

      if (failingSeed != null && (shrink ?? true)) {
        const floorSeed = Math.max(0, Math.floor(shrinkFloor ?? 0));
        const shrinkSeeds = generateShrinkCandidateSeeds(
          failingSeed,
          shrinkWindow ?? 128,
          floorSeed
        );
        if (shrinkSeeds.length > 0) {
          console.log(
            chalk.blue(
              `\nShrink phase: probing ${shrinkSeeds.length} seeds below first failure (${failingSeed})`
            )
          );
        }

        for (const candidateSeed of shrinkSeeds) {
          const result = runSeededInvariant(candidateSeed, baseArgs, debug);
          shrinkResults.push(result);
          if (!result.ok) {
            minimalFailingSeed = candidateSeed;
          }
        }

        if (minimalFailingSeed != null) {
          const minimizeResult = minimizeFailingSeed(
            minimalFailingSeed,
            floorSeed,
            Math.max(1, Math.floor(minimizeAttempts ?? 64)),
            Math.max(0, Math.floor(minimizeTailWindow ?? 32)),
            (seed) => runSeededInvariant(seed, baseArgs, debug)
          );
          minimizationResults.push(...minimizeResult.results);
          minimalFailingSeed = minimizeResult.minimalFailingSeed;
        }
      }

      process.stdout.write(`${formatFuzzSummary(primaryResults)}\n`);
      if (shrinkResults.length > 0) {
        process.stdout.write(`${formatFuzzSummary(shrinkResults)}\n`);
      }
      if (minimizationResults.length > 0) {
        process.stdout.write(`${formatFuzzSummary(minimizationResults)}\n`);
      }

      if (minimalFailingSeed != null) {
        const repro = `dubhe invariant --config-path ${configPath} --replay-seed ${minimalFailingSeed}${
          filter ? ` --filter ${filter}` : ''
        }`;
        console.error(chalk.red(`Minimal failing seed in window: ${minimalFailingSeed}`));
        console.error(chalk.yellow(`Repro: ${repro}`));
      }

      const allResults = [...primaryResults, ...shrinkResults, ...minimizationResults];
      const failedSeeds = allResults.filter((item) => !item.ok).map((item) => item.seed);
      const failureRate = computeFailureRate(allResults);

      if (updateCorpus ?? true) {
        const updatedCorpus = mergeInvariantCorpus(corpus, failedSeeds, minimalFailingSeed);
        writeInvariantCorpus(resolvedCorpusPath, updatedCorpus);
        console.log(chalk.green(`Invariant corpus updated: ${resolvedCorpusPath}`));
      }

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
              primaryResults,
              shrinkEnabled: shrink ?? true,
              shrinkWindow: shrinkWindow ?? 128,
              shrinkFloor: shrinkFloor ?? 0,
              shrinkResults,
              minimizationAttempts: minimizeAttempts ?? 64,
              minimizationTailWindow: minimizeTailWindow ?? 32,
              minimizationResults,
              corpusPath: resolvedCorpusPath,
              corpusReplaySeeds,
              firstFailingSeed: failingSeed,
              minimalFailingSeed,
              failureRate
            },
            null,
            2
          ),
          'utf-8'
        );
        console.log(chalk.green(`Invariant report written to: ${reportOut}`));
      }

      if (minimalFailingSeed != null) {
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
