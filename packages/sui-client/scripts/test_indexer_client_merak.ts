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
import * as dotenv from 'dotenv';
dotenv.config();

let sub: WebSocket;

async function init() {
  const network = 'testnet';
  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    secretKey: privateKey
  });

  console.log('Current Address:', dubhe.getAddress());
  // Cursor pagination example (forward and backward)
  console.log('\n=== Cursor Pagination Example ===');
  const pageSize = 1;
  // Get middle page data
  let middlePage = await dubhe.getTransactions({
    functionName: ['swap_exact_tokens_for_tokens']
  });

  console.log('Current Page Data:', JSON.stringify(middlePage, null, 2));
}

init().catch(console.error);
