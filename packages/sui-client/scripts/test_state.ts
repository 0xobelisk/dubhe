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
  const packageId = '0xfb606281b2fa4942f59b67727dc303388d0dbc3b90ac6ea2438bc90412f0b983';

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

  const currencyObjectId = '0x98bc916645cd2c3e1badb79d6c225226771651901f0ddf3df3e5d54fcf2fffaa';

  const res = await dubhe.parseState({
    schema: 'counter',
    objectId: currencyObjectId,
    storageType: 'StorageValue<u64>',
    params: []
  });
  console.log(res);
  // const databcs =
}

init();
