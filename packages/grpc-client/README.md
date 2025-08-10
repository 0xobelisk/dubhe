# @0xobelisk/grpc-client

TypeScript gRPC client for interacting with the Dubhe Indexer using protobuf-ts.

## Features

- 🔍 **Advanced Querying**: Query table data with comprehensive filtering, sorting, and pagination
- 📡 **Real-time Subscription**: Subscribe to table updates and receive real-time data changes
- 🛠️ **Flexible API**: Both simple and advanced query APIs with fluent query builder
- 🔧 **Type-Safe**: Full TypeScript support with generated protobuf types
- 📊 **Rich Filtering**: Support for various filter operators (equals, like, in, between, etc.)
- 📄 **Pagination**: Built-in pagination support with page-based navigation
- 🛠️ **Utility Functions**: Rich utility functions for data processing and filtering
- 🌐 **Web Compatible**: Uses gRPC-Web transport for browser compatibility

## Installation

```bash
npm install @0xobelisk/grpc-client
```

## Quick Start

### Basic Connection

```typescript
import { createDubheGrpcClient } from '@0xobelisk/grpc-client';

const client = createDubheGrpcClient({
  endpoint: '127.0.0.1:8080', // gRPC server endpoint (without http://)
  timeout: 10000,
  enableRetry: true,
  retryAttempts: 3
});

await client.connect();
console.log('Connected successfully!');
```

### Simple Querying

```typescript
// Basic query - get all data with pagination
const response = await client.query('users', {
  pageSize: 10,
  includeTotalCount: true
});

// Query with field selection
const response = await client.query('users', {
  select: ['id', 'name', 'email'],
  pageSize: 20
});

// Query with filtering
const response = await client.query('users', {
  where: {
    status: 'active',
    role: ['admin', 'user'], // IN operator
    age: { min: 18, max: 65 } // BETWEEN operator
  },
  orderBy: [
    { field: 'created_at', direction: 'desc' },
    { field: 'name', direction: 'asc' }
  ],
  page: 1,
  pageSize: 20,
  includeTotalCount: true
});
```

### Advanced Querying

```typescript
import { FilterOperator, SortDirection } from '@0xobelisk/grpc-client';

const response = await client.queryTable({
  tableName: 'users',
  selectFields: ['id', 'name', 'created_at'],
  filters: [
    {
      fieldName: 'name',
      operator: FilterOperator.LIKE,
      value: { stringValue: '%john%' }
    },
    {
      fieldName: 'age',
      operator: FilterOperator.GREATER_THAN,
      value: { intValue: 18 }
    },
    {
      fieldName: 'status',
      operator: FilterOperator.IN,
      value: { stringList: { values: ['active', 'pending'] } }
    }
  ],
  sorts: [
    {
      fieldName: 'created_at',
      direction: SortDirection.DESCENDING,
      priority: 0
    }
  ],
  pagination: {
    page: 1,
    pageSize: 10
  },
  includeTotalCount: true
});
```

### Query Builder (Fluent API)

```typescript
const response = await client
  .createQueryBuilder()
  .tableName('users')
  .select('id', 'name', 'email')
  .where({
    status: 'active',
    role: ['admin', 'user']
  })
  .orderBy('created_at', 'desc')
  .page(1, 15)
  .includeTotalCount(true)
  .execute();
```

### Real-time Subscriptions

```typescript
const subscriptionId = client.subscribeTable(
  ['users', 'posts'], // table names to subscribe to
  {
    onUpdate: (change) => {
      console.log(`Table updated: ${change.table_id}`);
      console.log('New data:', change.data);
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    },
    onConnect: () => {
      console.log('Subscription connected');
    },
    onDisconnect: () => {
      console.log('Subscription disconnected');
    }
  }
);

console.log(`Subscription ID: ${subscriptionId}`);

// Later, unsubscribe
client.unsubscribe(subscriptionId);
```

## Configuration

```typescript
interface DubheGrpcClientConfig {
  endpoint: string; // gRPC server endpoint
  enableRetry?: boolean; // Enable automatic retry (default: true)
  retryAttempts?: number; // Number of retry attempts (default: 3)
  timeout?: number; // Request timeout in ms (default: 30000)
}
```

## Filter Operators

The client supports various filter operators:

```typescript
import { FilterOperator } from '@0xobelisk/grpc-client';

// Available operators:
FilterOperator.EQUALS;
FilterOperator.NOT_EQUALS;
FilterOperator.GREATER_THAN;
FilterOperator.GREATER_THAN_EQUAL;
FilterOperator.LESS_THAN;
FilterOperator.LESS_THAN_EQUAL;
FilterOperator.LIKE;
FilterOperator.NOT_LIKE;
FilterOperator.IN;
FilterOperator.NOT_IN;
FilterOperator.IS_NULL;
FilterOperator.IS_NOT_NULL;
FilterOperator.BETWEEN;
FilterOperator.NOT_BETWEEN;
```

