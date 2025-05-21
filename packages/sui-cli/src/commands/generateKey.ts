import type { CommandModule } from 'yargs';
import { generateAccountHandler } from '../utils/generateAccount';

type Options = {
  force?: boolean;
  'use-next-public'?: boolean;
};

const commandModule: CommandModule<Options, Options> = {
  command: 'generate-key',
  describe: 'Generate a new account keypair and save it to a .env file',
  builder: {
    force: {
      type: 'boolean',
      default: false,
      desc: 'Force generate a new keypair'
    },
    'use-next-public': {
      type: 'boolean',
      default: false,
      desc: 'Use the NEXT_PUBLIC_ prefix for client-side usage'
    }
  },
  async handler({ force, 'use-next-public': useNextPublic }) {
    try {
      await generateAccountHandler(force, useNextPublic);
    } catch (error) {
      console.error('Error generating account:', error);
      process.exit(1);
    }
    process.exit(0);
  }
};

export default commandModule;
