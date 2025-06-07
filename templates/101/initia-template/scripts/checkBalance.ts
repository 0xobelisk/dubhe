import { Dubhe, NetworkType } from '@0xobelisk/initia-client';
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

    const dubhe = new Dubhe({
      secretKey: process.env.PRIVATE_KEY,
      networkType: network as NetworkType,
    });

    const balance = await dubhe.getBalance();
    if (balance.amount === '0') {
      console.log(chalk.yellow(`Account balance is 0, need to get ${network} coins`));
      process.exit(1);
    }

    console.log(chalk.green(`Current account balance: ${(Number(balance) / 100_000_000).toFixed(4)} INIT`));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Failed to check balance:', error));
    process.exit(1);
  }
}

checkBalance(process.argv[2] as NetworkType);
