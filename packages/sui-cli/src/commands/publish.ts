import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { publishHandler } from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';

type Options = {
	network: any;
	'config-path': string;
	'contract-name'?: string;
	'gas-budget'?: number;
};

const commandModule: CommandModule<Options, Options> = {
	command: 'publish',

	describe: 'Publish dubhe move contract',

	builder(yargs) {
		return yargs.options({
			network: {
				type: 'string',
				choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
				desc: 'Node network (mainnet/testnet/devnet/localnet)',
			},
			'config-path': {
				type: 'string',
				default: 'dubhe.config.ts',
				desc: 'Configuration file path',
			},
			'contract-name': {
				type: 'string',
				desc: 'Optional contract name in contracts/ directory',
			},
			'gas-budget': {
				type: 'number',
				desc: 'Optional gas budget for the transaction',
				optional: true,
			},
		});
	},

	async handler({
		network,
		'config-path': configPath,
		'contract-name': contractName,
		'gas-budget': gasBudget,
	}) {
		try {
			const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
			await publishHandler(dubheConfig, network, contractName, gasBudget);
		} catch (error: any) {
			logError(error);
			process.exit(1);
		}
		process.exit(0);
	},
};

export default commandModule;
