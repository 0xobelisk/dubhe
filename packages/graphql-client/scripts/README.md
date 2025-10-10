# DubheGraphqlClient

Powerful GraphQL client designed specifically for Dubhe indexer, supporting complete CRUD operations and real-time subscription functionality.

## ✨ Key Features

- 🔄 **Real-time Subscriptions**: Supports PostGraphile's `listen` subscription functionality
- 📊 **Advanced Filtering**: Powerful filtering and sorting capabilities
- 🚀 **Performance Optimization**: Built-in retry mechanisms and caching strategies
- 📱 **Cross-platform**: Supports both browser and Node.js environments
- 🛡️ **Type Safety**: Complete TypeScript support

## 🚀 Quick Start

### Installation

```bash
npm install @0xobelisk/graphql-client
```

### Basic Usage

```typescript
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';

const client = createDubheGraphqlClient({
  endpoint: 'http://localhost:4000/graphql',
  subscriptionEndpoint: 'ws://localhost:4000/graphql'
});

// Query data
const accounts = await client.getAllTables('accounts', {
  first: 10,
  filter: { balance: { greaterThan: '1000' } },
  orderBy: [{ field: 'balance', direction: 'DESC' }]
});

console.log(accounts);
```

## 📡 Real-time Subscription Features

### PostGraphile Listen Subscriptions

```typescript
// Basic listen subscription
const subscription = client.subscribeToTableChanges('encounters', {
  initialEvent: true, // Get initial data immediately
  fields: ['player', 'monster', 'catchAttempts'],
  onData: (data) => {
    console.log('Real-time data:', data.listen.query.encounters);
  }
});

// Advanced subscription with filtering
const filteredSub = client.subscribeToTableChanges('accounts', {
  filter: { balance: { greaterThan: '1000' } },
  initialEvent: true,
  orderBy: [{ field: 'balance', direction: 'DESC' }],
  first: 5
});
```

## 🔍 Query Features

### Basic Queries

```typescript
// Query all accounts
const accounts = await client.getAllTables('accounts');

// Query with pagination and filtering
const filteredAccounts = await client.getAllTables('accounts', {
  first: 20,
  after: 'cursor_string',
  filter: {
    balance: { greaterThan: '0' },
    assetId: { startsWith: '0x' }
  },
  orderBy: [{ field: 'createdAtTimestampMs', direction: 'DESC' }]
});

// Conditional query for single record
const account = await client.getTableByCondition('accounts', {
  assetId: '0x123...',
  account: '0xabc...'
});
```

### Batch Queries

```typescript
const results = await client.batchQuery([
  { key: 'encounters', tableName: 'encounters', params: { first: 5 } },
  { key: 'accounts', tableName: 'accounts', params: { first: 10 } }
]);
```

## ⚙️ Configuration Options

### Client Configuration

```typescript
const client = createDubheGraphqlClient({
  endpoint: 'http://localhost:4000/graphql',
  subscriptionEndpoint: 'ws://localhost:4000/graphql',
  headers: {
    Authorization: 'Bearer token'
  },
  retryOptions: {
    delay: { initial: 500, max: 10000 },
    attempts: { max: 3 }
  }
});
```

### Cache Configuration

```typescript
const client = createDubheGraphqlClient({
  endpoint: 'http://localhost:4000/graphql',
  cacheConfig: {
    paginatedTables: ['accounts', 'encounters'],
    customMergeStrategies: {
      accounts: {
        keyArgs: ['filter'],
        merge: (existing, incoming) => {
          return {
            ...incoming,
            edges: [...(existing?.edges || []), ...incoming.edges]
          };
        }
      }
    }
  }
});
```

## 📚 Multi-table Subscriptions

```typescript
const multiTableSub = client.subscribeToMultipleTables(
  [
    {
      tableName: 'encounters',
      options: {
        initialEvent: true,
        fields: ['player', 'monster'],
        first: 5
      }
    },
    {
      tableName: 'accounts',
      options: {
        initialEvent: true,
        fields: ['account', 'balance'],
        filter: { balance: { greaterThan: '0' } }
      }
    }
  ],
  {
    onData: (allData) => {
      console.log('Multi-table data:', allData);
    }
  }
);
```

## 🛠️ Development Guide

```bash
# Development
npm run dev

# Build
npm run build

# Test
npm run test
```

## 🔧 Best Practices

1. **Use listen subscriptions for real-time updates**
2. **Properly use filtering and pagination**
3. **Error handling and reconnection**
4. **Subscribe only to needed fields**

See the `examples.ts` file for more complete usage examples.
