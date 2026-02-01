# DubheChannel Client

A TypeScript client library for interacting with the Dubhe Channel API, supporting table subscriptions via Server-Sent Events (SSE), table data queries, and transaction submissions.

## Features

- 🔄 **Real-time Subscriptions**: Subscribe to table updates via SSE
- 📊 **Table Queries**: Fetch table data with flexible filtering
- 📤 **Transaction Submission**: Submit transactions to the blockchain
- 🎯 **TypeScript Support**: Full type definitions included
- 🔌 **Connection Management**: Automatic handling of SSE connections
- 🛡️ **Error Handling**: Comprehensive error handling and retry logic

## Installation

```bash
npm install @obelisk/sui-client
```

## Quick Start

```typescript
import { DubheChannelClient } from '@obelisk/sui-client/libs/dubheChannel';

// Initialize the client
const client = new DubheChannelClient({
  baseUrl: 'http://localhost:8080',
  timeout: 30000 // optional, default 30s
});

// Subscribe to table updates
const unsubscribe = await client.subscribeTable(
  {
    dapp_key: 'your_dapp_key::module::Type',
    account: 'account_address', // optional
    table: 'table_name', // optional
    key: [] // optional
  },
  {
    onMessage: (data) => console.log('New data:', data),
    onError: (error) => console.error('Error:', error),
    onOpen: () => console.log('Connected'),
    onClose: () => console.log('Disconnected')
  }
);

// Unsubscribe when done
unsubscribe();
```

## API Reference

### DubheChannelClient

#### Constructor

```typescript
new DubheChannelClient(config: DubheChannelConfig)
```

**Parameters:**

- `config.baseUrl`: Base URL of the Dubhe Channel API
- `config.timeout`: Optional timeout in milliseconds (default: 30000)

#### Methods

##### subscribeTable()

Subscribe to table updates via Server-Sent Events.

```typescript
async subscribeTable(
  params: SubscribeTableParams,
  options?: SubscriptionOptions
): Promise<() => void>
```

**Parameters:**

- `params.dapp_key`: Required. The dapp key identifier
- `params.account`: Optional. Filter by account address
- `params.table`: Optional. Filter by table name
- `params.key`: Optional. Filter by specific key

**Options:**

- `onMessage`: Callback when receiving new data
- `onError`: Callback when an error occurs
- `onOpen`: Callback when connection opens
- `onClose`: Callback when connection closes

**Returns:** Unsubscribe function

**Example:**

```typescript
// Match only dapp_key
const unsubscribe1 = await client.subscribeTable(
  {
    dapp_key: 'dapp::module::Type'
  },
  {
    onMessage: (data) => console.log(data)
  }
);

// Match dapp_key + account
const unsubscribe2 = await client.subscribeTable(
  {
    dapp_key: 'dapp::module::Type',
    account: '0x123...'
  },
  {
    onMessage: (data) => console.log(data)
  }
);

// Match dapp_key + account + table
const unsubscribe3 = await client.subscribeTable(
  {
    dapp_key: 'dapp::module::Type',
    account: '0x123...',
    table: 'my_table'
  },
  {
    onMessage: (data) => console.log(data)
  }
);

// Full match (dapp_key + account + table + key)
const unsubscribe4 = await client.subscribeTable(
  {
    dapp_key: 'dapp::module::Type',
    account: '0x123...',
    table: 'my_table',
    key: []
  },
  {
    onMessage: (data) => console.log(data)
  }
);
```

##### getTable()

Get table data with a single request.

```typescript
async getTable<T = any>(params: GetTableParams): Promise<T>
```

**Parameters:**

- `params.dapp_key`: Required. The dapp key identifier
- `params.account`: Required. Account address
- `params.table`: Required. Table name
- `params.key`: Required. Key array

**Returns:** Promise resolving to table data

**Example:**

```typescript
const data = await client.getTable({
  dapp_key: 'dapp::module::Type',
  account: '0x123...',
  table: 'my_table',
  key: []
});

console.log('Table data:', data);
```

