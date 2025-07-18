import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { switchEnv } from '../utils';
import { handlerExit } from './shell';

type Options = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
};

const commandModule: CommandModule<Options, Options> = {
  command: 'switch-env',
  describe: 'Switch environment',
  builder(yargs) {
    return yargs.option('network', {
      type: 'string',
      choices: ['mainnet', 'testnet', 'devnet', 'localnet'] as const,
      default: 'localnet',
      desc: 'Switch to node network (mainnet/testnet/devnet/localnet)'
    }) as any;
  },
  async handler(argv: ArgumentsCamelCase<Options>) {
    await switchEnv(argv.network as 'mainnet' | 'testnet' | 'devnet' | 'localnet');
    handlerExit();
  }
};

export default commandModule;
