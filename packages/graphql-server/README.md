# 🚀 Universal GraphQL Server

An intelligent GraphQL server adapter that can automatically connect to databases created by `dubhe-indexer` and dynamically generate complete GraphQL APIs.

## ✨ Core Features

### 🎯 Intelligent Database Adaptation

- **Dynamic Scanning**: Automatically scans all table structures created by `dubhe-indexer`
- **PostGraphile Powered**: Based on the powerful PostGraphile to automatically generate GraphQL APIs
- **Zero Configuration**: No need to manually define schemas, automatically inferred from existing databases

### 🔍 Advanced Filtering Features

- **Rich Operators**: Supports 20+ filtering operators including equals, greater than, less than, contains, fuzzy matching, etc.
- **Logical Combinations**: Supports AND, OR, NOT logical operators for complex condition combinations
- **Full Field Filtering**: Automatically generates corresponding filters for all fields
- **Type Intelligence**: Automatically provides appropriate filtering operators based on field types
- **Relationship Filtering**: Supports filtering based on related table fields

### 📈 Enhanced Sorting and Pagination

- **Full Field Sorting**: Supports ascending/descending sorting on any field
- **Multi-Field Sorting**: Supports sorting by multiple fields simultaneously
- **Efficient Pagination**: Relay-style cursor pagination and offset pagination
- **Performance Optimization**: Intelligent query optimization and index suggestions

### 📡 Real-time Features

- **WebSocket Support**: Complete GraphQL subscription functionality
- **Real-time Queries**: PostGraphile Live Queries support
- **Data Monitoring**: Optional database change monitoring

### 🛠️ Developer Experience

- **GraphiQL**: Built-in GraphQL query interface
- **Auto Documentation**: API documentation automatically generated based on database structure
- **Type Safety**: Complete TypeScript support
- **Beautiful Interface**: Modern welcome page and information display

## 📦 Installation

```bash
# Enter project directory
cd packages/universal-graphql-server

# Install dependencies
pnpm install

# Or use npm
npm install
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# Database configuration (connect to dubhe-indexer database)
DATABASE_URL=postgres://username:password@localhost:5432/sui_indexer_db

# Server configuration
PORT=4000
NODE_ENV=development

# GraphQL configuration
GRAPHQL_ENDPOINT=/graphql
PG_SCHEMA=public

# Feature toggles
ENABLE_CORS=true
ENABLE_SUBSCRIPTIONS=true
```

### Prerequisites

Ensure `dubhe-indexer` is running and has created database tables:

1. **System tables**: `__dubheStoreTransactions`, `__dubheStoreSchemas`, `__dubheStoreEvents`
2. **Metadata tables**: `table_fields` (stores dynamic table structure information)
3. **Dynamic tables**: `store_*` tables (dynamically created based on configuration files)

## 🚀 Running

### Development Mode

```bash
# Start development server (supports hot reload)
pnpm dev

# Or use npm
npm run dev
```

### Production Mode

```bash
# Build project
pnpm build

# Start production server
pnpm start
```

## 📊 Access Endpoints

After starting the server, you can access:

- **Welcome Page**: `http://localhost:4000` - View scanned tables and system information
- **GraphQL API**: `http://localhost:4000/graphql` - API endpoint
- **GraphiQL**: `http://localhost:4000/graphiql` - Interactive query interface
- **WebSocket**: `ws://localhost:4000/graphql` - Subscription functionality

## 🎮 Usage Examples

### Query System Tables

```graphql
# Query Schemas table
query GetSchemas {
  allDubheStoreSchemas(first: 10) {
    nodes {
      id
      name
      key1
      key2
      value
      lastUpdateCheckpoint
      isRemoved
      createdAt
    }
  }
}

# Query Transactions table
query GetTransactions {
  allDubheStoreTransactions(first: 10) {
    nodes {
      id
      sender
      checkpoint
      digest
      package
      module
      function
      arguments
      createdAt
    }
  }
}

# Query Events table
query GetEvents {
  allDubheStoreEvents(first: 10) {
    nodes {
      id
      sender
      name
      value
      checkpoint
      digest
      createdAt
    }
  }
}
```

