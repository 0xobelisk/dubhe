import type { CommandModule } from 'yargs';
import { printDubhe } from '../utils';

const commandModule: CommandModule = {
  command: 'hello',

  describe: 'hello, dubhe',

  builder(yargs) {
    return yargs;
  },

  async handler() {
    printDubhe();
  }
};

export default commandModule;
