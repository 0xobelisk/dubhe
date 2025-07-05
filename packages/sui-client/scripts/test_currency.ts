import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
} from '../src/index';
import * as process from 'process';
import dotenv from 'dotenv';
dotenv.config();

async function init() {
  const network = 'testnet';
  const packageId =
    '0x37fc4f2fb5cc10b04a1848c8a492f897450acde60f654b849856584de9d5a108';

  const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey,
  });

  console.log(dubhe.getAddress());
  // await dubhe.requestFaucet();
  let balance = await dubhe.getBalance();
  console.log('balance', balance);

  const currencyObjectId =
    '0x47ec13bd4fdcff471bf71554d845146b93b523548a781cbeef1f93809dff806b';

  const callTx = new Transaction();
  const splitAmount = 10000000;
  const selectCoins = await dubhe.selectCoinsWithAmount(
    splitAmount,
    '0x2::sui::SUI'
  );
  const bidding_amount = callTx.pure.u64(splitAmount);
  const [coin] = callTx.splitCoins(callTx.object(selectCoins[0]), [
    bidding_amount,
  ]);

  const response = await dubhe.tx.counter_system.currency({
    tx: callTx,
    params: [callTx.object(currencyObjectId), coin],
  });
  console.log(response);

  let tx = new Transaction();
  let query1 = (await dubhe.query.currency_schema.get_balance({
    tx,
    params: [tx.object(currencyObjectId)],
  })) as DevInspectResults;
  console.log(JSON.stringify(query1.results![0]));
  let formatData1 = dubhe.view(query1);
  console.log(formatData1);

  let tx2 = new Transaction();
  let query2 = (await dubhe.query.currency_schema.get_coin({
    tx: tx2,
    params: [tx2.object(currencyObjectId)],
  })) as DevInspectResults;
  console.log(JSON.stringify(query2.results![0]));
  let formatData2 = dubhe.view(query2);
  console.log(formatData2);
}

init();