### Query Dynamic Tables

If `dubhe-indexer` has created dynamic tables (e.g., from `config.json` configuration), you can query them:

```graphql
# Query store_accounts table (if exists)
query GetAccounts {
  allStoreAccounts {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Query store_position table (if exists)
query GetPositions {
  allStorePositions {
    nodes {
      player
      x
      y
    }
  }
}
```

### Real-time Subscriptions

```graphql
# Subscribe to Schema changes
subscription OnSchemaChanges {
  allDubheStoreSchemas(first: 1, orderBy: [CREATED_AT_DESC]) {
    nodes {
      id
      name
      value
      createdAt
    }
  }
}

# Subscribe to Events
subscription OnNewEvents {
  allDubheStoreEvents(first: 1, orderBy: [CREATED_AT_DESC]) {
    nodes {
      id
      name
      value
      checkpoint
    }
  }
}
```

### Advanced Queries

```graphql
# Paginated query
query GetSchemasPaginated($after: Cursor) {
  allDubheStoreSchemas(first: 10, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      name
      value
    }
  }
}

# Conditional filtering
query GetSchemasByName($name: String!) {
  allDubheStoreSchemas(condition: { name: $name }) {
    nodes {
      id
      name
      key1
      key2
      value
    }
  }
}

# Sorted query
query GetRecentTransactions {
  allDubheStoreTransactions(first: 20, orderBy: [CREATED_AT_DESC]) {
    nodes {
      id
      sender
      function
      checkpoint
      createdAt
    }
  }
}
```

### Advanced Filtering Queries

Now supports powerful filtering functionality including multiple operators and logical combinations:

```graphql
# Basic filtering - using greater than operator
query GetHighValueAccounts {
  storeAccounts(filter: { balance: { gt: "1000" } }) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Multi-condition filtering - implicit AND combination
query GetSpecificAccounts {
  storeAccounts(filter: { balance: { gte: "100", lte: "10000" }, assetId: { startsWith: "0x2" } }) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Logical operators - OR combination
query GetAccountsWithConditions {
  storeAccounts(
    filter: { or: [{ balance: { gt: "50000" } }, { assetId: { in: ["0x123", "0x456", "0x789"] } }] }
  ) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Complex logical combinations - AND, OR, NOT
query GetComplexFilteredAccounts {
  storeAccounts(
    filter: {
      and: [
        { or: [{ balance: { gt: "1000" } }, { assetId: { like: "%special%" } }] }
        { not: { account: { includesInsensitive: "test" } } }
      ]
    }
  ) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# String fuzzy search
query SearchPlayers {
  storeEncounters(
    filter: { player: { includesInsensitive: "alice" }, monster: { isNull: false } }
  ) {
    nodes {
      player
      monster
      catchAttempts
    }
  }
}

# Array and range queries
query GetPositionsInRange {
  storePositions(
    filter: {
      player: { in: ["player1", "player2", "player3"] }
      x: { gte: "10", lte: "100" }
      y: { isNull: false }
    }
  ) {
    nodes {
      player
      x
      y
    }
  }
}
```

### Enhanced Sorting Features

Supports multiple sorting combinations for all fields:

