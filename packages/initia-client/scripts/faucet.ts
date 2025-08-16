import { NetworkType, Dubhe } from '../src';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const packageId = 'init1rr8dwsgw7wtmx33n3v8uqmm6msfcm06glyvufp';
  const dubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
  });

  const myInitiaAddr = dubhe.getAddress();
  const myHexAddr = dubhe.getHexAddress();

  console.log(`Initia Addr: ${myInitiaAddr}`);
  console.log(`Hex Addr: ${myHexAddr}`);
  const result = await dubhe.requestFaucet();
  console.log(result);
  await delay(10000);
  // 'init1xhsl2nexa67fujmr3vfytk8s8zh4sjxugagz5p'

  const myBalance = await dubhe.getBalance();
  console.log(`Balance: ${myBalance}`);
}

init();