## Utility Functions

### GrpcUtils

```typescript
import { GrpcUtils } from '@0xobelisk/grpc-client';

// Extract field from data
const value = GrpcUtils.extractField(data, 'fieldName');

// Convert protobuf struct to object
const obj = GrpcUtils.structToObject(struct);

// Check if error is gRPC error
if (GrpcUtils.isGrpcError(error, 404)) {
  console.log('Not found error');
}

// Format error for display
const message = GrpcUtils.formatGrpcError(error);
```

### Data Processing Utilities

```typescript
import { DataUtils, QueryUtils, ValidationUtils } from '@0xobelisk/grpc-client';

// Build filters easily
const filters = [
  QueryUtils.equals('status', 'active'),
  QueryUtils.in('role', ['admin', 'user']),
  QueryUtils.like('name', '%john%'),
  QueryUtils.between('age', 18, 65),
  QueryUtils.isNotNull('email')
];

// Data manipulation
const flattened = DataUtils.flatten(nestedObject);
const merged = DataUtils.deepMerge(obj1, obj2);
const picked = DataUtils.pick(object, ['field1', 'field2']);

// Validation
const isValid = ValidationUtils.isValidTableName('users');
const isValidField = ValidationUtils.isValidFieldName('user.name');
```

## Error Handling

```typescript
import { ErrorUtils } from '@0xobelisk/grpc-client';

try {
  const response = await client.query('users');
} catch (error) {
  if (ErrorUtils.isTimeoutError(error)) {
    console.log('Request timed out');
  } else if (ErrorUtils.isConnectionError(error)) {
    console.log('Connection failed');
  } else {
    console.log('Other error:', ErrorUtils.formatError(error));
  }
}
```

## Connection Management

```typescript
// Check connection status
console.log('Status:', client.getStatus()); // 'connected', 'connecting', 'disconnected', 'error'

// Check if connected
if (client.isConnected()) {
  console.log('Client is ready');
}

// Get active subscriptions
console.log('Active subscriptions:', client.getActiveSubscriptionCount());
console.log('Subscription IDs:', client.getActiveSubscriptionIds());

// Disconnect
client.disconnect();
```

## Complete Example

```typescript
import {
  createDubheGrpcClient,
  FilterOperator,
  SortDirection,
  GrpcUtils
} from '@0xobelisk/grpc-client';

async function example() {
  // Create and connect client
  const client = createDubheGrpcClient({
    endpoint: '127.0.0.1:8080',
    timeout: 10000
  });

  await client.connect();

  try {
    // Query data
    const users = await client.query('users', {
      where: { status: 'active' },
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      pageSize: 10,
      includeTotalCount: true
    });

    console.log(`Found ${users.totalCount} users`);
    console.log('Users:', users.data);

    // Subscribe to updates
    const subscriptionId = client.subscribeTable(['users'], {
      onUpdate: (change) => {
        console.log('User updated:', change.data);
      },
      onError: (error) => {
        console.error('Subscription error:', GrpcUtils.formatGrpcError(error));
      }
    });

    // Cleanup on exit
    process.on('SIGINT', () => {
      client.unsubscribe(subscriptionId);
      client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Query failed:', GrpcUtils.formatGrpcError(error));
  }
}

example();
```

## Advanced Types

For advanced usage, you can access the raw protobuf types:

```typescript
import {
  ProtoDubheGrpcClient,
  ProtoQueryRequest,
  ProtoQueryResponse
} from '@0xobelisk/grpc-client';

// Direct access to protobuf client if needed
const protoClient = new ProtoDubheGrpcClient(transport);
```

## Development

### Generate Protobuf Types

```bash
npm run generate
```

This command will:

1. Clean existing proto files
2. Generate new TypeScript types from `.proto` files
3. Format the generated code

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## Migration from v1.x

The v2.x version introduces several breaking changes:

1. **Removed EventEmitter**: Client no longer extends EventEmitter for simpler API
2. **Updated Transport**: Now uses `@protobuf-ts/grpcweb-transport` instead of `@grpc/grpc-js`
3. **Type-safe**: Full TypeScript support with generated protobuf types
4. **Simplified API**: Cleaner method signatures and better error handling

### Before (v1.x)

```typescript
client.on('connect', () => console.log('Connected'));
client.on('error', (error) => console.error(error));
```

### After (v2.x)

```typescript
// Connection status is handled through method calls
await client.connect();
if (client.isConnected()) {
  console.log('Connected');
}

// Error handling through try-catch
try {
  await client.query('table');
} catch (error) {
  console.error(error);
}
```

## License

Apache-2.0
