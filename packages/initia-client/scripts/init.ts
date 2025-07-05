import { NetworkType, Dubhe, bcs } from './../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const packageId = 'init1rr8dwsgw7wtmx33n3v8uqmm6msfcm06glyvufp';
  const metadata = await loadMetadata(network, packageId);
  const privateKey = process.env.PRIVATE_KEY;
  const dubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
    metadata: metadata,
    secretKey: privateKey,
  });

  let myInitiaAddr = dubhe.getAddress();
  let myHexAddr = dubhe.getHexAddress();
  let myBalance = await dubhe.getBalance();
  console.log(`Initia Addr: ${myInitiaAddr}`);
  console.log(`Hex Addr: ${myHexAddr}`);
  console.log(`Balance: ${myBalance}`);

  console.log('======= query content value ========');
  const content = await dubhe.query.read_write.read();
  console.log(content);

  console.log('======= write content value ========');
  const res1 = await dubhe.tx.read_write.write({
    sender: myHexAddr,
    params: [bcs.string().serialize('reset new content!').toBase64()],
  });
  console.log(res1);
  await delay(6000);

  console.log('======= query content value after rewrite ========');
  const content2 = await dubhe.query.read_write.read();
  console.log(content2);
}

init();
