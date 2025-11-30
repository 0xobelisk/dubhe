import { createClient } from '../src/sui/client';
import dubheMetadata from '../tests/__mocks__/dubhe.config.json';
import metadata from '../tests/__mocks__/metadata.json';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const { contract, graphqlClient, grpcClient, ecsWorld } = createClient({
    network: 'testnet',
    packageId: '0xca6c2ae2524851fa389c3213435a0c835d08e21c4ecd9c08decfd3d5635f45c',
    metadata,
    dubheMetadata,
    credentials: {
      secretKey: process.env.PRIVATE_KEY
    }
  });

  const address = contract.getAddress();
  console.log(address);

  const balance = await contract.getBalance();
  console.log(balance);
}

main();
