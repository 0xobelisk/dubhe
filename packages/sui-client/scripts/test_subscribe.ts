import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs,
  SubscriptionKind,
} from '../src/index';
import * as process from 'process';
import * as dotenv from 'dotenv';
dotenv.config();

let sub: WebSocket;

async function init() {
  const network = 'localnet';

  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    secretKey: privateKey,
  });

  console.log('Current Address:', dubhe.getAddress());

  const sender =
    '0x1fe342c436eff7ed90988fbe3a85aea7d922517ab6d9bc86e800025f8afcba7a';
  const myAddress =
    '0x95a99e27a30c993dc82c78cc8285643ab81a12a73a46882afb35bd2d5d5c47ed';

  sub = await dubhe.subscribe({
    types: [
      {
        kind: SubscriptionKind.Event,
        sender:
          '0x1fe342c436eff7ed90988fbe3a85aea7d922517ab6d9bc86e800025f8afcba7a',
      },
      {
        kind: SubscriptionKind.Schema,
        name: 'account',
      },
    ],
    handleData: (data) => {
      console.log('Received message: ', data);
    },
    onOpen: () => {
      console.log('Connected to the WebSocket server');
    },
    onClose: () => {
      console.log('Disconnected from the WebSocket server');
    },
  });
}

init().catch(console.error);
