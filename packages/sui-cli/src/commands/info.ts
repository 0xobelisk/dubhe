import { CommandModule } from 'yargs';
import { logError, initializeDubhe } from '../utils';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { handlerExit } from './shell';
dotenv.config();

type Options = {
  network: any;
};

const InfoCommand: CommandModule<Options, Options> = {
  command: 'info',
  describe: 'Get information about the current Sui node',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
        default: 'localnet',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      }
    });
  },
  handler: async ({ network }) => {
    try {
      const dubhe = initializeDubhe({ network });
      const keypair = dubhe.getSigner();

      console.log(chalk.blue('Account Information:'));
      console.log(`  Network: ${chalk.green(network)}`);
      console.log(`  Address: ${chalk.green(keypair.toSuiAddress())}`);

      try {
        const balance = await dubhe.getBalance('0x2::sui::SUI');
        const suiBalance = (Number(balance.totalBalance) / 10 ** 9).toFixed(4);
        console.log(`  Balance: ${chalk.green(suiBalance)} SUI`);
      } catch (error) {
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
