import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs,
  TransactionResult,
} from '../src/index';
import * as process from 'process';
import dotenv from 'dotenv';
dotenv.config();

async function init() {
  const network = 'testnet';
  const packageId =
    '0x85f95a4253621cac22ebfc27ec67b903c153e7b1bea5a2813c71fa62016746c7';

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

  const EncounterObjectId =
    '0xc043d44147426ae32ab93f37113b274b12656b0ee7ce675642c06db17522e9d5';
  const EntityObjectId =
    '0x35830f03eda31ad3c33f1961868878edced6cd1d0fc036b73d934ce6f326108c';
  const MapObjectId =
    '0xfdbd2b83bf4d31ba69fb98a88393c9d926c0195678afaaeea89184c6a868193e';

  // const registerTx = new Transaction();
  // const registerCall = await dubhe.tx.map_system.register({
  //   tx: registerTx,
  //   params: [
  //     registerTx.object(MapObjectId),
  //     registerTx.object(EntityObjectId),
  //     registerTx.pure.u64(0),
  //     registerTx.pure.u64(0),
  //   ],
  // });
  // console.log(registerCall);

  const queryPointTx = new Transaction();
  const queryPointCall = (await dubhe.query.map_schema.get_position({
    tx: queryPointTx,
    params: [
      queryPointTx.object(MapObjectId),
      queryPointTx.pure.address(
        '0xe96078ade5590941edb2525c011912b6a0c3401810e9ed69f856a7989c905f27'
      ),
    ],
  })) as DevInspectResults;
  const queryPointRes = dubhe.view(queryPointCall);
  console.log(queryPointRes);

  const queryKeysTx = new Transaction();
  const queryKeysCall = (await dubhe.query.entity_schema.get_player_keys({
    tx: queryKeysTx,
    params: [queryKeysTx.object(EntityObjectId)],
  })) as DevInspectResults;
  const queryKeysRes = dubhe.view(queryKeysCall);
  console.log(queryKeysRes);

  // const moveTx = new Transaction();
  // const direction = (await dubhe.tx.map_direction.new_east({
  //   tx: moveTx,
  //   isRaw: true,
  // })) as TransactionResult;
  // const moveCall = await dubhe.tx.map_system.move_position({
  //   tx: moveTx,
  //   params: [
  //     moveTx.object(MapObjectId),
  //     moveTx.object(EntityObjectId),
  //     moveTx.object(EncounterObjectId),
  //     moveTx.object('0x8'),
  //     direction,
  //   ],
  // });
  // console.log(moveCall);

  // const queryPointTx2 = new Transaction();
  // const queryPointCall2 = (await dubhe.query.map_schema.get_position({
  //   tx: queryPointTx2,
  //   params: [
  //     queryPointTx2.object(MapObjectId),
  //     queryPointTx2.pure.address(dubhe.getAddress()),
  //   ],
  // })) as DevInspectResults;
  // const queryPointRes2 = dubhe.view(queryPointCall2);
  // console.log(queryPointRes2);

  // const tx = new Transaction();
  // const query = (await dubhe.query.counter_system.get({
  //   tx,
  //   params: [tx.object(currencyObjectId)],
  // })) as DevInspectResults;
  // console.log(query);
  // const res = dubhe.view(query);
  // console.log(res);

  // const queryTx = new Transaction();

  // const schemaQuery = (await dubhe.query.counter_schema.borrow_value({
  //   tx: queryTx,
  //   params: [queryTx.object(currencyObjectId)],
  // })) as DevInspectResults;
  // const schemaRes = dubhe.view(schemaQuery);
  // console.log(JSON.stringify(schemaRes));

  // const databcs =
}

init();
