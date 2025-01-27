import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs,
} from '../src/index';
import * as process from 'process';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function init() {
  const network = 'testnet';
  const packageId =
    '0x9233ea7cd6abd1a2ea5e7a5a54d9eab96a8c704a682e6981413edcfdd3a6b389';

  const metadata = await loadMetadata(network as NetworkType, packageId);
  fs.writeFileSync('metadata.json', JSON.stringify(metadata));
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

  let tx1 = new Transaction();
  let params: TransactionArgument[] = [
    tx1.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query1 = (await dubhe.query.assets_schema.get_next_asset_id({
    tx: tx1,
    params,
  })) as DevInspectResults;
  console.log(JSON.stringify(query1.results![0]));
  let formatData1 = dubhe.view(query1);
  console.log(formatData1);

  let tx2 = new Transaction();
  let params2: TransactionArgument[] = [
    tx2.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
    tx2.pure.u32(1),
  ];
  let query2 = (await dubhe.query.assets_schema.get_metadata({
    tx: tx2,
    params: params2,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query2.results![0]));
    let formatData2 = dubhe.view(query2);
    console.log(formatData2);
  } catch (e) {
    console.log(e);
  }

  let tx3 = new Transaction();
  let params3: TransactionArgument[] = [
    tx3.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query3 = (await dubhe.query.assets_schema.get_metadata_keys({
    tx: tx3,
    params: params3,
  })) as DevInspectResults;
  console.log(JSON.stringify(query3.results![0]));
  let formatData3 = dubhe.view(query3);
  console.log(formatData3);

  let tx4 = new Transaction();
  let params4: TransactionArgument[] = [
    tx4.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query4 = (await dubhe.query.assets_schema.get_metadata_values({
    tx: tx4,
    params: params4,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query4.results![0]));
    let formatData4 = dubhe.view(query4);
    console.log(formatData4);
  } catch (e) {
    console.log(e);
  }

  let tx5 = new Transaction();
  let params5: TransactionArgument[] = [
    tx5.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
    tx5.pure.u32(1),
  ];
  let query5 = (await dubhe.query.assets_schema.get_details({
    tx: tx5,
    params: params5,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query5.results![0]));
    let formatData5 = dubhe.view(query5);
    console.log(formatData5);
  } catch (e) {
    console.log(e);
  }

  let tx6 = new Transaction();
  let params6: TransactionArgument[] = [
    tx6.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query6 = (await dubhe.query.assets_schema.get_details_keys({
    tx: tx6,
    params: params6,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query6.results![0]));
    let formatData6 = dubhe.view(query6);
    console.log(formatData6);
  } catch (e) {
    console.log(e);
  }

  let tx7 = new Transaction();
  let params7: TransactionArgument[] = [
    tx7.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query7 = (await dubhe.query.assets_schema.get_details_values({
    tx: tx7,
    params: params7,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query7.results![0]));
    let formatData7 = dubhe.view(query7);
    console.log(formatData7);
  } catch (e) {
    console.log(e);
  }

  let tx8 = new Transaction();
  let params8: TransactionArgument[] = [
    tx8.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
    tx8.pure.u32(0),
    tx8.pure.address('0x0'),
  ];
  let query8 = (await dubhe.query.assets_schema.get_account({
    tx: tx8,
    params: params8,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query8.results![0]));
    let formatData8 = dubhe.view(query8);
    console.log(formatData8);
  } catch (e) {
    console.log(e);
  }

  let tx9 = new Transaction();
  let params9: TransactionArgument[] = [
    tx9.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query9 = (await dubhe.query.assets_schema.get_account_keys({
    tx: tx9,
    params: params9,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query9.results![0]));
    let formatData9 = dubhe.view(query9);
    console.log(formatData9);
  } catch (e) {
    console.log(e);
  }

  let tx10 = new Transaction();
  let params10: TransactionArgument[] = [
    tx10.object(
      '0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54'
    ),
  ];
  let query10 = (await dubhe.query.assets_schema.get_account_values({
    tx: tx10,
    params: params10,
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query10.results![0]));
    const databcs = bcs.vector(
      bcs.struct('Account', {
        balance: bcs.u64(),
        status: bcs.enum('AccountStatus', {
          Liquid: null,
          Frozen: null,
          Blocked: null,
        }),
      })
    );

    // const value = Uint8Array.from(query10.results![0]);
    // let fmatData = databcs.parse(value);
    // console.log(fmatData);

    let returnValues111: any[] = [];

    const resultList111 = query10.results![0].returnValues!;

    for (const res of resultList111) {
      console.log('res ======');
      console.log(res);
      let baseValue = res[0];
      const value1 = Uint8Array.from(baseValue);
      returnValues111.push(databcs.parse(value1));
    }

    console.log('returnValues start ======');
    console.log(returnValues111);
    console.log(JSON.stringify(returnValues111, null, 2));
    console.log('returnValues end ======');

    let formatData10 = dubhe.view(query10);
    console.log(JSON.stringify(formatData10, null, 2));
  } catch (e) {
    console.log(e);
  }
}
init();
