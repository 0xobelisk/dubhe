import { Obelisk, NetworkType } from '@0xobelisk/sui-client';
import chalk from 'chalk';
import dotenv from 'dotenv';
dotenv.config();

async function checkBalance(network: string) {
  try {
    if (!process.env.PRIVATE_KEY) {
      console.error(chalk.red('Please set the PRIVATE_KEY environment variable'));
      process.exit(1);
    }

    if (!network) {
      console.error(chalk.red('Network parameter is missing'));
      process.exit(1);
    }

    const obelisk = new Obelisk({
      secretKey: process.env.PRIVATE_KEY,
      networkType: network as NetworkType,
    });

    const balance = await obelisk.getBalance();

    if (balance.totalBalance === '0') {
      console.log(chalk.yellow(`Account balance is 0, need to get ${network} coins`));
      process.exit(1);
    }

    console.log(
      chalk.green(`Current account balance: ${(Number(balance.totalBalance) / 1_000_000_000).toFixed(4)} SUI`),
    );
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Failed to check balance:', error));
    process.exit(1);
  }
}

checkBalance(process.argv[2] as NetworkType);
