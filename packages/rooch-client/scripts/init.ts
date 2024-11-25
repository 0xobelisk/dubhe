import { NetworkType, Dubhe, Transaction } from './../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const packageId =
    '0x4dc496689f0f22bfb659631aed85466fed8773bc05cc3d07044d8c5ebc0996a5';
  const metadata = await loadMetadata(network, packageId, ['counter']);
  const privateKey = process.env.PRIVATE_KEY;
  const dubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey,
  });

  let myRoochAddr = dubhe.getBech32Address();
  let myHexAddr = dubhe.getHexAddress();
  let myBitcoinAddr = dubhe.getBitcoinAddress().toStr();
  let myBalance = await dubhe.getBalance();
  console.log(`RoochAddr: ${myRoochAddr}`);
  console.log(`HexAddr: ${myHexAddr}`);
  console.log(`BitcoinAddr: ${myBitcoinAddr}`);
  console.log(`Balance: ${myBalance}`);

  console.log('======= query counter value ========');
  let counter = await dubhe.query.counter.value();
  console.log(counter);

  console.log('======= increase counter value ========');
  const tx = new Transaction();
  const res1 = await dubhe.tx.counter.increase(tx);
  console.log(res1.execution_info.tx_hash, res1.execution_info.status);
  await delay(1000);

  console.log('======= query counter value after increase ========');
  let counter2 = await dubhe.query.counter.value();
  console.log(counter2);
}

init();
