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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const subscribe = async (dubhe: Dubhe) => {
  sub = await dubhe.subscribe({
    types: [
      {
        kind: SubscriptionKind.Event,
      },
    ],
    handleData: (data) => {
      console.log('Received message: ', data);
    },
    onOpen: () => {
      console.log('Connected to the WebSocket server');
    },
    onClose: async () => {
      console.log('Trying to reconnect...');
      await delay(1000);
      await subscribe(dubhe);
    },
  });
};

async function init() {
  const dubhe = new Dubhe();

  console.log('Current Address:', dubhe.getAddress());

  await subscribe(dubhe);
}

init().catch(console.error);
