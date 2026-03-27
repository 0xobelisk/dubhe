import type { CommandModule } from 'yargs';
import chalk from 'chalk';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getDefaultNetwork, logError } from '../utils';
import { handlerExit } from './shell';
import { formatTraceOutput } from './traceFormatter';

type Options = {
  digest: string;
  network: any;
  'rpc-url'?: string;
  json?: boolean;
  debug?: boolean;
  'max-calls'?: number;
  'max-events'?: number;
  'max-object-changes'?: number;
  'max-balance-changes'?: number;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'trace',
  describe: 'Trace a transaction digest with human-readable execution summary',
  builder(yargs) {
    return yargs.options({
      digest: {
        type: 'string',
        desc: 'Transaction digest to inspect',
        demandOption: true
      },
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Optional RPC URL override'
      },
      json: {
        type: 'boolean',
        default: false,
        desc: 'Print raw transaction JSON instead of formatted trace'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print RPC request metadata for audit/debug'
      },
      'max-calls': {
        type: 'number',
        default: 12,
        desc: 'Max programmable calls to print'
      },
      'max-events': {
        type: 'number',
        default: 10,
        desc: 'Max events to print'
      },
      'max-object-changes': {
        type: 'number',
        default: 20,
        desc: 'Max object changes to print'
      },
      'max-balance-changes': {
        type: 'number',
        default: 20,
        desc: 'Max balance changes to print'
      }
    });
  },
  handler: async ({
    digest,
    network,
    'rpc-url': rpcUrl,
    json,
    debug,
    'max-calls': maxCalls,
    'max-events': maxEvents,
    'max-object-changes': maxObjectChanges,
    'max-balance-changes': maxBalanceChanges
  }) => {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }

      const url = rpcUrl || getFullnodeUrl(network);
      const request = {
        digest,
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true
        }
      };

      if (debug) {
        console.log(chalk.gray(`[debug] network=${network}`));
        console.log(chalk.gray(`[debug] rpc=${url}`));
        console.log(chalk.gray(`[debug] request=${JSON.stringify(request)}`));
      }

      const client = new SuiClient({ url });
      const response = await client.getTransactionBlock(request);

      if (json) {
        process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
      } else {
        const formatted = formatTraceOutput(response, {
          maxCalls,
          maxEvents,
          maxObjectChanges,
          maxBalanceChanges
        });
        process.stdout.write(`${formatted}\n`);
      }
      handlerExit();
    } catch (error) {
      logError(error);
      handlerExit(1);
    }
  }
};

export default commandModule;
