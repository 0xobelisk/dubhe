import { Dubhe } from '@0xobelisk/sui-client';
import * as fs from 'fs';
import chalk from 'chalk';

export async function generateAccountHandler(
  force: boolean = false,
  useNextPublic: boolean = false
) {
  if (useNextPublic) {
    console.log(
      chalk.gray(
        'Note: The generated account will be stored in the .env file with NEXT_PUBLIC_ prefix for client-side usage.'
      )
    );
    console.log(
      chalk.yellow('Warning: Do not expose the .env file, it is intended for local testing only.\n')
    );
  }
  const path = process.cwd();
  let privateKey: string | undefined;
  let envContent = '';

  // Check if .env file exists
  try {
    envContent = fs.readFileSync(`${path}/.env`, 'utf8');

    // privateKey = process.env.PRIVATE_KEY || process.env.NEXT_PUBLIC_PRIVATE_KEY;
    let privateKey = process.env.PRIVATE_KEY || process.env.NEXT_PUBLIC_PRIVATE_KEY;
    if (useNextPublic) {
      privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || process.env.PRIVATE_KEY;
    }

    if (privateKey) {
      // If key exists, decide whether to update keyname based on useNextPublic
      const newKeyName = useNextPublic ? 'NEXT_PUBLIC_PRIVATE_KEY' : 'PRIVATE_KEY';

      // Find and update the last matching line based on privateKey value
      const lines = envContent.split('\n');
      let shouldUpdate = false;

      // First check if the last matching line already has the correct keyname
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.endsWith(privateKey)) {
          // If useNextPublic is true, only update if the line starts with PRIVATE_KEY=
          // If useNextPublic is false, only update if the line starts with NEXT_PUBLIC_PRIVATE_KEY=
          const [currentKeyName] = line.split('=');
          if (useNextPublic) {
            shouldUpdate = currentKeyName === 'PRIVATE_KEY';
          } else {
            shouldUpdate = currentKeyName === 'NEXT_PUBLIC_PRIVATE_KEY';
          }
          break;
        }
      }

      // Only update if necessary
      if (shouldUpdate) {
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];
          if (line.endsWith(privateKey)) {
            const newLine = `${newKeyName}=${privateKey}`;
            lines[i] = newLine;
            envContent = lines.join('\n');
            fs.writeFileSync(`${path}/.env`, envContent);
            break;
          }
        }
      }

      const dubhe = new Dubhe({ secretKey: privateKey });
      const keypair = dubhe.getSigner();
      console.log(chalk.blue(`Using existing account: ${keypair.toSuiAddress()}`));
      return;
    }
  } catch (_error) {
    // .env file doesn't exist or failed to read, continue to generate new account
  }

  // Generate a new account if no existing key is found or force generation is requested
  if (force || !privateKey) {
    const dubhe = new Dubhe();
    const keypair = dubhe.getSigner();
    privateKey = keypair.getSecretKey();

    const newKeyName = useNextPublic ? 'NEXT_PUBLIC_PRIVATE_KEY' : 'PRIVATE_KEY';
    const newContent = `${newKeyName}=${privateKey}`;

    // If .env file exists, append new content; otherwise create a new file
    if (envContent) {
      envContent = envContent.trim() + '\n' + newContent;
    } else {
      envContent = newContent;
    }

    fs.writeFileSync(`${path}/.env`, envContent);
    console.log(chalk.green(`File created/updated at: ${path}/.env`));

    console.log(chalk.blue(`New account generated: ${keypair.toSuiAddress()}`));
  }
}
