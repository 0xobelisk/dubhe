import { NetworkType, Dubhe, bcs } from '../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const packageId = 'init1rr8dwsgw7wtmx33n3v8uqmm6msfcm06glyvufp';
  const privateKey = process.env.PRIVATE_KEY;
  const mnemonics = process.env.MNEMONICS;
  const dubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
    // secretKey: privateKey,
    // mnemonics: mnemonics,
  });

  let myInitiaAddr = dubhe.getAddress();
  let myHexAddr = dubhe.getHexAddress();
  let myBalance = await dubhe.getBalance();
  // 'init1xhsl2nexa67fujmr3vfytk8s8zh4sjxugagz5p'
  console.log(`Initia Addr: ${myInitiaAddr}`);
  console.log(`Hex Addr: ${myHexAddr}`);
  console.log(`Balance: ${myBalance}`);

  const newDubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
    secretKey: dubhe.getSigner().privateKey.toString('hex'),
  });
  console.log(newDubhe.getSigner().privateKey.toString('hex'));

  let newInitiaAddr = newDubhe.getAddress();
  let newHexAddr = newDubhe.getHexAddress();
  let newBalance = await newDubhe.getBalance();
  // 'init1xhsl2nexa67fujmr3vfytk8s8zh4sjxugagz5p'
  console.log(`Initia Addr: ${newInitiaAddr}`);
  console.log(`Hex Addr: ${newHexAddr}`);
  console.log(`Balance: ${newBalance}`);
}

init();
