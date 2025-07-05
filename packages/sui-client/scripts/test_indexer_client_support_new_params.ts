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
import * as dotenv from 'dotenv';
dotenv.config();

let sub: WebSocket;

async function init() {
  const network = 'testnet';

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    indexerUrl: 'http://127.0.0.1:3002',
  });

  console.log('Current Address:', dubhe.getAddress());
  const orderBy = ['ID_ASC'];
  // Cursor pagination example (forward and backward)
  console.log('\n=== Cursor Pagination Example ===');
  const pageSize = 1;
  // Get middle page data
  let middlePage = await dubhe.getStorage({
    name: 'position',
    value: { x: '11', y: '3' },
    first: pageSize,
    // after: undefined,
    orderBy,
  });
  // let total = pageSize;

  console.log('Current Page Data:', middlePage);
  // console.log('Page Info:', middlePage.pageInfo);

  // // Get next page
  // while (middlePage.pageInfo.hasNextPage) {
  //   const nextPage = await dubhe.getStorage({
  //     name: 'position',
  //     first: pageSize,
  //     after: middlePage.pageInfo.endCursor,
  //     orderBy,
  //   });
  //   console.log('\nNext Page Data:', JSON.stringify(nextPage, null, 2));
  //   // console.log('Page Info:', nextPage.pageInfo);
  //   // console.log('Total Count:', nextPage.totalCount);
  //   middlePage = nextPage;
  //   total += nextPage.value.length;
  // }

  // // sub = await dubhe.subscribe(
  // //   ['monster_catch_attempt_event', 'position'],
  // //   (data) => {
  // //     console.log(`Received message: `, data);
  // //   }
  // // );

  // //   console.log(JSON.stringify(response2, null, 2));
  console.log('Double Check Total Count:', middlePage.totalCount);

  const response = await dubhe.getStorageItem({
    name: 'position',
    key1: '0x379aa1cc401f024e2fee2ea25bdb85e48355491bd6fcaf685e39a7fcc84b2101',
    // is_removed: false,
    value: { x: '11', y: '3' },
  });
  console.log(response);
}

init().catch(console.error);
