import { NetworkType, Dubhe } from '../src';
import * as fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const privateKey = process.env.PRIVATE_KEY;
  const dubhe = new Dubhe({
    networkType: network,
    secretKey: privateKey,
  });

  let myRoochAddr = dubhe.getRoochAddress();
  let myHexAddr = dubhe.getHexAddress();
  let myBitcoinAddr = dubhe.getBitcoinAddress();
  let myBalance = await dubhe.getBalance();
  console.log(`RoochAddr: ${myRoochAddr}`);
  console.log(`HexAddr: ${myHexAddr}`);
  console.log(`BitcoinAddr: ${myBitcoinAddr}`);
  console.log(`Balance: ${myBalance}`);
  const fileBytes = fs.readFileSync(
    './contracts/counter/build/counter/package.rpd'
  );
  const res = await dubhe.publishPackage({
    packageBytes: fileBytes,
  });
  console.log(res);
}

init();
