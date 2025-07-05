import { Dubhe, getDefaultURL, Network, NetworkType } from '@0xobelisk/aptos-client';
import { delay } from './utils';
import chalk from 'chalk';
import { DubheCliError } from './errors';

export async function requestFaucet(network: NetworkType, accountAddress: string, amount?: number) {
  try {
    console.log('network', network);
    const dubhe = new Dubhe({
      networkType: network
    });

    const response = await dubhe.requestFaucet(accountAddress, amount);
    console.log(chalk.green(`Faucet request successful! ${response.hash}`));
  } catch (err) {
    throw new DubheCliError(`Failed to fund token with faucet: ${err}`);
  }
}

export async function getBalance(network: NetworkType, accountAddress: string) {
  try {
    const client = new Dubhe({
      networkType: network as NetworkType
    });
    const balance = await client.getBalance(accountAddress);
    return BigInt(balance);
  } catch (err) {
    console.warn(`Failed to get balance with AptosClient: ${err}`);
  }
}
