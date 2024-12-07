import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { upgradeHandler } from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/aptos-common';

type Options = {
	network: any;
	'config-path': string;
};

const commandModule: CommandModule<Options, Options> = {
	command: 'upgrade',

	describe: 'Upgrade dubhe move contracts',

	builder(yargs) {
		return yargs.options({
			network: {
				type: 'string',
				choices: [
					'mainnet',
					'testnet',
					'devnet',
					'local',
					'movementtestnet',
					'movementdevnet',
					'movementlocal',
				],
				desc: 'Network of the node (mainnet/testnet/devnet/local/movementtestnet/movementdevnet/movementlocal)',
			},
			'config-path': {
				type: 'string',
				default: 'dubhe.config.ts',
				decs: 'Path to the config file',
			},
		});
	},

	async handler({ network, 'config-path': configPath }) {
		try {
			const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
			await upgradeHandler(dubheConfig.name, network);
		} catch (error: any) {
			logError(error);
			process.exit(1);
		}
		process.exit(0);
	},
};

export default commandModule;
