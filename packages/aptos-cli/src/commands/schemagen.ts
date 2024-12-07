import type { CommandModule } from 'yargs';
import { worldgen, loadConfig, DubheConfig } from '@0xobelisk/aptos-common';
import chalk from 'chalk';

type Options = {
	'config-path'?: string;
};

const commandModule: CommandModule<Options, Options> = {
	command: 'schemagen <config-path>',

	describe: 'Autogenerate Dubhe schemas based on the config file',

	builder(yargs) {
		return yargs.options({});
	},

	async handler({ 'config-path': configPath }) {
		try {
			const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
			worldgen(dubheConfig);
			process.exit(0);
		} catch (error: any) {
			console.log(chalk.red('Schemagen failed!'));
			console.error(error.message);
		}
	},
};

export default commandModule;
