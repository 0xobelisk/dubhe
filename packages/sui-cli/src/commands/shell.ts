import readline from 'readline';

import yargs, { CommandModule } from 'yargs';
import dotenv from 'dotenv';
import { commands } from '.';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
dotenv.config();
import { printDubhe } from '../utils';

let shouldHandlerExit = true;

export const handlerExit = (status: number = 0) => {
  if (shouldHandlerExit) process.exit(status);
};

type Options = {
  network: any;
};

const parseCommandNames = () => {
  return commands.map((command) => command.command);
};

const ShellCommand: CommandModule<Options, Options> = {
  command: 'shell',
  describe: 'Open a shell to interact with the Dubhe System',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
        default: 'localnet',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      }
    });
  },
  handler: async ({ network }) => {
    shouldHandlerExit = false;
    const commandHistory: string[] = [];

    function completer(line: string) {
      const hits = parseCommandNames().filter((c) => {
        if (!c) return false;
        return (c as string).startsWith(line.toLowerCase());
      });
      return [hits.length ? hits : parseCommandNames(), line];
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `dubhe(${chalk.green(network)}) ${chalk.bold('>')} `,
      completer: completer,
      historySize: 200
    });

    rl.on('line', async (line) => {
      const fullCommand = line.trim();
      if (!fullCommand) {
        rl.prompt();
        return;
      }

      // Add command to history
      commandHistory.push(fullCommand);

      const parts = fullCommand.split(/\s+/);
      const commandName = parts[0].toLowerCase();

      const command = commands.find((c) => c.command === commandName);
      if (command) {
        try {
          const { builder, handler } = command;
          const yargsInstance = yargs(hideBin(process.argv));
          if (builder) {
            const argv = yargsInstance.parseSync([commandName, ...parts.slice(1)]);
            if (handler) {
              await handler(argv);
            }
          }
        } catch (error) {
          console.log(chalk.red(error));
        }
      } else if (commandName == 'help') {
        console.log('Available dubhe commands:');

        // Find the longest command name for alignment
        const maxCommandLength = Math.max(
          ...commands.map((c) => {
            const command =
              typeof c.command === 'string'
                ? c.command
                : Array.isArray(c.command)
                  ? c.command[0]
                  : '';
            return command.length;
          })
        );

        commands.forEach((c) => {
          const command =
            typeof c.command === 'string'
              ? c.command
              : Array.isArray(c.command)
                ? c.command[0]
                : '';
          const paddedCommand = command.padEnd(maxCommandLength);
          console.log(`  ${chalk.green(paddedCommand)}  ${c.describe}`);
        });
        rl.prompt();
        return;
      } else if (['exit', 'quit'].indexOf(commandName) !== -1) {
        console.log('Goodbye You will have a nice day! 👋');
        rl.close();
        return;
      } else {
        console.log(`🤷‍♀️ Unknown command: "${fullCommand}". Type 'help' to see available commands.`);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });

    printDubhe();
    rl.prompt();
  }
};

export default ShellCommand;
