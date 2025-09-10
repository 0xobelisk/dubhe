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
  const packageId = '0x8119f24098e628a83db19109c55ff3837e911599fe21ba3e9219df6553a8b60c'; // TODO: set packageId
  const dappHubId = '0x3d9a484cade38bc1767ba623265fb1ee186677a09855984f6d9097e2caac6332'; // TODO: set dappHubId

  const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey
  });

  console.log(dubhe.getAddress());
  const balance = await dubhe.getBalance();
  console.log('balance', balance);

  let i = 0;

  while (true) {
    console.log(`call ${i++}...`);
    await call(dubhe, dappHubId);
    await delay(2000);
  }
}

main();
