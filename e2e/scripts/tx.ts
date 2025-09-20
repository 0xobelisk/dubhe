import {
  Dubhe,
  loadMetadata,
  NetworkType,
  SuiTransactionBlockResponse,
  Transaction
} from '@0xobelisk/sui-client';
import dotenv from 'dotenv';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(dubhe: Dubhe, dappHubId: string) {
  const resourceTx = new Transaction();

  const resourceTxResp = (await dubhe.tx.example_system.resources({
    tx: resourceTx,
    params: [resourceTx.object(dappHubId)]
  })) as SuiTransactionBlockResponse;
  console.log('resourceTx digest', resourceTxResp.digest);

  // await dubhe.waitForTransaction(resourceTxResp.digest);

  await delay(1000);
  const componentTx = new Transaction();

  const componentTxResp = (await dubhe.tx.example_system.components({
    tx: componentTx,
    params: [componentTx.object(dappHubId)]
  })) as SuiTransactionBlockResponse;
  console.log('componentTx digest', componentTxResp.digest);

  // await dubhe.waitForTransaction(componentTxResp.digest);
}

async function main() {
  dotenv.config();
  const network = 'localnet';
  const packageId = '0x0456695e038424f374336582a167f4bdaa5d77b147dd7abb955650e9d2d3322d'; // TODO: set packageId
  const dappHubId = '0x8755c060bfddae5d56cb65adc439c06ed93137e2d869b84219bb7e45cd144069'; // TODO: set dappHubId

  const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey
  });

  console.log(dubhe.getAddress());
  let balance = await dubhe.getBalance();
  console.log('balance', balance);

  let i = 0;

  while (true) {
    console.log(`call ${i++}...`);
    await call(dubhe, dappHubId);
    await delay(2000);
  }
}

main();
