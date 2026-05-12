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

const RUNTIME_FIELDS = [
  'original_package_id',
  'dubhe_object_id',
  'original_dubhe_package_id',
  'dapp_key',
  'start_checkpoint',
  'package_ids'
];

export function mergeConfigJsonRuntimeFields(
  schemaJson: Record<string, unknown>,
  existing: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...schemaJson };
  for (const field of RUNTIME_FIELDS) {
    if (existing[field] !== undefined) {
      merged[field] = existing[field];
    }
  }
  // If dapp_key is missing but original_package_id is present, compute it.
  // This handles configs created before dapp_key was introduced.
  if (!merged['dapp_key'] && merged['original_package_id']) {
    const hex = (merged['original_package_id'] as string).replace(/^0x/i, '').padStart(64, '0');
    merged['dapp_key'] = `${hex}::dapp_key::DappKey`;
  }
  return merged;
}

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

      let existing: Record<string, unknown> = {};
      if (fs.existsSync(outputPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        } catch {
          // ignore parse errors – start fresh
        }
      }
      const merged = mergeConfigJsonRuntimeFields(schemaJson, existing);

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
