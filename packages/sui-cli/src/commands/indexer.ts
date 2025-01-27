import type { CommandModule } from 'yargs';
import { logError } from '../utils/errors';
import { indexerHandler } from '../utils';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';

type Options = {
	network: any;
	'config-path': string;
	'db': string;
	'schemaId'?: string;
};

const commandModule: CommandModule<Options, Options> = {
	command: 'indexer',

	describe: 'Dubhe indexer',

	builder(yargs) {
		return yargs.options({
			network: {
				type: 'string',
				choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
				desc: 'Node network (mainnet/testnet/devnet/localnet)',
				default: 'localnet',
			},
			'config-path': {
				type: 'string',
				default: 'dubhe.config.ts',
				desc: 'Configuration file path',
			},
			'schemaId': {
				type: 'string',
				desc: 'Schema ID',
			},
			'db': {
				type: 'string',
				choices: ['sqlite', 'postgres'],
				desc: 'Optional gas budget for the transaction',
				default: 'sqlite',
			},
		});
	},

	async handler({
		network,
		'config-path': configPath,
		db,
		schemaId: schemaId,
	}) {
		try {
			const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
			await indexerHandler(dubheConfig, network, db, schemaId);
		} catch (error: any) {
			logError(error);
			process.exit(1);
		}
		process.exit(0);
	},
};

export default commandModule;
