import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import {
  getDefaultNetwork,
  publishHandler,
  lintSystemGuards,
  formatLintWarnings,
  confirm
} from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import { execSync } from 'child_process';
import { join as pathJoin } from 'path';
import { handlerExit } from './shell';
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
        default: false,
        desc: 'Clear existing published state for this network before build (use when re-publishing or to fix PublishErrorNonZeroAddress)'
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

      const projectPath = pathJoin(process.cwd(), 'src', dubheConfig.name);
      const lintResults = lintSystemGuards(projectPath);
      if (lintResults.length > 0) {
        process.stdout.write(formatLintWarnings(lintResults));
        const proceed = await confirm(
          'Some entry functions are missing ensure_latest_version. Proceed with publish anyway?'
        );
        if (!proceed) {
          console.log(chalk.red('Publish cancelled.'));
          handlerExit(1);
          return;
        }
      }

      execSync(`pnpm dubhe convert-json --config-path ${configPath}`, { encoding: 'utf-8' });
      await publishHandler(dubheConfig, network, force, gasBudget);
    } catch (error: any) {
      logError(error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
