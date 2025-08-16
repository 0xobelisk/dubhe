import {
  NetworkType,
  Dubhe,
  PendingTransactionResponse,
  Network,
} from './../src';
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

  console.log('======= query other user message ========');

  const message = await dubhe.query.message.get_message({
    params: [
      '0x35cc4910b9934ceacf0bbb014e3a823f9dee5b8725110360729b500ee81a2d3a',
    ],
  });
  console.log(message);

  console.log('======= set our message ========');
  const res1 = (await dubhe.tx.message.set_message({
    sender: dubhe.getAddress(),
    params: ['first set'],
  })) as PendingTransactionResponse;
  console.log(res1.hash);
  await delay(1000);

  console.log('======= query our message ========');
  const myMessage = await dubhe.query.message.get_message({
    params: [myAddr],
  });
  console.log(myMessage);

  console.log('======= set our message again ========');

  const res2 = (await dubhe.tx.message.set_message({
    sender: dubhe.getAddress(),
    params: ['hello world'],
  })) as PendingTransactionResponse;
  console.log(res2.hash);
  await delay(1000);

  console.log('======= query our message ========');
  const mySecondMessage = await dubhe.query.message.get_message({
    params: [myAddr],
  });
  console.log(mySecondMessage);

  const faucetRes = await dubhe.requestFaucet(network);
  console.log(faucetRes);
  // const counter = await dubhe.getEntity('single_value');
  // console.log(counter);

  // console.log('\n======= send inc transaction ========');
  // const res =
  //   (await dubhe.tx.example_system.increase()) as Types.PendingTransaction;
  // console.log(res.hash);

  // console.log('=======================================\n');
  // await delay(1000);
  // const counterend = await dubhe.query.single_value_schema.get();
  // console.log(counterend);

  // const balance = await dubhe.getBalance();
  // console.log(balance);
}

init();
