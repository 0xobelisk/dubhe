import fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { Dubhe, NetworkType } from '@0xobelisk/rooch-client';

import { DubheCliError } from './errors';
import { saveContractData, validatePrivateKey } from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';

export async function publishHandler(
  dubheConfig: DubheConfig,
  network: NetworkType,
  namedAddresses?: Array<{ name: string; address: string }>
) {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey)
    throw new DubheCliError(
      `Missing PRIVATE_KEY environment variable.
  Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
  in your contracts directory to use the default aptos private key.`
    );

  const privateKeyFormat = validatePrivateKey(privateKey);
  if (privateKeyFormat === false) {
    throw new DubheCliError(`Please check your privateKey.`);
  }

  const client = new Dubhe({
    networkType: network,
    secretKey: privateKeyFormat
  });

  if (namedAddresses === undefined) {
    namedAddresses = [{ name: dubheConfig.name, address: client.getHexAddress() }];
  } else {
    const existingProjectAddress = namedAddresses.find((item) => item.name === dubheConfig.name);
    if (!existingProjectAddress) {
      namedAddresses.push({
        name: dubheConfig.name,
        address: client.getHexAddress()
      });
    }
  }
  const addressArg = namedAddresses.map(({ name, address }) => `${name}=${address}`).join(' ');

  const path = process.cwd();
  try {
    execSync(
      `rooch move build --named-addresses ${addressArg} --json -p ${path}/contracts/${dubheConfig.name}`,
      {
        encoding: 'utf-8'
      }
    );
  } catch (error: any) {
    console.error(chalk.red('Error executing rooch move build:'));
    console.error(error);
    process.exit(1);
  }

  let packageId = '';
  let version = 0;

  try {
    const packageBytes = fs.readFileSync(
      `${path}/contracts/${dubheConfig.name}/build/${dubheConfig.name}/package.rpd`
    );

    const response = await client.publishPackage({
      packageBytes
    });
    if (response.execution_info.status.type !== 'executed') {
      throw new DubheCliError(`Publish failed: ${response.error_info}`);
    }

    packageId = client.getHexAddress();
    version = 1;
    const txHash = response.execution_info.tx_hash;
    console.log(chalk.blue(`${dubheConfig.name} PackageId: ${packageId}`));
    saveContractData(dubheConfig.name, network, packageId, version);
    console.log(chalk.green(`Publish Transaction Digest: ${txHash}`));
  } catch (error: any) {
    console.error(chalk.red(`Failed to execute publish, please republish`));
    console.error(error.message);
    process.exit(1);
  }
}
