import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { publishHandler } from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { execSync } from 'child_process';
import { handlerExit } from './shell';

type Options = {
  network: any;
  'config-path': string;
  'gas-budget'?: number;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'publish',

  describe: 'Publish dubhe move contract',

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
        default: 'dubhe.config.ts',
        desc: 'Configuration file path'
      },
      'gas-budget': {
        type: 'number',
        desc: 'Optional gas budget for the transaction',
        optional: true
      }
    });
  },

  async handler({ network, 'config-path': configPath, 'gas-budget': gasBudget }) {
    try {
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      execSync(`pnpm dubhe convert-json --config-path ${configPath}`, { encoding: 'utf-8' });
      await publishHandler(dubheConfig, network, gasBudget);
    } catch (error: any) {
      logError(error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
