import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { switchEnv } from '../utils';
import { handlerExit } from './shell';

type Options = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'default';
  'rpc-url'?: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'switch-env',
  describe: 'Switch environment',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet'] as const,
        default: 'localnet',
        desc: 'Switch to node network (mainnet/testnet/devnet/localnet)'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Custom RPC endpoint URL (overrides the default for the selected network)'
      }
    }) as any;
  },
  async handler(argv: ArgumentsCamelCase<Options>) {
    await switchEnv(argv.network as 'mainnet' | 'testnet' | 'devnet' | 'localnet', argv['rpc-url']);
    handlerExit();
  }
};

export default commandModule;
