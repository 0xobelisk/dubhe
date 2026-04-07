import type { CommandModule } from 'yargs';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import { handlerExit } from './shell';

const commandModule: CommandModule = {
  command: 'watch',

  describe: 'Watch dubhe config',

  builder(yargs) {
    return yargs;
  },

  async handler() {
    const configFilePath = 'dubhe.config.ts';

    const runGenerate = () => {
      exec('pnpm dubhe generate', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing generate: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`generate stderr: ${stderr}`);
          return;
        }
        console.log(`generate stdout: ${stdout}`);
      });
    };

    const watcher = chokidar.watch(configFilePath, {
      persistent: true
    });

    watcher.on('change', (path) => {
      console.log(`${path} has been changed. Running generate...`);
      runGenerate();
    });

    console.log(`Watching for changes in ${configFilePath}...`);

    process.on('SIGINT', () => {
      watcher.close();
      console.log('\nWatch stopped.');
      handlerExit();
    });
  }
};

export default commandModule;
