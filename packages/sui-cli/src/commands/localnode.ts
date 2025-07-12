import type { CommandModule } from 'yargs';
import { startLocalNode } from '../utils/startNode';
import { handler_exit } from './shell';

type Options = {
  'data-dir': string;
  force: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'node',

  describe: 'Manage local Sui node',

  builder: {
    'data-dir': {
      type: 'string',
      default: '.chk',
      desc: 'Path to the data directory'
    },
    force: {
      type: 'boolean',
      default: false,
      desc: 'Force restart: stop existing node and remove data directory'
    }
  },

  async handler({ 'data-dir': data_dir, force }) {
    try {
      await startLocalNode(data_dir, force);
    } catch (error) {
      console.error('Error executing command:', error);
      handler_exit(1);
    }
    handler_exit();
  }
};

export default commandModule;
