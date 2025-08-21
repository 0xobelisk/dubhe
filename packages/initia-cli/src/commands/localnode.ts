import type { CommandModule } from 'yargs';
import { startLocalnode, stopLocalnode, checkLocalNodeStatus, cleanLocalNodeState } from '../utils';

const commandModule: CommandModule = {
  command: 'localnode <action>',

  describe: 'Manage local Initia node',

  builder(yargs) {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        choices: ['start', 'stop', 'status', 'restart', 'clean'],
        type: 'string',
        demandOption: true
      })
      .option('background', {
        alias: 'b',
        type: 'boolean',
        description: 'Run node in background',
        default: false
      });
  },

  async handler(argv) {
    const { action, background } = argv;

    try {
      switch (action) {
        case 'start':
          await startLocalnode(background as boolean);
          break;
        case 'stop':
          await stopLocalnode();
          break;
        case 'status':
          await checkLocalNodeStatus();
          break;
        case 'restart':
          await restartNode(background as boolean);
          break;
        case 'clean':
          await cleanLocalNodeState();
          break;
      }
    } catch (error) {
      console.error('Error executing command:', error);
      process.exit(1);
    }
  }
};

async function restartNode(background: boolean) {
  console.log('Restarting local Initia node...');
  await stopLocalnode();
  await delay(1000);
  await startLocalnode(background);
  console.log('Local node has been restarted');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default commandModule;
