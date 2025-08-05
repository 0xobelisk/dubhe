# @0xobelisk/grpc-client

TypeScript gRPC client for interacting with the Dubhe Indexer.

## Features

- 🔍 **Advanced Querying**: Query table data with comprehensive filtering, sorting, and pagination
- 📡 **Real-time Subscription**: Subscribe to table updates and receive real-time data changes
- 🛠️ **Flexible API**: Both simple and advanced query APIs with fluent query builder
- 🔄 **Connection Management**: Automatic reconnection and error handling
- 📊 **Rich Filtering**: Support for various filter operators (equals, like, in, between, etc.)
- 📄 **Pagination**: Built-in pagination support with cursor and page-based navigation
- 🛠️ **Utility Functions**: Rich utility functions for data processing and filtering

## Installation

```bash
npm install @0xobelisk/grpc-client
```

## Quick Start

### Basic Connection

```typescript
import { createDubheGrpcClient } from '@0xobelisk/grpc-client';

const client = createDubheGrpcClient({
  endpoint: 'http://127.0.0.1:50051',
  timeout: 10000,
  enableRetry: true,
  retryAttempts: 3,
});

await client.connect();
```

### Simple Querying

```typescript
// Basic query - get all data with pagination
const response = await client.query('users', {
  pageSize: 10,
  includeTotalCount: true,
});

// Query with field selection
const response = await client.query('users', {
  select: ['id', 'name', 'email'],
  pageSize: 20,
});

// Query with simple filtering
const response = await client.query('users', {
  where: {
    status: 'active',
    role: ['admin', 'user'], // IN operator
    age: { min: 18, max: 65 }, // BETWEEN operator
  },
  orderBy: [
    { field: 'created_at', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ],
  page: 1,
  pageSize: 50,
});
```

### Advanced Querying

```typescript
import { FilterOperator } from '@0xobelisk/grpc-client';

// Advanced query with custom operators
const response = await client.queryTable({
  tableName: 'posts',
  selectFields: ['id', 'title', 'content', 'created_at'],
  filters: [
    {
      fieldName: 'title',
      operator: FilterOperator.LIKE,
      value: { stringValue: '%tutorial%' },
    },
    {
      fieldName: 'views',
      operator: FilterOperator.GREATER_THAN,
      value: { intValue: 1000 },
    },
    {
      fieldName: 'category',
      operator: FilterOperator.IN,
      value: { stringList: { values: ['tech', 'programming'] } },
    },
  ],
  sorts: [
    {
      fieldName: 'created_at',
      direction: 'DESCENDING',
      priority: 0,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
  },
  includeTotalCount: true,
});
```

### Query Builder (Fluent API)

```typescript
const queryBuilder = client.createQueryBuilder();

const query = queryBuilder
  .tableName('products')
  .select('id', 'name', 'price', 'category')
  .where({
    category: 'electronics',
    price: { min: 100, max: 1000 },
    inStock: true,
  })
  .orderBy('price', 'asc')
  .page(1, 25)
  .build();

const response = await client.queryTable(query);
```

### Real-time Subscriptions

```typescript
const subscriptionId = client.subscribeTable(['users', 'posts'], {
  onUpdate: (change) => {
    console.log('Table changed:', change.tableId);
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
  },
});

// Later, unsubscribe
client.unsubscribe(subscriptionId);
```

## API Reference

### Client Configuration

```typescript
interface DubheGrpcClientConfig {
  endpoint: string; // gRPC server endpoint
  enableRetry?: boolean; // Enable retry on failure (default: true)
  retryAttempts?: number; // Number of retry attempts (default: 3)
  timeout?: number; // Request timeout in milliseconds (default: 30000)
}
```

### Query Options

```typescript
interface SimpleQueryOptions {
  select?: string[]; // Fields to select
  where?: SimpleFilter; // Filter conditions
  orderBy?: string | { field: string; direction?: 'asc' | 'desc' }[]; // Sort specifications
  page?: number; // Page number (1-based)
  pageSize?: number; // Items per page
  offset?: number; // Offset-based pagination
  includeTotalCount?: boolean; // Include total count
}
```

### Filter Types

