import { NetworkType, Dubhe } from '../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const NETWORK: NetworkType = 'localnet';

  const PACKAGE_ID = '0x44349b49ff0d95d9f45d3e183d226512ac70f8f6';

  const metadata = await loadMetadata(NETWORK, PACKAGE_ID);
  const dubhe = new Dubhe({
    networkType: NETWORK,
    packageId: PACKAGE_ID,
    metadata: metadata,
  });
  const query_value = await dubhe.query.counter.value();
  console.log(query_value);
}

init();
