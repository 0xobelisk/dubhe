/**
 * Example usage of DubheChannelClient
 *
 * This file demonstrates how to use the DubheChannel library
 * based on the test cases in test_subscribe.sh
 */

import { DubheChannelClient } from './client';
import type { SubscribeTableParams, TableEventData } from './types';

// Initialize client
const client = new DubheChannelClient({
  baseUrl: 'http://localhost:8080',
  timeout: 30000
});

/**
 * Example 1: Subscribe to table updates - Match only dapp_key
 */
async function exampleSubscribeDappKeyOnly() {
  const params: SubscribeTableParams = {
    dapp_key: '8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey'
  };

  const unsubscribe = await client.subscribeTable(params, {
    onOpen: () => {
      console.log('✅ Connected to subscription');
    },
    onMessage: (data: TableEventData) => {
      console.log('📨 Received data:', data);
    },
    onError: (error: Error) => {
      console.error('❌ Subscription error:', error);
    },
    onClose: () => {
      console.log('🔌 Subscription closed');
    }
  });

  // Unsubscribe after some time or on specific condition
  // setTimeout(() => {
  //   unsubscribe();
  // }, 60000);

  return unsubscribe;
}

/**
 * Example 2: Subscribe to table updates - Match dapp_key + account
 */
async function exampleSubscribeDappKeyAndAccount() {
  const params: SubscribeTableParams = {
    dapp_key: '707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33::dapp_key::DappKey',
    account: '15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31'
  };

  const unsubscribe = await client.subscribeTable(params, {
    onMessage: (data) => {
      console.log('Received update for specific account:', data);
    }
  });

  return unsubscribe;
}

/**
 * Example 3: Subscribe to table updates - Match dapp_key + account + table
 */
async function exampleSubscribeDappKeyAccountAndTable() {
  const params: SubscribeTableParams = {
    dapp_key: '707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33::dapp_key::DappKey',
    account: '15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31',
    table: 'counter2'
  };

  const unsubscribe = await client.subscribeTable(params, {
    onMessage: (data) => {
      console.log('Received update for specific table:', data);
    }
  });

  return unsubscribe;
}

/**
 * Example 4: Subscribe to table updates - Full match (dapp_key + account + table + key)
 */
async function exampleSubscribeFullMatch() {
  const params: SubscribeTableParams = {
    dapp_key: '8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey',
    account: '15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31',
    table: 'counter2',
    key: []
  };

  const unsubscribe = await client.subscribeTable(params, {
    onMessage: (data) => {
      console.log('Received update for specific key:', data);
    }
  });

  return unsubscribe;
}

/**
 * Example 5: Get table data
 */
async function exampleGetTable() {
  try {
    const data = await client.getTable({
      dapp_key:
        '8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey',
      account: '8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614',
      table: 'dapp_fee_config',
      key: []
    });

    console.log('📦 Table data:', data);
    return data;
  } catch (error) {
    console.error('Failed to get table data:', error);
    throw error;
  }
}

/**
 * Example 6: Submit transaction
 */
async function exampleSubmitTransaction() {
  try {
    const result = await client.submit({
      chain: 'sui',
      sender: '0x15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31',
      nonce: 123,
      ptb: {
        version: 2,
        sender: null,
        expiration: null,
        gasData: {
          budget: null,
          price: null,
          owner: null,
          payment: null
        },
        inputs: [
          {
            UnresolvedObject: {
              objectId: '0x8460e77cb4975a3110dd2a14d675720cfffef38ea41d96d1fd73b99c77c8bbbe'
            },
            $kind: 'UnresolvedObject'
          },
          {
            Pure: {
              bytes: 'Aw=='
            },
            $kind: 'Pure'
          }
        ],
        commands: [
          {
            MoveCall: {
              package: '0x707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33',
              module: 'counter_system',
              function: 'inc',
              typeArguments: [],
              arguments: [
                { Input: 0, type: 'object', $kind: 'Input' },
                { Input: 1, type: 'pure', $kind: 'Input' }
              ]
            },
            $kind: 'MoveCall'
          }
        ]
      },
      signature: 'base64_encoded_signature_placeholder'
    });

    console.log('✅ Transaction submitted:', result);
    return result;
  } catch (error) {
    console.error('Failed to submit transaction:', error);
    throw error;
  }
}

/**
 * Example 7: Multiple subscriptions
 */
async function exampleMultipleSubscriptions() {
  const subscriptions: Array<() => void> = [];

  // Subscribe to multiple different filters
  const unsubscribe1 = await client.subscribeTable(
    {
      dapp_key:
        '8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey'
    },
    {
      onMessage: (data) => console.log('Subscription 1:', data)
    }
  );
  subscriptions.push(unsubscribe1);

  const unsubscribe2 = await client.subscribeTable(
    {
      dapp_key:
        '707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33::dapp_key::DappKey',
      account: '15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31'
    },
    {
      onMessage: (data) => console.log('Subscription 2:', data)
    }
  );
  subscriptions.push(unsubscribe2);

  console.log(`Active subscriptions: ${client.getActiveSubscriptionCount()}`);

  // Unsubscribe all at once
  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    // Or use: client.unsubscribeAll();
  };
}

/**
 * Example 8: Error handling
 */
async function exampleErrorHandling() {
  try {
    const unsubscribe = await client.subscribeTable(
      {
        dapp_key: 'test::key::Key'
      },
      {
        onMessage: (data) => {
          console.log('Data:', data);
        },
        onError: (error) => {
          console.error('Stream error:', error);
          // Handle error, maybe reconnect
        },
        onClose: () => {
          console.log('Connection closed, attempting to reconnect...');
          // Implement reconnection logic here
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe:', error);
    throw error;
  }
}

// Export examples for use
export {
  exampleSubscribeDappKeyOnly,
  exampleSubscribeDappKeyAndAccount,
  exampleSubscribeDappKeyAccountAndTable,
  exampleSubscribeFullMatch,
  exampleGetTable,
  exampleSubmitTransaction,
  exampleMultipleSubscriptions,
  exampleErrorHandling
};

// If running directly
if (require.main === module) {
  console.log('DubheChannel Client Examples');
  console.log('Run specific example functions to test the client');
}
