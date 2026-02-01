import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs,
  SuiMoveNormalizedModules
} from '../src/index';
import dubheMetadata from './numeron_template.json';
import * as process from 'process';
import dotenv from 'dotenv';
dotenv.config();

enum DIRECTION {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

function getDirection(direction: string): number {
  switch (direction.toUpperCase()) {
    case DIRECTION.UP:
      return 0;
    case DIRECTION.DOWN:
      return 1;
    case DIRECTION.LEFT:
      return 2;
    case DIRECTION.RIGHT:
      return 3;
    default:
      throw new Error(`Invalid direction: ${direction}. Expected UP, DOWN, LEFT, or RIGHT.`);
  }
}

async function main() {
  const network = 'testnet';
  const packageId = '0x4a32e78c9e54fe50d6fbc10bca503516344e06eac6b7cd0b7603b37498b3d964';
  const DUBHE_SCHEMA_ID = '0xfef203de9d3a2980429e91df535a0503ccf8d3c05aa3815936984243dc96f19f'; // Replace with your actual schema ID

  // const metadata = await loadMetadata(network as NetworkType, packageId);
  // fs.writeFileSync('metadata.json', JSON.stringify(metadata));
  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: dubheMetadata as SuiMoveNormalizedModules,
    secretKey: privateKey
  });

  console.log(dubhe.getAddress());
  // await dubhe.requestFaucet();
  let balance = await dubhe.getBalance();
  console.log('balance', balance);

  // const registerTx = new Transaction();
  // await dubhe.tx.map_system.force_register({
  //   tx: registerTx,
  //   params: [registerTx.object(DUBHE_SCHEMA_ID),
  //     registerTx.pure.address(dubhe.getAddress()),
  //     registerTx.pure.u64(0),
  //     registerTx.pure.u64(0),],
  //   isRaw: true,
  // });
  // console.log(JSON.stringify(registerTx.getData()));

  // const submitToChannelRes0 = await dubhe.submitToChannel({
  //   tx: registerTx,
  //   nonce: 2,
  // });
  // console.log('submitToChannel', submitToChannelRes0);

  let nonce = 9;

  // Example: Move UP
  const direction = getDirection('DOWN'); // Returns 1

  const moveUpTx = new Transaction();
  await dubhe.tx.map_system.move_position({
    tx: moveUpTx,
    params: [moveUpTx.object(DUBHE_SCHEMA_ID), moveUpTx.pure.u8(direction)],
    isRaw: true
  });
  console.log(JSON.stringify(moveUpTx.getData()));

  const submitToChannelRes = await dubhe.submitToChannel({
    tx: moveUpTx,
    nonce
  });
  console.log('submitToChannel', submitToChannelRes);
  nonce++;

  const direction1 = getDirection('DOWN'); // Returns 1

  const moveUpTx1 = new Transaction();
  await dubhe.tx.map_system.move_position({
    tx: moveUpTx1,
    params: [moveUpTx1.object(DUBHE_SCHEMA_ID), moveUpTx1.pure.u8(direction1)],
    isRaw: true
  });
  console.log(JSON.stringify(moveUpTx1.getData()));

  const submitToChannelRes1 = await dubhe.submitToChannel({
    tx: moveUpTx1,
    nonce
  });
  console.log('submitToChannel', submitToChannelRes1);
  nonce++;
}

main().catch(console.error);
