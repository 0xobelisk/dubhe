import type { CommandModule } from 'yargs';
import { Dubhe } from '@0xobelisk/initia-client';
import { validatePrivateKey, DubheCliError, delay } from '../utils';

type Options = {
  network: any;
  recipient?: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'faucet',

  describe: 'Interact with a Dubhe faucet',

  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        desc: 'URL of the Dubhe faucet',
        choices: ['testnet', 'devnet', 'localnet'],
        default: 'localnet'
      },
      recipient: {
        type: 'string',
        desc: 'Initia address to fund'
      }
    });
  },

  async handler({ network, recipient }) {
    let faucet_address = '';
    if (recipient === undefined) {
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey)
        throw new DubheCliError(
          `Missing PRIVATE_KEY environment variable.
    Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
    in your contracts directory to use the default initia private key.`
        );

      const privateKeyFormat = validatePrivateKey(privateKey);
      if (privateKeyFormat === false) {
        throw new DubheCliError(`Please check your PRIVATE_KEY.`);
      }
      const dubhe = new Dubhe({
        secretKey: privateKeyFormat
      });
      faucet_address = dubhe.getAddress();
    } else {
      faucet_address = recipient;
    }

    console.log('\n🌊 Starting Faucet Operation...');
    console.log(`  ├─ Network: ${network}`);

    if (recipient === undefined) {
      console.log('  ├─ Using Environment PrivateKey');
      console.log(`  ├─ Generated Address: ${faucet_address}`);
    } else {
      console.log(`  ├─ Using Provided Address: ${faucet_address}`);
    }

    console.log('  ├─ Requesting funds from faucet...');
    const client = new Dubhe({
      networkType: network
    });
    await client.requestFaucet(faucet_address, 10000000, network);

    console.log('  └─ Checking balance...');
    await delay(3000);
    const balance = await client.getBalance(faucet_address);

    console.log('\n💰 Account Summary');
    console.log(`  ├─ Address: ${faucet_address}`);
    console.log(`  └─ Balance: ${(Number(balance.amount) / 1_000_000).toFixed(4)} INIT`);

    console.log('\n✅ Faucet Operation Complete\n');
    process.exit(0);
  }
};

export default commandModule;
