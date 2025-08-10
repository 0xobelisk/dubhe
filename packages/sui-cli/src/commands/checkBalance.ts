import type { CommandModule } from 'yargs';
import { checkBalanceHandler } from '../utils/checkBalance';
import { handlerExit } from './shell';
import chalk from 'chalk';
import { getDefaultNetwork } from '../utils';

type Options = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
};

const commandModule: CommandModule<Options, Options> = {
  command: 'check-balance',
  describe: 'Check the balance of the account',
  builder: {
    network: {
      type: 'string',
      choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
      desc: 'Network to check balance on',
      default: 'default'
    }
  },
  async handler({ network }) {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      await checkBalanceHandler(network);
    } catch (error) {
      console.error('Error checking balance:', error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
