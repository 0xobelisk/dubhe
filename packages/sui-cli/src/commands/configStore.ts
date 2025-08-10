import type { CommandModule } from 'yargs';
import { storeConfigHandler } from '../utils/storeConfig';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import chalk from 'chalk';
import { getDefaultNetwork } from '../utils';

type Options = {
  'config-path': string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
  'output-ts-path': string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'config-store',

  describe: 'Store configuration for the Dubhe project',

  builder: {
    'config-path': {
      type: 'string',
      default: 'dubhe.config.ts',
      desc: 'Path to the config file'
    },
    network: {
      type: 'string',
      choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
      default: 'default',
      desc: 'Network to store config for'
    },
    'output-ts-path': {
      type: 'string',
      desc: 'Specify the output path for the generated TypeScript configuration file (e.g., ./src/config/generated.ts)'
    }
  },
  async handler({ 'config-path': configPath, network, 'output-ts-path': outputTsPath }) {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      await storeConfigHandler(dubheConfig, network, outputTsPath);
    } catch (error) {
      console.error('Error storing config:', error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
