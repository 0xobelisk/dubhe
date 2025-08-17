import { Dubhe, NetworkType, JsonPathOrder } from '../src';
import * as process from 'process';
import * as dotenv from 'dotenv';
dotenv.config();

let sub: WebSocket;

async function init() {
  const network = 'localnet';
  const packageId = '0x6ba985228d38977f727c9a87d88a5b85db6edf4a6feb3a42fdf6302b35901ec6';

  const schemaId = '0xd6c1017d617907664174f4e4a323d8a4413c692a89881e0c8564277907317001';

  // const metadata = await loadMetadata(network as NetworkType, packageId);

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    // metadata: metadata,
    secretKey: privateKey
  });

  console.log('Current Address:', dubhe.getAddress());
  // Cursor pagination example (forward and backward)
  console.log('\n=== Cursor Pagination Example ===');
  const pathOrder: JsonPathOrder = {
    path: 'move_count',
    direction: 'DESC'
  };
  const result = await dubhe.getStorage({
    name: 'stats',
    jsonOrderBy: [
      {
        path: 'move_count',
        direction: 'DESC'
      }
    ],
    first: 2
  });
  console.log(JSON.stringify(result, null, 2));
}

init().catch(console.error);
