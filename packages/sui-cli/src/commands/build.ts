import type { CommandModule } from 'yargs';
import { execSync, exec } from 'child_process';
import nodePath from 'path';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import { getDefaultNetwork, switchEnv } from '../utils';

type Options = {
  'config-path': string;
  network: any;
  'dump-bytecode-as-base64'?: boolean;
};

/**
 * Core build logic for Dubhe contracts.
 *
 * - localnet: uses --build-env testnet + --pubfile-path Pub.localnet.toml so that
 *   dependency addresses are resolved through the ephemeral publication file created
 *   by publishHandler. Counter can only be built after dubhe is published on localnet.
 * - Other networks: uses -e <network> (standard Sui CLI environment flag).
 */
export async function buildHandler(
  dubheConfig: DubheConfig,
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  dumpBytecodeAsBase64: boolean = false
): Promise<string> {
  const cwd = process.cwd();
  const projectPath = nodePath.join(cwd, 'src', dubheConfig.name);

  let command: string;
  if (network === 'localnet') {
    const pubfilePath = nodePath.join(cwd, 'Pub.localnet.toml');
    command = `sui move build --build-env testnet --pubfile-path ${pubfilePath} --path ${projectPath}`;
  } else {
    command = `sui move build -e ${network} --path ${projectPath}`;
  }

  if (dumpBytecodeAsBase64) command += ' --dump-bytecode-as-base64';

  return execSync(command, { encoding: 'utf-8' });
}

const commandModule: CommandModule<Options, Options> = {
  command: 'build',
  describe: 'Build Dubhe contracts',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Path to the Dubhe config file'
      },
      network: {
        type: 'string',
        default: 'default',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'dump-bytecode-as-base64': {
        type: 'boolean',
        default: false,
        desc: 'Dump bytecode as base64'
      }
    });
  },

  async handler({
    'config-path': configPath,
    network,
    'dump-bytecode-as-base64': dumpBytecodeAsBase64
  }) {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      console.log('🚀 Running move build');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      await switchEnv(network);
      const output = await buildHandler(dubheConfig, network, dumpBytecodeAsBase64);
      console.log(output);
      exec(`pnpm dubhe convert-json --config-path ${configPath}`);
    } catch (error: any) {
      console.error(chalk.red('Error executing sui move build:'));
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
    }
  }
};

export default commandModule;
