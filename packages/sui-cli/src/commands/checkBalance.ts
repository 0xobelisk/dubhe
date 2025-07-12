import type { CommandModule } from 'yargs';
import { checkBalanceHandler } from '../utils/checkBalance';
import { handler_exit } from './shell';

type Options = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
};

const commandModule: CommandModule<Options, Options> = {
  command: 'check-balance',
  describe: 'Check the balance of the account',
  builder: {
    network: {
      type: 'string',
      choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
      desc: 'Network to check balance on',
      default: 'localnet'
    }
  },
  async handler({ network }) {
    try {
      await checkBalanceHandler(network);
    } catch (error) {
      console.error('Error checking balance:', error);
      handler_exit(1);
    }
    handler_exit();
  }
};

export default commandModule;
