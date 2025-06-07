import { AptosAccount } from 'aptos';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

function generateAccount() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (PRIVATE_KEY === undefined) {
    console.log('Missing PRIVATE_KEY in .env');
    process.exit(0);
  }

  const keypair = AptosAccount.fromAptosAccountObject({
    privateKeyHex: PRIVATE_KEY,
  });
  const privateKey = keypair.toPrivateKeyObject().privateKeyHex;

  const path = process.cwd();
  const chainFolderPath = `${path}/src/chain`;
  fs.mkdirSync(chainFolderPath, { recursive: true });

  // fs.writeFileSync(`${path}/.env`, `PRIVATE_KEY=${privateKey}`);

  fs.writeFileSync(
    `${path}/src/chain/key.ts`,
    `export const PRIVATEKEY = '${privateKey}';
export const ACCOUNT = '${keypair.address().toString()}';
`,
  );

  console.log(`Format env Account: ${keypair.address().toString()}`);
}

generateAccount();
