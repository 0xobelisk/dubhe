import type { CommandModule } from 'yargs';
import { storeConfigHandler } from '../utils/storeConfig';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { handler_exit } from './shell';

type Options = {
  'config-path': string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
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
      choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
      desc: 'Network to store config for'
    },
    'output-ts-path': {
      type: 'string',
      desc: 'Specify the output path for the generated TypeScript configuration file (e.g., ./src/config/generated.ts)'
    }
  },
  async handler({ 'config-path': configPath, network, 'output-ts-path': outputTsPath }) {
    try {
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      await storeConfigHandler(dubheConfig, network, outputTsPath);
    } catch (error) {
      console.error('Error storing config:', error);
      handler_exit(1);
    }
    handler_exit();
  }
};

export default commandModule;
