import type { CommandModule } from 'yargs';
import { codegen, loadConfig, DubheConfig } from '@0xobelisk/sui-common';
import chalk from 'chalk';
import path from 'node:path';
import { handlerExit } from './shell';
import { getDefaultNetwork } from '../utils';

type Options = {
  'config-path'?: string;
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
  mode?: 'user_pays' | 'dapp_subsidizes';
};

const commandModule: CommandModule<Options, Options> = {
  // 'schemagen' kept as a deprecated alias for backward compatibility
  command: 'generate|schemagen',

  describe: 'Generate Move code from dubhe.config.ts',

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
    },
    mode: {
      type: 'string',
      choices: ['user_pays', 'dapp_subsidizes'] as const,
      default: 'user_pays',
      desc: 'Initial settlement mode for this DApp (only applies on first generate)'
    }
  },

  async handler({ 'config-path': configPath, network, mode }) {
    try {
      if (!configPath) throw new Error('Config path is required');
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const rootDir = path.dirname(configPath);
      const initialMode: 0 | 1 = mode === 'dapp_subsidizes' ? 0 : 1;
      await codegen(rootDir, dubheConfig, network, initialMode);
      handlerExit();
    } catch (error: any) {
      console.log(chalk.red('Generate failed!'));
      console.error(error.message);
      handlerExit(1);
    }
  }
};

export default commandModule;
