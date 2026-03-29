// import type { CommandModule } from 'yargs';
// import { schemaGen, loadConfig, DubheConfig } from '@0xobelisk/sui-common';
// import chalk from 'chalk';

// type Options = {
// 	configPath?: string;
// 	network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
// 	frameworkId?: string;
// };

// const commandModule: CommandModule<Options, Options> = {
// 	command: 'schemagen',

// 	describe: 'Autogenerate Dubhe schemas based on the config file',

// 	builder: {
// 		configPath: {
// 			type: 'string',
// 			default: 'dubhe.config.ts',
// 			desc: 'Path to the config file',
// 		},
// 		network: {
// 			type: 'string',
// 			choices: ['mainnet', 'testnet', 'devnet', 'localnet'] as const,
// 			desc: 'Node network (mainnet/testnet/devnet/localnet)',
// 		},
// 		frameworkId: {
// 			type: 'string',
// 			desc: 'Framework Package ID',
// 		},
// 	},

// 	async handler({ configPath, network, frameworkId }) {
// 		try {
// 			const dubheConfig = (await loadConfig(
// 				configPath
// 			)) as DubheConfig;
// 			await schemaGen(dubheConfig, undefined, network, frameworkId);
// 			process.exit(0);
// 		} catch (error: any) {
// 			console.log(chalk.red('Schemagen failed!'));
// 			console.error(error.message);
// 		}
// 	},
// };

// export default commandModule;