```graphql
# Single field sorting
query GetAccountsByBalance {
  storeAccounts(orderBy: [BALANCE_DESC]) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Multi-field sorting
query GetAccountsMultiSort {
  storeAccounts(orderBy: [ASSET_ID_ASC, BALANCE_DESC]) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Filtering + Sorting + Pagination
query GetFilteredSortedPaginated($after: Cursor) {
  storeAccounts(
    filter: { balance: { gt: "1000" } }
    orderBy: [BALANCE_DESC, ASSET_ID_ASC]
    first: 10
    after: $after
  ) {
    edges {
      node {
        assetId
        account
        balance
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

> 📖 **Detailed Filtering Documentation**: See [Advanced Filtering and Query Features Guide](./ADVANCED_FILTERING_GUIDE.md) for all supported operators, usage examples, and best practices.

## 🏗️ Architecture Overview

### How It Works

```
dubhe-indexer database
         ↓
  [Database Introspector]
         ↓
   [PostGraphile]
         ↓
  [GraphQL API]
         ↓
   [WebSocket]
```

1. **Database Scanning**: Automatically scans all tables in the database at startup
2. **Structure Parsing**: Reads dynamic table structures from `table_fields` metadata table
3. **Schema Generation**: PostGraphile automatically generates GraphQL schema based on table structures
4. **API Service**: Provides complete GraphQL CRUD operations and subscription functionality

### Supported Table Types

1. **System Tables**:

   - `__dubheStoreTransactions` - Transaction records
   - `__dubheStoreSchemas` - Schema data
   - `__dubheStoreEvents` - Event records
   - `table_fields` - Table structure metadata

2. **Dynamic Tables**:
   - `store_*` - Tables dynamically created based on `dubhe-indexer` configuration

## 🚀 Deployment

### Docker Deployment

```bash
# Use provided docker-compose
docker-compose up -d
```

### Manual Deployment

```bash
# Build project
pnpm build

# Set environment variables
export DATABASE_URL="postgres://..."
export PORT=4000

# Start server
pnpm start
```

## 🔧 Configuration Options

### PostGraphile Features

- ✅ **Auto CRUD**: All tables automatically support create, read, update, delete
- ✅ **Relationship Queries**: Automatically handles relationships between tables
- ✅ **Pagination**: Relay-style connection pagination
- ✅ **Subscriptions**: GraphQL subscriptions and Live Queries
- ✅ **Filtering and Sorting**: Powerful query conditions and sorting
- ✅ **Permission Control**: PostgreSQL row-level security based

### Custom Configuration

In `src/index.ts`, you can modify PostGraphile configuration:

```typescript
const createPostGraphileConfig = (availableTables: string[]) => {
  return {
    // Add plugins
    appendPlugins: [
      require('@graphile-contrib/pg-simplify-inflector'),
      require('postgraphile-plugin-connection-filter')
    ],

    // Custom naming
    inflection: {
      // Custom table name mapping
    },

    // Add custom fields
    makeAddInflectorsPlugin: (inflectors) => {
      // Custom logic
    }
  };
};
```

## 🛡️ Security Configuration

### Database Permissions

```sql
-- Create read-only user
CREATE USER graphql_readonly WITH PASSWORD 'secure_password';

-- Grant query permissions
GRANT CONNECT ON DATABASE sui_indexer TO graphql_readonly;
GRANT USAGE ON SCHEMA public TO graphql_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO graphql_readonly;

-- If write permissions needed
GRANT INSERT, UPDATE, DELETE ON specific_tables TO graphql_readonly;
```

### Production Environment Configuration

```env
NODE_ENV=production
ENABLE_CORS=false
# Or set specific origins
CORS_ORIGIN=https://yourdomain.com
```

## 📋 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```
   Solution: Check DATABASE_URL and database service status
   ```

2. **Table Scan Empty**

   ```
   Solution: Ensure dubhe-indexer is running and has created tables
   ```

3. **Schema Generation Failed**

   ```
   Solution: Check if table_fields table exists and has data
   ```

4. **WebSocket Connection Failed**
   ```
   Solution: Check firewall settings and ENABLE_SUBSCRIPTIONS configuration
   ```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=postgraphile:* pnpm dev

# View generated schema
ls -la *.graphql
```

## 🤝 Integration Guide

### Integration with dubhe-indexer

