import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs
} from '../src/index';
import * as process from 'process';
import dotenv from 'dotenv';
dotenv.config();

async function init() {
  const network = 'localnet';
  const packageId = '0x4e7e4db01f5a5f59ee65cc6cf8e11679891b7885924af9fed9cbd2d4a4af1b79';

  const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey
  });

  console.log(dubhe.getAddress());
  // await dubhe.requestFaucet();
  let balance = await dubhe.getBalance();
  console.log('balance', balance);

  const currencyObjectId = '0xecc1758aa9ac31d2ba0cf58ee63c328156855879e3804e6c568a427255efe363';

  const tx = new Transaction();

  const query = (await dubhe.query.counter_system.get({
    tx,
    params: [tx.object(currencyObjectId)]
  })) as DevInspectResults;
  console.log(query);
  const res = dubhe.view(query);
  console.log(res);

  const queryTx = new Transaction();

  const schemaQuery = (await dubhe.query.counter_schema.borrow_value({
    tx: queryTx,
    params: [queryTx.object(currencyObjectId)]
  })) as DevInspectResults;
  const schemaRes = dubhe.view(schemaQuery);
  console.log(JSON.stringify(schemaRes));

  const stateTx = new Transaction();
  const value = await dubhe.state({
    tx: stateTx,
    schema: 'value',
    params: [stateTx.object(currencyObjectId)]
  });
  console.log(value);
}

init();
