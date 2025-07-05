import type { CommandModule } from 'yargs';
import { execSync, exec } from 'child_process';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { switchEnv, updateDubheDependency } from '../utils';

type Options = {
  'config-path': string;
  network: any;
  'dump-bytecode-as-base64'?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'build',
  describe: 'Run tests in Dubhe contracts',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Options to pass to forge test'
      },
      network: {
        type: 'string',
        default: 'localnet',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
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
    // Start an internal anvil process if no world address is provided
    try {
      console.log('🚀 Running move build');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const path = process.cwd();
      const projectPath = `${path}/src/${dubheConfig.name}`;
      await switchEnv(network);
      await updateDubheDependency(projectPath + '/Move.toml', network);
      const command = `sui move build --path ${projectPath} ${
        dumpBytecodeAsBase64 ? ` --dump-bytecode-as-base64` : ''
      }`;
      const output = execSync(command, { encoding: 'utf-8' });
      console.log(output);
      exec(`pnpm dubhe convert-json --config-path ${configPath}`)
    } catch (error: any) {
      console.error(chalk.red('Error executing sui move build:'));
      console.log(error.stdout);
      process.exit(0);
    }
  }
};

export default commandModule;
