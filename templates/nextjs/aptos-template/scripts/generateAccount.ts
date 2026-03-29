import { AptosAccount } from 'aptos';
import * as fs from 'fs';

function generateAccount() {
  const keypair = new AptosAccount();

  const privateKey = keypair.toPrivateKeyObject().privateKeyHex;

  const path = process.cwd();
  const chainFolderPath = `${path}/src/chain`;
  fs.mkdirSync(chainFolderPath, { recursive: true });

  fs.writeFileSync(`${path}/.env`, `PRIVATE_KEY=${privateKey}`);

  fs.writeFileSync(
    `${path}/src/chain/key.ts`,
    `export const PRIVATEKEY = '${privateKey}';
export const ACCOUNT = '${keypair.address().toString()}';
`,
  );

  console.log(`Generate new Account: ${keypair.address().toString()}`);
}

generateAccount();
