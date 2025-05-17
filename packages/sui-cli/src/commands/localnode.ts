import type { CommandModule } from 'yargs';
import { startLocalNode } from '../utils/startNode';

const commandModule: CommandModule = {
  command: 'node',

  describe: 'Manage local Sui node',

  builder(yargs) {
    return yargs
  },

  async handler() {
    try {
      await startLocalNode();
    } catch (error) {
      console.error('Error executing command:', error);
      process.exit(1);
    }
  }
};

export default commandModule;
