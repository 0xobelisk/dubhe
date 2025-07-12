import type { CommandModule } from 'yargs';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { generateConfigJson } from '../utils';
import fs from 'fs';
import { handler_exit } from './shell';

type Options = {
  'config-path': string;
  'output-path': string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'convert-json',
  describe: 'Convert JSON from Dubhe config to config.json',
  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Options to pass to forge test'
      },
      'output-path': {
        type: 'string',
        default: 'dubhe.config.json',
        description: 'Output path for the config.json file'
      }
    });
  },

  async handler({ 'config-path': configPath, 'output-path': outputPath }) {
    // Start an internal anvil process if no world address is provided
    try {
      console.log('🚀 Running convert json');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const json = generateConfigJson(dubheConfig);
      // write to file
      fs.writeFileSync(outputPath, json);
    } catch (error: any) {
      console.error(chalk.red('Error executing convert json:'));
      console.log(error.stdout);
      handler_exit(1);
    }
    handler_exit();
  }
};

export default commandModule;
