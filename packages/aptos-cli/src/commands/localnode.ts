import type { CommandModule } from 'yargs';
import { startLocalnode, stopLocalnode, checkLocalNodeStatus } from '../utils';

const commandModule: CommandModule = {
  command: 'localnode <action>',

  describe: 'Manage local Aptos node',

  builder(yargs) {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        choices: ['start', 'stop', 'status', 'restart'],
        type: 'string',
        demandOption: true
      })
      .option('background', {
        alias: 'b',
        type: 'boolean',
        description: 'Run node in background',
        default: false
      })
      .option('force-restart', {
        alias: 'f',
        type: 'boolean',
        description: 'Clean the state and start with a new chain at genesis',
        default: false
      });
  },

  async handler(argv) {
    const { action, background, 'force-restart': forceRestart } = argv;

    try {
      switch (action) {
        case 'start':
          await startLocalnode(background as boolean, forceRestart as boolean);
          break;
        case 'stop':
          await stopLocalnode();
          break;
        case 'status':
          await checkLocalNodeStatus();
          break;
        case 'restart':
          await restartNode(background as boolean, forceRestart as boolean);
          break;
      }
    } catch (error) {
      console.error('Error executing command:', error);
      process.exit(1);
    }
  }
};

async function restartNode(background: boolean, forceRestart: boolean) {
  console.log('Restarting local Aptos node...');
  await stopLocalnode();
  await startLocalnode(background, forceRestart);
  console.log('Local node has been restarted');
}

export default commandModule;
