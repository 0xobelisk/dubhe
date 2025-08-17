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
  const packageId = '0xa8eb81d7052aff197610de4a3aab09cdc6da7dbd6d35fa377fc8d88cb187e92b';

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

  const schemaId = '0x9e1cb662ee1c9861fea0349b62beb359e591e5e0e94b50fe01870be4d4444af9';

  const tx = new Transaction();

  await dubhe.tx.counter_migrate.migrate_to_v2({
    tx: tx,
    params: [tx.object(schemaId), tx.pure.address(packageId), tx.pure.u32(2)],
    onSuccess: (result) => {
      console.log(`Migration Transaction Digest: ${result.digest}`);
    },
    onError: (error) => {
      console.log('Migration failed!');
      console.error(error);
    }
  });
}

init();
