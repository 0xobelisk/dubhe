// import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { CommandModule } from 'yargs';
import { logError, validatePrivateKey } from '../utils';
import dotenv from 'dotenv';
import { Dubhe } from '@0xobelisk/sui-client';
import chalk from 'chalk';
dotenv.config();

type Options = {
  network: string;
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
      console.log('current network:', chalk.green(network));
      const privateKey = process.env.PRIVATE_KEY;
      // console.log('privateKey', privateKey);
      if (!privateKey) {
        throw new Error('PRIVATE_KEY is not set');
      }

      if (!validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key');
      }

      const dubhe = new Dubhe({ secretKey: privateKey });
      const keypair = dubhe.getSigner();

      console.log('deployer address:', chalk.green(keypair.toSuiAddress()));

      const balance = await dubhe.getBalance('0x2::sui::SUI');
      console.log('balance:', chalk.green(Number(balance.totalBalance) / 10 ** 9), 'SUI');
    } catch (error) {
      logError(error);
      process.exit(1);
    }
  }
};

export default InfoCommand;
