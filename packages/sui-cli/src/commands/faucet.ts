import { Dubhe } from '@0xobelisk/sui-client';
import type { CommandModule } from 'yargs';
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui/faucet';
import {
	SuiClient,
	getFullnodeUrl,
	GetBalanceParams,
} from '@mysten/sui/client';
import { validatePrivateKey, DubheCliError } from '../utils';

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
				default: 'localnet',
			},
			recipient: {
				type: 'string',
				desc: 'Sui address to fund',
			},
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
    in your contracts directory to use the default sui private key.`
				);

			const privateKeyFormat = validatePrivateKey(privateKey);
			if (privateKeyFormat === false) {
				throw new DubheCliError(`Please check your PRIVATE_KEY.`);
			}
			const dubhe = new Dubhe({
				secretKey: privateKeyFormat,
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
		await requestSuiFromFaucetV0({
			host: getFaucetHost(network),
			recipient: faucet_address,
		});

		console.log('  └─ Checking balance...');
		const client = new SuiClient({ url: getFullnodeUrl(network) });
		let params = {
			owner: faucet_address,
		} as GetBalanceParams;

		const balance = await client.getBalance(params);

		console.log('\n💰 Account Summary');
		console.log(`  ├─ Address: ${faucet_address}`);
		console.log(
			`  └─ Balance: ${(
				Number(balance.totalBalance) / 1_000_000_000
			).toFixed(4)} SUI`
		);

		console.log('\n✅ Faucet Operation Complete\n');
		process.exit(0);
	},
};

export default commandModule;
