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
import fs from 'fs';
dotenv.config();

async function init() {
  const network = 'testnet';
  const packageId = '0x9233ea7cd6abd1a2ea5e7a5a54d9eab96a8c704a682e6981413edcfdd3a6b389';

  const metadata = await loadMetadata(network as NetworkType, packageId);
  fs.writeFileSync('metadata.json', JSON.stringify(metadata));
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

  let tx10 = new Transaction();
  let params10: TransactionArgument[] = [
    tx10.object('0x156f9442fa03ba6b8a33817f3a2999fcbdbf30714bee31960289af2301a9ac54')
  ];
  let query10 = (await dubhe.query.assets_schema.get_account_values({
    tx: tx10,
    params: params10
  })) as DevInspectResults;
  try {
    console.log(JSON.stringify(query10.results![0]));

    // const databcs = dubhe.testobject(
    //   'vector<0x9233ea7cd6abd1a2ea5e7a5a54d9eab96a8c704a682e6981413edcfdd3a6b389::assets_account::Account>'
    // );
    const databcs = bcs.vector(
      bcs.struct('Account', {
        balance: bcs.u64(),
        status: bcs.enum('AccountStatus', {
          Blocked: null,
          Frozen: null,
          Liquid: null
        })
      })
    );

    // const value = Uint8Array.from(query10.results![0]);
    // let fmatData = databcs.parse(value);
    // console.log(fmatData);

    const resultList111 = query10.results![0].returnValues!;
    let returnValues111: any[] = [];

    for (const res of resultList111) {
      console.log('res ======');
      console.log(res);
      let baseValue = res[0];
      const value1 = Uint8Array.from(baseValue);
      returnValues111.push(databcs.parse(value1));
    }

    console.log('returnValues111 start ======');
    console.log(returnValues111);
    console.log(JSON.stringify(returnValues111, null, 2));
    console.log('returnValues111 end ======');

    let formatData10 = dubhe.view(query10);
    console.log('view result start ======');
    console.log(formatData10);
    console.log(JSON.stringify(formatData10, null, 2));
    console.log('view result end ======');

    if (JSON.stringify(formatData10) === JSON.stringify(returnValues111)) {
      console.log('formatData10 === returnValues111');
    } else {
      console.log('formatData10 !== returnValues111');
      console.log('Difference found!');
    }
  } catch (e) {
    console.log(e);
  }
}
init();
