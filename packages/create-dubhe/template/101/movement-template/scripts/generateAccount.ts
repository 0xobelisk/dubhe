import { Dubhe, Account } from '@0xobelisk/aptos-client';
import * as fs from 'fs';

async function generateAccount() {
  const path = process.cwd();

  // Check if .env file exists and has content
  let privateKey: string;
  try {
    const envContent = fs.readFileSync(`${path}/.env`, 'utf8');
    const match = envContent.match(/PRIVATE_KEY=(.+)/);
    if (match && match[1]) {
      privateKey = match[1];
      const dubhe = new Dubhe({ secretKey: privateKey });

      // Only update key.ts file
      const chainFolderPath = `${path}/src/chain`;
      fs.mkdirSync(chainFolderPath, { recursive: true });

      fs.writeFileSync(
        `${path}/src/chain/key.ts`,
        `export const PRIVATEKEY = '${privateKey}';
export const ACCOUNT = '${dubhe.getAddress().toString()}';
`,
      );
      console.log(`Using existing account:`);
      console.log(`Aptos address: ${dubhe.getAddress().toString()}`);
      return;
    }
  } catch (error) {
    // .env file doesn't exist or failed to read, continue to generate new account
  }

  // If no existing private key, generate new account
  let generatedAccount = Account.generate();
  privateKey = generatedAccount.privateKey.toString();

  const chainFolderPath = `${path}/src/chain`;
  fs.mkdirSync(chainFolderPath, { recursive: true });

  fs.writeFileSync(`${path}/.env`, `PRIVATE_KEY=${privateKey}`);

  fs.writeFileSync(
    `${path}/src/chain/key.ts`,
    `export const PRIVATEKEY = '${privateKey}';
  export const ACCOUNT = '${generatedAccount.accountAddress.toString()}';
  `,
  );

  console.log(`Generate new Account:`);
  console.log(`Aptos address: ${generatedAccount.accountAddress.toString()}`);
}

generateAccount();
