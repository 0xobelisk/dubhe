import { NetworkType, Dubhe } from '../src';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const dubhe = new Dubhe({
    networkType: network
  });
  console.log(dubhe.getNetworkConfig());
}

init();
