import { CommandModule } from 'yargs';
import { logError, initializeDubhe, getDefaultNetwork } from '../utils';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { handlerExit } from './shell';
dotenv.config();

type Options = {
  network: any;
  'rpc-url'?: string;
};

const InfoCommand: CommandModule<Options, Options> = {
  command: 'info',
  describe: 'Get information about the current Sui node',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Custom RPC endpoint URL (overrides the default for the selected network)'
      }
    });
  },
  handler: async ({ network, 'rpc-url': rpcUrl }) => {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }
      const fullnodeUrls = rpcUrl ? [rpcUrl] : undefined;
      const dubhe = initializeDubhe({ network, fullnodeUrls });
      const keypair = dubhe.getSigner();

      console.log(chalk.blue('Account Information:'));
      console.log(`  Network: ${chalk.green(network)}`);
      console.log(`  Address: ${chalk.green(keypair.toSuiAddress())}`);

      try {
        const balance = await dubhe.getBalance('0x2::sui::SUI');
        const suiBalance = (Number(balance.totalBalance) / 10 ** 9).toFixed(4);
        console.log(`  Balance: ${chalk.green(suiBalance)} SUI`);
      } catch (_error) {
        console.log(
          `  Balance: ${chalk.red('Failed to fetch balance')} ${chalk.gray('(Network error)')}`
        );
      }
      handlerExit();
    } catch (error) {
      logError(error);
      handlerExit(1);
    }
  }
};

export default InfoCommand;
