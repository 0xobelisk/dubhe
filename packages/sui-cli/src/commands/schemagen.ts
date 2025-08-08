import type { CommandModule } from 'yargs';
import { schemaGen, loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import chalk from 'chalk';
import path from 'node:path';
import { getDefaultNetwork } from '../utils';

type Options = {
  'config-path'?: string;
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
};

const commandModule: CommandModule<Options, Options> = {
  command: 'schemagen',

  describe: 'Autogenerate Dubhe schemas based on the config file',

  builder: {
    'config-path': {
      type: 'string',
      default: 'dubhe.config.ts',
      desc: 'Path to the config file'
    },
    network: {
      type: 'string',
      choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'] as const,
      default: 'default',
      desc: 'Node network (mainnet/testnet/devnet/localnet)'
    }
  },

  async handler({ 'config-path': configPath, network }) {
    try {
      if (!configPath) throw new Error('Config path is required');
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const rootDir = path.dirname(configPath);
      await schemaGen(rootDir, dubheConfig, network);
      process.exit(0);
    } catch (error: any) {
      console.log(chalk.red('Schemagen failed!'));
      console.error(error.message);
    }
  }
};

export default commandModule;
