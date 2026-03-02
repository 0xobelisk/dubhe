import type { CommandModule } from 'yargs';
import chalk from 'chalk';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { generateConfigJson } from '../utils';
import fs from 'fs';
import { handlerExit } from './shell';

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
    try {
      console.log('🚀 Running convert json');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const schemaJson = JSON.parse(generateConfigJson(dubheConfig));

      // Preserve runtime fields written by publishHandler (package IDs, checkpoint, etc.)
      // so that re-running convert-json after publish does not wipe deployment info.
      const RUNTIME_FIELDS = [
        'original_package_id',
        'dubhe_object_id',
        'original_dubhe_package_id',
        'start_checkpoint'
      ];
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(outputPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        } catch {
          // ignore parse errors – start fresh
        }
      }
      const merged: Record<string, unknown> = { ...schemaJson };
      for (const field of RUNTIME_FIELDS) {
        if (existing[field] !== undefined) {
          merged[field] = existing[field];
        }
      }

      fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
    } catch (error: any) {
      console.error(chalk.red('Error executing convert json:'));
      console.log(error.stdout);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