1. **Startup Order**: Start `dubhe-indexer` first, then GraphQL server
2. **Database Sharing**: Both services share the same PostgreSQL database
3. **Configuration Sync**: Ensure database connection configurations are consistent

### Integration with Frontend

```typescript
// Apollo Client configuration
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql'
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});
```

## 📄 License

MIT License

## WebSocket Subscription Support

This server now supports real-time data subscriptions via WebSocket using PostgreSQL's LISTEN/NOTIFY mechanism.

### Environment Variable Configuration

Create `.env` file and configure the following variables:

```bash
# Database connection URL
# Note: For WebSocket subscriptions, use direct connection instead of connection pooling
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres

# Server port
PORT=4000

# Environment mode
NODE_ENV=development

# GraphQL endpoint path
GRAPHQL_ENDPOINT=/graphql

# PostgreSQL Schema
PG_SCHEMA=public

# Enable CORS
ENABLE_CORS=true

# Enable WebSocket subscriptions
# Set to true to enable real-time subscription functionality
ENABLE_SUBSCRIPTIONS=true
```

### Subscription Types

1. **Specific Store Table Subscriptions** - Automatically generate subscriptions for each `store_*` table
2. **All Store Table Subscriptions** - Subscribe to changes across all store tables
3. **Arbitrary Table Subscriptions** - Subscribe to changes in any table
4. **System Event Subscriptions** - Subscribe to system-level events

### Testing Subscriptions

```bash
# Install dependencies
npm install

# Start server
npm run dev

# Test subscriptions in another terminal
npm run test:subscription
```

### Usage Examples

Run in GraphiQL:

```graphql
subscription {
  allStoresChanged {
    event
    table
    timestamp
    data
    id
  }
}
```

For detailed usage guide, refer to [SUBSCRIPTION_USAGE.md](./SUBSCRIPTION_USAGE.md).

### Notes

1. WebSocket subscriptions are not compatible with Neon connection pooling, use direct database connections
2. Ensure PostgreSQL supports LISTEN/NOTIFY
3. dubhe-indexer will automatically create necessary triggers
4. Large numbers of subscriptions may affect performance, use reasonably

## 📄 License

MIT License

---

💡 **Tip**: This server is designed as the perfect companion to `dubhe-indexer`, providing a powerful GraphQL interface to access indexed data. No manual schema configuration needed - everything is automatic!

# 🔧 Main Features

- 🚀 **Automatic Database Table Structure Scanning**: No manual configuration needed, automatically adapts to dubhe-indexer's dynamic tables
- 📊 **Complete GraphQL API**: Automatically generates CRUD operations for all tables
- 📡 **Real-time Subscription Support**: WebSocket subscriptions for data changes
- 🎮 **Enhanced GraphQL Playground**: Modern query interface with Schema Explorer and code export
- 🔍 **Smart Filtering and Pagination**: Supports complex query conditions
- 🎯 **Developer Friendly**: Provides detailed welcome page and usage guide
- 📝 **Structured Logging System**: Uses Winston for professional logging and monitoring

## 📋 System Requirements

- Node.js 18.0.0+
- PostgreSQL database (managed by dubhe-indexer)
- TypeScript 5.0+

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy and edit environment variable file:

```bash
cp .env.example .env
```

Main configuration items:

```bash
# Database connection
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres

# Server configuration
PORT=4000
GRAPHQL_ENDPOINT=/graphql
PG_SCHEMA=public

# Feature toggles
ENABLE_CORS=true
ENABLE_SUBSCRIPTIONS=true
REALTIME_PORT=4001

# Logging configuration
LOG_LEVEL=info  # error, warn, info, debug, verbose
```

### 3. Start Server

