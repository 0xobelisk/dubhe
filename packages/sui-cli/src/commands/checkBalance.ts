import type { CommandModule } from 'yargs';
import { checkBalanceHandler } from '../utils/checkBalance';
import { handlerExit } from './shell';
import chalk from 'chalk';
import { getDefaultNetwork } from '../utils';

type Options = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
  'rpc-url'?: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'check-balance',
  describe: 'Check the balance of the account',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        desc: 'Network to check balance on',
        default: 'default'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Custom RPC endpoint URL (overrides the default for the selected network)'
      }
    }) as any;
  },
  async handler({ network, 'rpc-url': rpcUrl }) {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const fullnodeUrls = rpcUrl ? [rpcUrl] : undefined;
      await checkBalanceHandler(network, fullnodeUrls);
    } catch (error) {
      console.error('Error checking balance:', error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
