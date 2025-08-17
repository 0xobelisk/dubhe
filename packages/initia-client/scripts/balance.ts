import { NetworkType, Dubhe } from '../src';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const packageId = 'init1rr8dwsgw7wtmx33n3v8uqmm6msfcm06glyvufp';

  const dubhe = new Dubhe({
    networkType: network,
    packageId: packageId
    // secretKey: privateKey,
    // mnemonics: mnemonics,
  });

  const myInitiaAddr = dubhe.getAddress();
  const myHexAddr = dubhe.getHexAddress();
  const myBalance = await dubhe.getBalance();
  // 'init1xhsl2nexa67fujmr3vfytk8s8zh4sjxugagz5p'
  console.log(`Initia Addr: ${myInitiaAddr}`);
  console.log(`Hex Addr: ${myHexAddr}`);
  console.log(`Balance: ${myBalance}`);

  const newDubhe = new Dubhe({
    networkType: network,
    packageId: packageId,
    secretKey: dubhe.getSigner().privateKey.toString('hex')
  });
  console.log(newDubhe.getSigner().privateKey.toString('hex'));

  const newInitiaAddr = newDubhe.getAddress();
  const newHexAddr = newDubhe.getHexAddress();
  const newBalance = await newDubhe.getBalance();
  // 'init1xhsl2nexa67fujmr3vfytk8s8zh4sjxugagz5p'
  console.log(`Initia Addr: ${newInitiaAddr}`);
  console.log(`Hex Addr: ${newHexAddr}`);
  console.log(`Balance: ${newBalance}`);
}

init();
