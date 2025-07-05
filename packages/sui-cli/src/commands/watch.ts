import type { CommandModule } from 'yargs';
import chokidar from 'chokidar';
import { exec } from 'child_process';

const commandModule: CommandModule = {
  command: 'watch',

  describe: 'Watch dubhe config',

  builder(yargs) {
    return yargs;
  },

  async handler() {
    const configFilePath = 'dubhe.config.ts';

    const runSchemagen = () => {
      exec('pnpm dubhe schemagen', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing schemagen: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`schemagen stderr: ${stderr}`);
          return;
        }
        console.log(`schemagen stdout: ${stdout}`);
      });
    };

    const watcher = chokidar.watch(configFilePath, {
      persistent: true
    });

    watcher.on('change', (path) => {
      console.log(`${path} has been changed. Running schemagen...`);
      runSchemagen();
    });

    console.log(`Watching for changes in ${configFilePath}...`);

    process.on('SIGINT', () => {
      watcher.close();
      console.log('\nWatch stopped.');
      process.exit();
    });
  }
};

export default commandModule;
