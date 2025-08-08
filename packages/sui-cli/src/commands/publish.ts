import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { getDefaultNetwork, publishHandler } from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { execSync } from 'child_process';
import chalk from 'chalk';

type Options = {
  network: any;
  'config-path': string;
  force: boolean;
  'gas-budget'?: number;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'publish',

  describe: 'Publish dubhe move contract',

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
        default: 'dubhe.config.ts',
        desc: 'Configuration file path'
      },
      'gas-budget': {
        type: 'number',
        desc: 'Optional gas budget for the transaction',
        optional: true
      },
      force: {
        type: 'boolean',
        default: true,
        desc: 'Force publish: do not update dependencies'
      }
    });
  },

  async handler({ network, 'config-path': configPath, 'gas-budget': gasBudget, force }) {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      execSync(`pnpm dubhe convert-json --config-path ${configPath}`, { encoding: 'utf-8' });
      await publishHandler(dubheConfig, network, force, gasBudget);
    } catch (error: any) {
      logError(error);
      process.exit(1);
    }
    process.exit(0);
  }
};

export default commandModule;
