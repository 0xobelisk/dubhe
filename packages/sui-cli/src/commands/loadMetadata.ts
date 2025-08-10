import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { loadMetadataHandler } from '../utils/metadataHandler';
import { handlerExit } from './shell';
import { getDefaultNetwork } from '../utils';
import chalk from 'chalk';

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
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
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
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
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