```bash
# Development mode (supports hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 4. Access Services

- 🏠 **Homepage**: http://localhost:4000 - Server information and usage guide
- 🎮 **GraphQL Playground**: http://localhost:4000/playground - Modern query interface
- 📊 **GraphQL API**: http://localhost:4000/graphql - API endpoint
- 📡 **WebSocket Subscriptions**: ws://localhost:4000/graphql - Real-time subscriptions

## 📊 Logging System

This project uses a professional Winston logging system providing structured logging:

### Main Features

- 🎨 **Colored Output**: Different colors for different levels
- 📁 **File Recording**: Automatically saves to `logs/` directory
- 🏷️ **Component Identification**: Clear identification of log sources
- 📊 **Structured Data**: Supports additional metadata
- ⚡ **Performance Monitoring**: Built-in performance metrics recording
- 🔒 **Sensitive Information Protection**: Automatically hides passwords and other sensitive info

### Log Levels

```bash
export LOG_LEVEL=debug  # Show all levels of logs
export LOG_LEVEL=info   # Default level, recommended for production
export LOG_LEVEL=warn   # Only show warnings and errors
```

### Log Files

- `logs/combined.log`: All logs (JSON format)
- `logs/error.log`: Error logs
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Promise rejections

For detailed usage instructions, refer to: [LOGGING.md](./LOGGING.md)

## 🎮 Using GraphQL Playground

Visit http://localhost:4000/playground to experience the enhanced GraphQL Playground:

### Main Features

- 📊 **Schema Explorer**: Visually browse GraphQL Schema
- 🔍 **Smart Completion**: Auto-complete query statements
- 📝 **Query History**: Save and manage query history
- 📋 **Code Export**: Supports code generation in multiple languages
- 🎨 **Modern Interface**: Beautiful user interface

### Example Queries

```graphql
# Query all dynamic tables
{
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
  }
}

# If store_accounts table exists
{
  allStoreAccounts(first: 10) {
    edges {
      node {
        id
        # Other fields dynamically generated based on table structure
      }
    }
  }
}
```

### Real-time Subscriptions

If subscription functionality is enabled, you can use real-time subscriptions:

```graphql
subscription {
  allStoresChanged {
    event
    table
    data
    timestamp
  }
}
```

## 🔧 Configuration Options

### Database Configuration

```bash
DATABASE_URL=postgres://username:password@host:port/database
PG_SCHEMA=public  # Database schema to scan
```

### Server Configuration

```bash
PORT=4000                    # HTTP server port
GRAPHQL_ENDPOINT=/graphql    # GraphQL API path
ENABLE_CORS=true            # Whether to enable CORS
```

### Subscription Configuration

```bash
ENABLE_SUBSCRIPTIONS=true    # Whether to enable subscription functionality
REALTIME_PORT=4001          # WebSocket server port
```

### Logging Configuration

```bash
LOG_LEVEL=info              # Log level
LOG_TO_FILE=true           # Whether to save to files
LOG_DIR=./logs             # Log file directory

# PostGraphile SQL query log control
DISABLE_QUERY_LOG=false     # Set to true to disable SQL query logs
ENABLE_QUERY_LOG=false      # Set to true in production to enable query logs
QUERY_TIMEOUT=30000         # GraphQL query timeout (milliseconds)
```

# Dubhe GraphQL Server

A powerful GraphQL server for blockchain indexing with real-time subscription support.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start server with default settings
pnpm start

# Or use CLI with custom options
npx dubhe-graphql-server start --help
```

## 📋 CLI Configuration

All configuration can be managed through CLI arguments or environment variables:

### Basic Server Configuration

```bash
npx dubhe-graphql-server start \
  --port 4000 \
  --database-url "postgres://user:pass@localhost:5432/db" \
  --schema "public" \
  --endpoint "/graphql" \
  --cors \
  --subscriptions \
  --env "development"
```

### Debug Configuration

```bash
# Enable debug mode (verbose logging + query logs + notifications)
npx dubhe-graphql-server start \
  --debug

# Production mode (no debug logs or query logs by default)
npx dubhe-graphql-server start \
  --env production

# Enable performance metrics separately
npx dubhe-graphql-server start \
  --enable-metrics
```

