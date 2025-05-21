import { Dubhe } from '@0xobelisk/rooch-client';
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
      const keypair = dubhe.getKeypair();

      // Only update key.ts file
      const chainFolderPath = `${path}/src/chain`;
      fs.mkdirSync(chainFolderPath, { recursive: true });

      fs.writeFileSync(
        `${path}/src/chain/key.ts`,
        `export const PRIVATEKEY = '${privateKey}';
export const ACCOUNT = '${keypair.getRoochAddress().toHexAddress()}';
`,
      );
      console.log(`Using existing account:`);
      console.log(`Rooch Bech32 address: ${keypair.getRoochAddress().toStr()}`);
      console.log(`Rooch Hex address: ${keypair.getRoochAddress().toHexAddress()}`);
      console.log(`Bitcoin address: ${keypair.getBitcoinAddress().toStr()}`);
      return;
    }
  } catch (error) {
    // .env file doesn't exist or failed to read, continue to generate new account
  }

  // If no existing private key, generate new account
  const dubhe = new Dubhe();
  const keypair = dubhe.getKeypair();
  privateKey = keypair.getSecretKey();

  const chainFolderPath = `${path}/src/chain`;
  fs.mkdirSync(chainFolderPath, { recursive: true });

  fs.writeFileSync(`${path}/.env`, `PRIVATE_KEY=${privateKey}`);

  fs.writeFileSync(
    `${path}/src/chain/key.ts`,
    `export const PRIVATEKEY = '${privateKey}';
  export const ACCOUNT = '${keypair.getRoochAddress().toHexAddress()}';
  `,
  );

  console.log(`Generate new Account:`);
  console.log(`Rooch Bech32 address: ${keypair.getRoochAddress().toStr()}`);
  console.log(`Rooch Hex address: ${keypair.getRoochAddress().toHexAddress()}`);
  console.log(`Bitcoin address: ${keypair.getBitcoinAddress().toStr()}`);
}

generateAccount();
