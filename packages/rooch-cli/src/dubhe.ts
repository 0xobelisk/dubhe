#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { commands } from './commands';
import { logError } from './utils/errors';

// Load .env file into process.env
import * as dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();

void yargs(hideBin(process.argv))
  // Explicit name to display in help (by default it's the entry file, which may not be "dubhe" for e.g. ts-node)
  .scriptName('dubhe')
  // Use the commands directory to scaffold

  .command(commands as any)
  // Enable strict mode.
  .strict()
  // Custom error handler
  .fail((msg, err) => {
    console.error(chalk.red(msg));
    if (msg.includes('Missing required argument')) {
      console.log(
        chalk.yellow(
          `Run 'pnpm dubhe ${process.argv[2]} --help' for a list of available and required arguments.`
        )
      );
    }
    console.log('');
    logError(err);
    console.log('');

    process.exit(1);
  })
  // Useful aliases.
  .alias({ h: 'help' }).argv;
