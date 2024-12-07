import { Network, Dubhe, PendingTransactionResponse } from '../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const privateKey = process.env.PRIVATE_KEY;
  const dubhe = new Dubhe({
    secretKey: privateKey,
    networkType: Network.LOCAL,
  });

  let myAddr = dubhe.getAddress();
  let myBalance = await dubhe.getBalance();
  console.log(`Addr: ${myAddr}`);
  console.log(`Balance: ${myBalance}`);

  const response = await dubhe.requestFaucet(myAddr);
  console.log(response.hash);
  myBalance = await dubhe.getBalance();
  console.log(`Balance: ${myBalance}`);
}

init();
