import type { CommandModule } from 'yargs';
import waitOn from 'wait-on';
import ora from 'ora';
import chalk from 'chalk';

interface WaitOptions {
  url: string;
  timeout: number;
  interval: number;
}

const commandModule: CommandModule = {
  command: 'wait',
  describe: 'Wait for service to be ready',
  builder(yargs) {
    return yargs
      .option('url', {
        type: 'string',
        description: 'URL to wait for'
      })
      .option('timeout', {
        type: 'number',
        description: 'Timeout (in milliseconds)',
        default: 180000
      })
      .option('interval', {
        type: 'number',
        description: 'Check interval (in milliseconds)',
        default: 1000
      });
  },
  async handler(argv) {
    const options = argv as unknown as WaitOptions;
    const spinner = ora({
      text: `Waiting for service to start ${chalk.cyan(options.url)}...`,
      color: 'cyan'
    });

    spinner.start();

    try {
      await waitOn({
        resources: [options.url],
        timeout: options.timeout,
        interval: options.interval,
        validateStatus: (status: number) => status === 200
      });

      spinner.succeed(chalk.green('Service is ready!'));
      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Timeout waiting for service'));
      console.error(chalk.yellow('Please make sure the service is running...'));
      process.exit(1);
    }
  }
};

export default commandModule;