##### submit()

Submit a transaction.

```typescript
async submit<T = any>(params: SubmitTransactionParams): Promise<T>
```

**Parameters:**

- `params.chain`: Blockchain name (e.g., 'sui')
- `params.sender`: Sender address
- `params.nonce`: Transaction nonce
- `params.ptb`: Programmable Transaction Block
- `params.signature`: Transaction signature

**Returns:** Promise resolving to transaction result

**Example:**

```typescript
const result = await client.submit({
  chain: 'sui',
  sender: '0x123...',
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
          objectId: '0xabc...'
        },
        $kind: 'UnresolvedObject'
      }
    ],
    commands: [
      {
        MoveCall: {
          package: '0xdef...',
          module: 'my_module',
          function: 'my_function',
          typeArguments: [],
          arguments: []
        },
        $kind: 'MoveCall'
      }
    ]
  },
  signature: 'base64_signature'
});

console.log('Transaction result:', result);
```

##### getNonce()

Get the nonce for a sender address.

```typescript
async getNonce(params: GetNonceParams): Promise<GetNonceResponse>
```

**Parameters:**

- `params.sender`: Required. The sender address to query nonce for

**Returns:** Promise resolving to nonce response with `nonce` field

**Example:**

```typescript
const nonceData = await client.getNonce({
  sender: '0x15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31'
});

console.log('Current nonce:', nonceData.nonce);
```

##### unsubscribe()

Unsubscribe from a specific subscription.

```typescript
unsubscribe(params: SubscribeTableParams): void
```

##### unsubscribeAll()

Unsubscribe from all active subscriptions.

```typescript
unsubscribeAll(): void
```

##### getActiveSubscriptionCount()

Get the number of active subscriptions.

```typescript
getActiveSubscriptionCount(): number
```

## Advanced Usage

### Multiple Subscriptions

You can maintain multiple subscriptions simultaneously:

```typescript
const unsubscribes: Array<() => void> = [];

// Subscribe to multiple filters
unsubscribes.push(await client.subscribeTable({ dapp_key: 'key1' }, { onMessage: console.log }));
unsubscribes.push(await client.subscribeTable({ dapp_key: 'key2' }, { onMessage: console.log }));

console.log(`Active: ${client.getActiveSubscriptionCount()}`);

// Unsubscribe all
unsubscribes.forEach((unsub) => unsub());
// Or: client.unsubscribeAll();
```

### Error Handling and Reconnection

Implement custom error handling and reconnection logic:

```typescript
async function subscribeWithRetry(params: SubscribeTableParams, maxRetries = 3) {
  let retries = 0;

  const subscribe = async (): Promise<() => void> => {
    try {
      return await client.subscribeTable(params, {
        onMessage: (data) => console.log('Data:', data),
        onError: async (error) => {
          console.error('Stream error:', error);
          if (retries < maxRetries) {
            retries++;
            console.log(`Retrying... (${retries}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            await subscribe();
          }
        },
        onClose: () => {
          console.log('Connection closed');
        }
      });
    } catch (error) {
      if (retries < maxRetries) {
        retries++;
        console.log(`Reconnecting... (${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
        return subscribe();
      }
      throw error;
    }
  };

  return subscribe();
}
```

### Type-Safe Table Data

Define your table data types for better type safety:

```typescript
interface CounterData {
  value: number;
  timestamp: number;
}

const data = await client.getTable<CounterData>({
  dapp_key: 'counter::module::Type',
  account: '0x123...',
  table: 'counter',
  key: []
});

// data is now typed as CounterData
console.log(data.value);
```

## Testing

You can test the client against a local Dubhe Channel server:

```bash
# Start the Dubhe Channel server
# (Assuming it's running on http://localhost:8080)

# Run the examples
npm run test:dubhe-channel
```

## License

MIT

## Related

- [test_subscribe.sh](../../../scripts/test_subscribe.sh) - Shell script examples
- [Dubhe Documentation](https://github.com/obelisk/dubhe)
