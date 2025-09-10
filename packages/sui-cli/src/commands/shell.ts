import readline from 'readline';

import yargs, { CommandModule } from 'yargs';
import { commands } from '.';
import chalk from 'chalk';
import { getDefaultNetwork, printDubhe } from '../utils';
import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

let shouldHandlerExit = true;

// Blacklist of commands not available inside shell
const SHELL_BLACKLIST_COMMANDS = ['shell', 'wait'];

export const handlerExit = (status: number = 0) => {
  if (shouldHandlerExit) process.exit(status);
};

type Options = {
  network: any;
};

const parseCommandNames = () => {
  return commands
    .filter((command) => !SHELL_BLACKLIST_COMMANDS.includes(command.command as string))
    .map((command) => command.command);
};

const ShellCommand: CommandModule<Options, Options> = {
  command: 'shell',
  describe: 'Open a shell to interact with the Dubhe System',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      }
    });
  },
  handler: async ({ network }) => {
    if (network == 'default') {
      network = await getDefaultNetwork();
      console.log(chalk.yellow(`Use default network: [${network}]`));
    }
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

      const command = commands.find(
        (c) => c.command === commandName && !SHELL_BLACKLIST_COMMANDS.includes(commandName)
      );

      // Check if user is asking for help
      if (parts.includes('--help') || parts.includes('-h')) {
        if (command) {
          try {
            // Use spawn to call dubhe help externally to avoid validation issues
            const dubheProcess = spawn('node', [process.argv[1], commandName, '--help'], {
              stdio: 'inherit',
              env: { ...process.env }
            });

            dubheProcess.on('exit', () => {
              rl.prompt();
            });

            dubheProcess.on('error', () => {
              // Fallback: show basic help information
              console.log(`\n${command.describe || `${commandName} command`}`);
              console.log(`\nUsage: ${commandName} [options]`);
              console.log('\nFor complete help with all options, please exit shell and run:');
              console.log(chalk.cyan(`  dubhe ${commandName} --help`));
              rl.prompt();
            });

            return; // Don't call rl.prompt() here as it's handled in the callbacks

          } catch (error) {
            // Fallback: show basic help information
            console.log(`\n${command.describe || `${commandName} command`}`);
            console.log(`\nUsage: ${commandName} [options]`);
            console.log('\nFor complete help with all options, please exit shell and run:');
            console.log(chalk.cyan(`  dubhe ${commandName} --help`));
          }
        } else {
          console.log(`🤷 Unknown command: "${commandName}". Type 'help' to see available commands.`);
        }
        rl.prompt();
        return;
      }

      if (command) {
        try {
          const { builder, handler } = command;
          const yargsInstance = yargs().exitProcess(false);
          if (builder) {
            if (typeof builder === 'function') {
              builder(yargsInstance);
            } else {
              yargsInstance.options(builder);
            }
            const argv = yargsInstance.parseSync([commandName, '--network', network, ...parts.slice(1)]);
            if (handler) {
              await handler(argv);
            }
          }
        } catch (error) {
          console.log(chalk.red(error));
        }
      } else if (commandName == 'help') {
        console.log('Available dubhe commands:');

        // Find the longest command name for alignment (excluding blacklisted commands)
        const availableCommands = commands.filter(
          (c) => !SHELL_BLACKLIST_COMMANDS.includes(c.command as string)
        );
        const maxCommandLength = Math.max(
          ...availableCommands.map((c) => {
            const command =
              typeof c.command === 'string'
                ? c.command
                : Array.isArray(c.command)
                  ? c.command[0]
                  : '';
            return command.length;
          })
        );

        availableCommands.forEach((c) => {
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
        console.log(`🤷 Unknown command: "${fullCommand}". Type 'help' to see available commands.`);
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
