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
  const network = 'localnet';
  const packageId = '0xa0fa14dd414146e499963baa5260a8d6ba5d11b519f57ed7caee2709d20bab3f';

  const schemaId = '0xea7a58fc55d8e767eabe0501245dc17f3587a2ff85d007584ed7fde97d06e211';

  const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey
  });

  console.log('Current Address:', dubhe.getAddress());
  // Cursor pagination example (forward and backward)
  console.log('\n=== Cursor Pagination Example ===');
  const pageSize = 1;
  // Get middle page data
  let middlePage = await dubhe.getStorage({
    name: 'counter'
  });

  console.log('Current Page Data:', middlePage);
}

init().catch(console.error);
