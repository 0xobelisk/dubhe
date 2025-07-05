import {
  NetworkType,
  Dubhe,
  PendingTransactionResponse,
  Network,
} from '../src';
import { loadMetadata } from '../src/metadata/index';
import dotenv from 'dotenv';
dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const network = 'localnet' as NetworkType;
  const dubhe = new Dubhe({
    networkType: network,
  });
  console.log(dubhe.getNetworkConfig());
}

init();
