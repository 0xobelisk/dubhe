import {
  NetworkType,
  Dubhe,
  PendingTransactionResponse,
  Network,
} from '../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = Network.LOCAL as NetworkType;
  const packageId =
    '0x8bcadf2b8928c494761156a4dcd1864b72733caf15ace83fcbe95bf6f1a475a1';
  const metadata = await loadMetadata(network, packageId);
  const privateKey = process.env.PRIVATE_KEY;
  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey,
  });

  const myAddr = dubhe.getAddress();
  const myBalance = await dubhe.getBalance();
  console.log(`Addr: ${myAddr}`);
  console.log(`Balance: ${myBalance}`);

  console.log('======= query counter value ========');

  const message = await dubhe.query.counter_schema.get();
  console.log(message);

  console.log('======= increase counter value ========');
  const res1 =
    (await dubhe.tx.counter_system.increase()) as PendingTransactionResponse;
  console.log(res1.hash);
  await dubhe.waitForTransaction(res1.hash);

  console.log('======= query counter value ========');
  const myMessage = await dubhe.query.counter_schema.get();
  console.log(myMessage);

  console.log('======= increase counter value again ========');

  const res2 =
    (await dubhe.tx.counter_system.increase()) as PendingTransactionResponse;
  await dubhe.waitForTransaction(res2.hash);

  console.log('======= query counter value ========');
  const mySecondMessage = await dubhe.query.counter_schema.get();
  console.log(mySecondMessage);
}

init();
