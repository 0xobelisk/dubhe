import { Dubhe } from '@0xobelisk/initia-client';
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
export const ACCOUNT = '${dubhe.getHexAddress()}';
`,
      );
      console.log(`Using existing account:`);
      console.log(`Initia Bech32 address: ${dubhe.getAddress()}`);
      console.log(`Initia Hex address: ${dubhe.getHexAddress()}`);
      return;
    }
  } catch (error) {
    // .env file doesn't exist or failed to read, continue to generate new account
  }

  // If no existing private key, generate new account
  const dubhe = new Dubhe();
  const keypair = dubhe.getSigner();
  privateKey = keypair.privateKey.toString('hex');

  const chainFolderPath = `${path}/src/chain`;
  fs.mkdirSync(chainFolderPath, { recursive: true });

  fs.writeFileSync(`${path}/.env`, `PRIVATE_KEY=${privateKey}`);

  fs.writeFileSync(
    `${path}/src/chain/key.ts`,
    `export const PRIVATEKEY = '${privateKey}';
  export const ACCOUNT = '${dubhe.getHexAddress()}';
  `,
  );

  console.log(`Generate new Account:`);
  console.log(`Initia Bech32 address: ${dubhe.getAddress()}`);
  console.log(`Initia Hex address: ${dubhe.getHexAddress()}`);
}

generateAccount();
