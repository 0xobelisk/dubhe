import chalk from 'chalk';
import dotenv from 'dotenv';
import { initializeDubhe } from './utils';
import { DubheCliError } from './errors';
dotenv.config();

export async function checkBalanceHandler(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
  try {
    const dubhe = initializeDubhe({
      network
    });

    const balance = await dubhe.getBalance();
    const balanceInSUI = Number(balance.totalBalance) / 1_000_000_000;

    if (balanceInSUI === 0) {
      throw new DubheCliError(`Your account balance is 0 SUI. Please get some SUI to proceed.`);
    }

    console.log(chalk.green(`Current account balance: ${balanceInSUI.toFixed(4)} SUI`));
  } catch (error) {
    throw new DubheCliError('Failed to check balance: ' + error);
  }
}
