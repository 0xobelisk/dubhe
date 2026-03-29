import type { CommandModule } from 'yargs';

import { validatePrivateKey, DubheCliError, requestFaucet, getBalance } from '../utils';
import { Dubhe } from '@0xobelisk/aptos-client';

type Options = {
  network: any;
  recipient?: string;
  amount?: number;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'faucet',

  describe: 'Interact with a Dubhe faucet',

  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        desc: 'Network of the node (testnet/devnet/localnet/movementtestnet)',
        choices: ['testnet', 'devnet', 'localnet', 'movementtestnet']
      },
      recipient: {
        type: 'string',
        desc: 'Aptos address to fund'
      },
      amount: {
        type: 'number',
        desc: 'fund amount',
        default: 50000000
      }
    });
  },

  async handler({ network, recipient, amount }) {
    let faucet_address = '';
    if (recipient === undefined) {
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
      const dubhe = new Dubhe({
        secretKey: privateKeyFormat.toString()
      });
      faucet_address = dubhe.getAddress().toString();
    } else {
      faucet_address = recipient;
    }
    await requestFaucet(network, faucet_address, amount);

    console.log(`Account: ${faucet_address}`);
    const balance = await getBalance(network, faucet_address);
    console.log(`Balance: ${balance}`);
    process.exit(0);
  }
};

export default commandModule;
