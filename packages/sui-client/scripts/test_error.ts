import { Dubhe, NetworkType, loadMetadata } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';
import { DevInspectResults, Transaction, TransactionArgument } from '../src';

async function main() {
  const network = 'testnet';
  const privateKey = process.env.PRIVATE_KEY;

  const contractAddress =
    '0x7dc2064f43a52ec022793b8742133efaf23614d11a35bc9d812a6189b50d50c3';
  const metadata = await loadMetadata(network as NetworkType, contractAddress);

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: contractAddress,
    metadata,
  });

  // const asset_metadata2 = await merak.metadataOf(1);
  // console.log('asset_metadata2', asset_metadata2);

  // const asset_metadata3 = await merak.metadataOf(2);
  // console.log('asset_metadata3', asset_metadata3);

  // const asset_metadata4 = await merak.metadataOf(3);
  // console.log('asset_metadata4', asset_metadata4);

  // const asset_metadata5 = await merak.metadataOf(4);
  // console.log('asset_metadata5', asset_metadata5);

  // const asset_metadata8 = await merak.metadataOf(10);
  // console.log('asset_metadata8', asset_metadata8);

  // const asset_metadata9 = await merak.metadataOf(11);
  // console.log('asset_metadata9', asset_metadata9);

  const tx = new Transaction();
  const params = [
    tx.object(
      '0xad1d98784985f9e7365f58db85070a28e34ec6f5c4c9390ac6236fd68b391798'
    ),
    tx.object(
      '0x270484fc53ddba97e7d52d43b546c14891c69f8878a61ec368865d6006b91f34'
    ),
    tx.pure.vector('u32', [0, 1]),
    tx.pure.u64(1000000000),
  ] as TransactionArgument[];

  const dryResult = (await dubhe.query['dex_system'].get_amount_out({
    tx,
    params,
  })) as DevInspectResults;
  console.log('getAmountOut', dryResult);
  console.log('getAmountOut');
  const res = dubhe.view(dryResult);
  console.log(res);
}

main();
