import type { CommandModule } from 'yargs';
import { startLocalNode } from '../utils/startNode';

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
      process.exit(1);
    }
  }
};

export default commandModule;
