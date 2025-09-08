import { Dubhe } from '@0xobelisk/sui-client';
import * as fs from 'fs';
import chalk from 'chalk';

export async function generateAccountHandler(force: boolean = false) {
  const path = process.cwd();
  let envContent = '';

  // Check if .env file exists
  try {
    envContent = fs.readFileSync(`${path}/.env`, 'utf8');

    const privateKey = process.env.PRIVATE_KEY;

    if (privateKey) {
      const dubhe = new Dubhe({ secretKey: privateKey });
      const keypair = dubhe.getSigner();
      console.log(chalk.blue(`Using existing account: ${keypair.toSuiAddress()}`));
      return;
    }
  } catch (error) {
    // .env file doesn't exist or failed to read, continue to generate new account
  }

  // Generate a new account if no existing key is found or force generation is requested
  if (force || !process.env.PRIVATE_KEY) {
    const dubhe = new Dubhe();
    const keypair = dubhe.getSigner();
    const newPrivateKey = keypair.getSecretKey();

    const newContent = `PRIVATE_KEY=${newPrivateKey}`;

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
