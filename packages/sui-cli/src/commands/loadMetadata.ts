import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { loadMetadataHandler } from '../utils/metadataHandler';
import { handlerExit } from './shell';

type Options = {
  network: any;
  'config-path': string;
  'package-id'?: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'load-metadata',

  describe: 'Load metadata for a package',

  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
        default: 'localnet',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'config-path': {
        type: 'string',
        desc: 'Configuration file path',
        default: 'dubhe.config.ts'
      },
      'package-id': {
        type: 'string',
        desc: 'Package ID to load metadata for',
        optional: true
      }
    });
  },

  async handler({ network, 'config-path': configPath, 'package-id': packageId }) {
    try {
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      await loadMetadataHandler(dubheConfig, network, packageId);
    } catch (error: any) {
      logError(error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
