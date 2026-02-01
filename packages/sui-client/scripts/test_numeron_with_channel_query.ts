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
  // let balance = await dubhe.getBalance();
  // console.log('balance', balance);

  const getTableData = await dubhe.queryChannelTable({
    table: 'position',
    key: []
  });

  // console.log('getTableData', getTableData);
  const xData = Uint8Array.from(getTableData.data[0]);
  const yData = Uint8Array.from(getTableData.data[1]);

  // const parsedStringList = bcs.vector(bcs.u64()).parse(datares);
  const parseData = bcs.u64().parse(xData);
  const parseData1 = bcs.u64().parse(yData);
  console.log('x', parseData);
  console.log('y', parseData1);
}

main().catch(console.error);
