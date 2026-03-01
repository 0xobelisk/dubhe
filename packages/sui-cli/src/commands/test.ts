import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
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

type Options = {
  'config-path': string;
  test?: string;
  'gas-limit'?: string;
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
  buildEnv?: string
): Promise<string> {
  const cwd = process.cwd();
  const projectPath = `${cwd}/src/${dubheConfig.name}`;
  // --build-env overrides the active Sui client environment for dependency resolution.
  // Required for localnet (which is not in Move.toml [environments]) when the
  // active client env has been set to localnet from a previous run.
  const buildEnvFlag = buildEnv ? `--build-env ${buildEnv}` : '';
  const command = `sui move test ${buildEnvFlag} --path ${projectPath} ${
    test ? `--test ${test}` : ''
  } --gas-limit ${gasLimit}`;
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
      }
    });
  },

  async handler({ 'config-path': configPath, test, 'gas-limit': gasLimit }) {
    try {
      console.log('🚀 Running move test');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

      // Ephemeral networks (localnet/devnet) are not defined in Move.toml [environments].
      // Use --build-env testnet for dependency resolution so `sui move test` can resolve
      // git dependencies without requiring a localnet env entry.
      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;

      const output = await testHandler(dubheConfig, test, gasLimit, buildEnv);
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
