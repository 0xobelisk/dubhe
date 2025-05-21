import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';

type Options = {
  'config-path': string;
  test?: string;
  'gas-limit'?: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'test',

  describe: 'Run tests in Dubhe contracts',

  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Options to pass to forge test'
      },
      test: {
        type: 'string',
        desc: 'Run a specific test'
      },
      'gas-limit': {
        type: 'string',
        desc: 'Set the gas limit for the test',
        default: '100000000'
      }
    });
  },

  async handler({ 'config-path': configPath, test, 'gas-limit': gasLimit }) {
    // Start an internal anvil process if no world address is provided
    try {
      console.log('🚀 Running move test');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;
      const path = process.cwd();
      const projectPath = `${path}/src/${dubheConfig.name}`;
      const command = `sui move test --path ${projectPath} ${
        test ? ` --test ${test}` : ''
      } --gas-limit ${gasLimit}`;
      execSync(command, { stdio: 'inherit', encoding: 'utf-8' });
    } catch (error: any) {
      process.exit(0);
    }
  }
};

export default commandModule;
