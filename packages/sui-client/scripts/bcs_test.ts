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
    '0x6664144617db74279fc42b7f25c257fcb316f6193447c670631d5a4237bd04a5';
  const WRAPPER_ID =
    '0xa6c304f5351cf9eab17fd69fd7f3ca51d7b0334ea73692f111e9b4f6d3caf06e';
  const ASSETS_ID =
    '0x082be3f0711bb1eaf4d1f48fae69986eb3bd12bf7e1da8b82e17986882fb4419';

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

  // let tx = new Transaction();
  // const assets = tx.object(ASSETS_ID);
  // const owner = tx.pure.address(
  //   '0xbb3e90c52cb585aeb926edb6fb3d01146d47e96d9692394bd9d691ce1b0bd693'
  // );
  // let params: TransactionArgument[] = [assets, owner];
  // const query = (await dubhe.query.assets_system.owned_assets(
  //   tx,
  //   params
  // )) as DevInspectResults;
  // console.log(query);
  // const formatData = dubhe.view(query);
  // console.log(formatData);

  let tx = new Transaction();
  const assets = tx.object(ASSETS_ID);

  // Only query for assetId 0
  const assetId = 0;
  let asset_id = tx.pure.u32(assetId);
  let params: TransactionArgument[] = [assets, asset_id];

  let asset_metadata = (await dubhe.query.assets_system.metadata_of({
    tx,
    params,
  })) as DevInspectResults;
  console.log('asset_metadata.results[0]', asset_metadata.results![0]);
  const format_metadata = dubhe.view(asset_metadata);

  // setAssetMetadata({ id: assetId, metadata });
  console.log('metadata', format_metadata);
}

init();