### Performance Configuration

```bash
# Tune performance settings
npx dubhe-graphql-server start \
  --query-timeout 30000 \
  --max-connections 1000 \
  --heartbeat-interval 30000
```

### Subscription Capabilities

```bash
# Configure subscription features
npx dubhe-graphql-server start \
  --enable-live-queries \
  --enable-pg-subscriptions \
  --enable-native-websocket \
  --realtime-port 4001
```

### Debug Configuration

```bash
# Enable debugging features
npx dubhe-graphql-server start \
  --debug-notifications \
  --enable-metrics
```

## 🔧 All CLI Options

| Option                      | Environment Variable      | Default                                                | Description                                                      |
| --------------------------- | ------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `--port, -p`                | `PORT`                    | `4000`                                                 | Server port                                                      |
| `--database-url, -d`        | `DATABASE_URL`            | `postgres://postgres:postgres@127.0.0.1:5432/postgres` | Database connection URL                                          |
| `--schema, -s`              | `PG_SCHEMA`               | `public`                                               | PostgreSQL schema name                                           |
| `--endpoint, -e`            | `GRAPHQL_ENDPOINT`        | `/graphql`                                             | GraphQL endpoint path                                            |
| `--cors`                    | `ENABLE_CORS`             | `true`                                                 | Enable CORS                                                      |
| `--subscriptions`           | `ENABLE_SUBSCRIPTIONS`    | `true`                                                 | Enable GraphQL subscriptions                                     |
| `--env`                     | `NODE_ENV`                | `development`                                          | Environment mode                                                 |
| `--debug`                   | `DEBUG`                   | `false`                                                | Enable debug mode (verbose logging + query logs + notifications) |
| `--query-timeout`           | `QUERY_TIMEOUT`           | `30000`                                                | GraphQL query timeout (ms)                                       |
| `--max-connections`         | `MAX_CONNECTIONS`         | `1000`                                                 | Maximum database connections                                     |
| `--heartbeat-interval`      | `HEARTBEAT_INTERVAL`      | `30000`                                                | WebSocket heartbeat interval (ms)                                |
| `--enable-metrics`          | `ENABLE_METRICS`          | `false`                                                | Enable performance metrics                                       |
| `--enable-live-queries`     | `ENABLE_LIVE_QUERIES`     | `true`                                                 | Enable GraphQL live queries                                      |
| `--enable-pg-subscriptions` | `ENABLE_PG_SUBSCRIPTIONS` | `true`                                                 | Enable PostgreSQL subscriptions                                  |
| `--enable-native-websocket` | `ENABLE_NATIVE_WEBSOCKET` | `true`                                                 | Enable native WebSocket support                                  |
| `--realtime-port`           | `REALTIME_PORT`           | `undefined`                                            | Realtime WebSocket port                                          |

## 📚 Examples

### Development Setup

```bash
npx dubhe-graphql-server start \
  --env development \
  --debug \
  --enable-metrics
```

### Production Setup

```bash
npx dubhe-graphql-server start \
  --env production \
  --max-connections 500
```

### Custom Subscription Setup

```bash
npx dubhe-graphql-server start \
  --enable-pg-subscriptions \
  --no-enable-live-queries \
  --realtime-port 4001
```

## 🌟 Features

- ✅ **Unified Configuration**: All settings managed through CLI
- ✅ **Environment Variable Support**: Backward compatible with .env files
- ✅ **Real-time Subscriptions**: PostgreSQL LISTEN/NOTIFY support
- ✅ **Flexible Debug Mode**: `--debug` for logging, `--enable-metrics` for performance monitoring
- ✅ **Performance Tuning**: Connection pools and timeout controls
- ✅ **Development Tools**: Built-in playground and debugging features
