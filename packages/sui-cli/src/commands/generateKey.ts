import type { CommandModule } from 'yargs';
import { generateAccountHandler } from '../utils/generateAccount';
import { handlerExit } from './shell';

type Options = {
  force?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'generate-key',
  describe: 'Generate a new account keypair and save it to a .env file',
  builder: {
    force: {
      type: 'boolean',
      default: false,
      desc: 'Force generate a new keypair'
    }
  },
  async handler({ force }) {
    try {
      await generateAccountHandler(force);
    } catch (error) {
      console.error('Error generating account:', error);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