```typescript
// Simple filter format
interface SimpleFilter {
  [fieldName: string]:
    | string
    | number
    | boolean
    | null // Direct equality
    | string[]
    | number[] // IN operator
    | { min: number | string; max: number | string } // BETWEEN operator
    | { operator: FilterOperator; value: any }; // Custom operator
}

// Available filter operators
enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_EQUAL = 'GREATER_THAN_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_EQUAL = 'LESS_THAN_EQUAL',
  LIKE = 'LIKE', // Pattern matching
  NOT_LIKE = 'NOT_LIKE',
  IN = 'IN', // Value in list
  NOT_IN = 'NOT_IN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  BETWEEN = 'BETWEEN', // Value between range
  NOT_BETWEEN = 'NOT_BETWEEN',
}
```

## Utility Functions

### Filter Helpers

```typescript
import { FilterHelpers } from '@0xobelisk/grpc-client';

// Create common filter conditions
const filters = [
  FilterHelpers.equals('status', 'active'),
  FilterHelpers.greaterThan('age', 18),
  FilterHelpers.like('name', '%john%'),
  FilterHelpers.in('category', ['tech', 'science']),
  FilterHelpers.between('price', 10, 100),
  FilterHelpers.isNotNull('email'),
];
```

### Data Processing

```typescript
import {
  GrpcUtils,
  parseDataRows,
  filterRows,
  sortRows,
  groupByField,
} from '@0xobelisk/grpc-client';

// Parse and process response data
const response = await client.query('users');
const parsedRows = parseDataRows(response.rows);

// Filter data client-side
const activeUsers = filterRows(response.rows, { status: 'active' });

// Sort data client-side
const sortedUsers = sortRows(response.rows, 'created_at', 'desc');

// Group data by field
const usersByRole = groupByField(response.rows, 'role');

// Extract specific fields
const userEmails = extractFields(response.rows, ['email']);
```

## Error Handling

```typescript
try {
  await client.connect();
  const response = await client.query('users');
} catch (error) {
  if (error.message.includes('Connection failed')) {
    // Handle connection errors
  } else if (error.message.includes('Query failed')) {
    // Handle query errors
  }
}

// Listen for client events
client.on('connect', () => console.log('Connected'));
client.on('disconnect', () => console.log('Disconnected'));
client.on('error', (error) => console.error('Client error:', error));
```

## Pagination Examples

### Page-based Pagination

```typescript
let currentPage = 1;
const pageSize = 20;

do {
  const response = await client.query('users', {
    page: currentPage,
    pageSize,
    includeTotalCount: true,
  });

  console.log(`Page ${currentPage}/${response.pagination?.totalPages}`);
  console.log(`Items: ${response.rows.length}`);

  if (!response.pagination?.hasNextPage) break;
  currentPage++;
} while (currentPage <= 5); // Limit to first 5 pages
```

### Offset-based Pagination

```typescript
let offset = 0;
const limit = 50;

const response = await client.query('users', {
  offset,
  pageSize: limit,
  orderBy: 'id',
});
```

## Advanced Examples

### Complex Filtering

```typescript
// Multiple condition types
const response = await client.query('orders', {
  where: {
    status: 'completed', // Equals
    amount: { min: 100, max: 1000 }, // Between
    category: ['electronics', 'books'], // In
    customer_type: {
      operator: FilterOperator.NOT_EQUALS,
      value: 'guest',
    },
    created_at: {
      operator: FilterOperator.GREATER_THAN,
      value: '2024-01-01',
    },
  },
  orderBy: [
    { field: 'amount', direction: 'desc' },
    { field: 'created_at', direction: 'asc' },
  ],
  pageSize: 100,
});
```

### Real-time Data Processing

```typescript
const subscriptionId = client.subscribeTable(['live_events'], {
  onUpdate: (change) => {
    // Process real-time updates
    const eventData = change.data;

    // Extract specific fields
    const eventType = GrpcUtils.extractField(eventData, 'event_type');
    const timestamp = GrpcUtils.extractField(eventData, 'timestamp');

    // Handle different event types
    switch (eventType) {
      case 'user_login':
        handleUserLogin(eventData);
        break;
      case 'order_created':
        handleOrderCreated(eventData);
        break;
    }
  },
  onError: (error) => {
    console.error('Subscription error:', error);
    // Implement retry logic
  },
});
```

## TypeScript Support

This package is written in TypeScript and provides full type safety:

```typescript
import {
  DubheGrpcClient,
  QueryResponse,
  TableChange,
  FilterOperator,
  PaginationResponse,
} from '@0xobelisk/grpc-client';

// All types are fully typed
const client: DubheGrpcClient = createDubheGrpcClient(config);
const response: QueryResponse = await client.query('users');
const pagination: PaginationResponse | undefined = response.pagination;
```

## License

MIT
