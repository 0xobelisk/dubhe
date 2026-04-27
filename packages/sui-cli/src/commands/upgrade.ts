import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { upgradeHandler } from '../utils/upgradeHandler';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { handlerExit } from './shell';
import { getDefaultNetwork, lintSystemGuards, formatLintWarnings, confirm } from '../utils';
import { join as pathJoin } from 'path';
import chalk from 'chalk';

type Options = {
  network: any;
  'config-path': string;
  'bump-version': boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'upgrade',

  describe: 'Upgrade your move contracts',

  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Network of the node (mainnet/testnet/devnet/localnet)'
      },
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        decs: 'Path to the config file'
      },
      'bump-version': {
        type: 'boolean',
        default: false,
        desc: 'Force a version bump even when no new resources were added (use for breaking logic changes or security fixes that must invalidate old clients)'
      }
    });
  },

  async handler({ network, 'config-path': configPath, 'bump-version': bumpVersion }) {
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
          'Some entry functions are missing ensure_latest_version. Proceed with upgrade anyway?'
        );
        if (!proceed) {
          console.log(chalk.red('Upgrade cancelled.'));
          handlerExit(1);
          return;
        }
      }

      await upgradeHandler(dubheConfig, dubheConfig.name, network, bumpVersion);
    } catch (error: any) {
      logError(error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
