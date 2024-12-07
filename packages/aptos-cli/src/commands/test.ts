import { loadConfig, DubheConfig } from '@0xobelisk/aptos-common';
import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import chalk from 'chalk';

type Options = {
	configPath: string;
};

const commandModule: CommandModule<Options, Options> = {
	command: 'test',

	describe: 'Run tests in Dubhe contracts',

	builder(yargs) {
		return yargs.options({
			configPath: {
				type: 'string',
				default: 'dubhe.config.ts',
				desc: 'Path to the config file',
			},
		});
	},

	async handler({ configPath }) {
		const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

		// Start an internal anvil process if no world address is provided
		try {
			const logs = execSync(
				`aptos move test --package-dir contracts/${dubheConfig.name} --named-addresses ${dubheConfig.name}=0x0`,
				{
					encoding: 'utf-8',
				}
			);

			console.log(logs);
		} catch (error: any) {
			console.error(chalk.red('Error executing sui move test:'));
			console.log(error.stdout);
			process.exit(0);
		}
	},
};

export default commandModule;
