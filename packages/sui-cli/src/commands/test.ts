import type { CommandModule } from 'yargs';
import { execFileSync, execSync } from 'child_process';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';

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

export type RunMoveTestOptions = {
  /** Substring matched against each test's fully qualified name (`addr::module::fun`). */
  filter?: string;
  'gas-limit'?: string;
  /** Same as `gas-limit` (programmatic API). */
  gasLimit?: string;
  buildEnv?: string;
  /** When true, passes `-l` to list tests instead of running them. */
  list?: boolean;
};

type CliOptions = {
  'config-path': string;
  /** Positional from `test [filter]` */
  filter?: string;
  test?: string;
  'gas-limit': string;
  list?: boolean;
};

/**
 * Builds argv for `sui move test` (argument array — no shell interpolation).
 *
 * Sui expects an optional filter as a **positional** argument at the end of the command.
 * The `--test` flag on `sui move test` is unrelated (it enables compiling the `tests/` tree).
 *
 * @see `sui move test --help`
 */
export function buildSuiMoveTestArgv(options: {
  projectPath: string;
  gasLimit: string;
  buildEnv?: string;
  filter?: string;
  list?: boolean;
}): string[] {
  const args = ['move', 'test'];
  if (options.buildEnv) {
    args.push('--build-env', options.buildEnv);
  }
  args.push('--path', options.projectPath);
  if (options.list) {
    args.push('-l');
  }
  args.push('--gas-limit', options.gasLimit);
  if (options.filter && !options.list) {
    args.push(options.filter);
  }
  return args;
}

/**
 * Core Move test runner for Dubhe contracts.
 * Runs `sui move test` against the package at `src/<dubheConfig.name>`.
 *
 * Move unit tests compile packages locally — no network or published address required.
 */
export async function testHandler(
  dubheConfig: DubheConfig,
  options: RunMoveTestOptions = {}
): Promise<string> {
  const gasLimit = options['gas-limit'] ?? options.gasLimit ?? '100000000';
  const cwd = process.cwd();
  const projectPath = `${cwd}/src/${dubheConfig.name}`;
  const argv = buildSuiMoveTestArgv({
    projectPath,
    gasLimit,
    buildEnv: options.buildEnv,
    filter: options.filter,
    list: options.list
  });
  return execFileSync('sui', argv, { stdio: 'pipe', encoding: 'utf-8' });
}

function resolveTestFilter(argv: { filter?: string; test?: string }): string | undefined {
  return argv.filter ?? argv.test;
}

const commandModule: CommandModule<CliOptions, CliOptions> = {
  command: 'test [filter]',

  describe: 'Run Move unit tests in Dubhe contracts',

  builder(yargs) {
    return yargs
      .positional('filter', {
        type: 'string',
        describe:
          'Substring of fully qualified test name (see `sui move test --help`); optional when using --list'
      })
      .options({
        'config-path': {
          type: 'string',
          default: 'dubhe.config.ts',
          description: 'Path to the Dubhe config file'
        },
        test: {
          type: 'string',
          describe: 'Same as positional [filter] (kept for backward compatibility)'
        },
        'gas-limit': {
          type: 'string',
          desc: 'Set the gas limit for the test',
          default: '100000000'
        },
        list: {
          type: 'boolean',
          default: false,
          describe: 'List all Move unit tests (`sui move test -l`)'
        }
      });
  },

  async handler(argv) {
    const { 'config-path': configPath, 'gas-limit': gasLimit, list } = argv;
    const filter = resolveTestFilter(argv);

    try {
      console.log(list ? '🚀 Listing Move unit tests' : '🚀 Running move test');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;

      const output = await testHandler(dubheConfig, {
        filter,
        'gas-limit': gasLimit,
        buildEnv,
        list
      });
      if (output) process.stdout.write(output);
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
