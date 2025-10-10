# Dubhe GraphQL Server

The Dubhe GraphQL Server is an intelligent universal server adapter that automatically connects to databases created by `dubhe-indexer` and dynamically generates complete GraphQL APIs. Built on PostGraphile, it provides advanced filtering, real-time subscriptions, and comprehensive data access capabilities with zero configuration required.

## Installation

Install the package in your project:

```bash
pnpm install @0xobelisk/graphql-server
```

Or install globally for CLI usage:

```bash
npm install -g @0xobelisk/graphql-server
```

## Requirements

- Node.js 22.0.0+
- PostgreSQL database (managed by dubhe-indexer)
- TypeScript 5.0+

## Quick Start

### Using the CLI

The server provides a comprehensive CLI interface for configuration:

```bash
# Start with default configuration
dubhe-graphql-server start

# Start with custom configuration
dubhe-graphql-server start --port 4000 --database-url postgres://user:pass@localhost:5432/db

# Development mode with debug logging
dubhe-graphql-server start --debug --enable-metrics

# Production mode
dubhe-graphql-server start --env production --no-cors
```

### CLI Options

All configuration can be managed through CLI arguments or environment variables:

| Option                      | Environment Variable      | Default                                                | Description                         |
| --------------------------- | ------------------------- | ------------------------------------------------------ | ----------------------------------- |
| `--port, -p`                | `PORT`                    | `4000`                                                 | Server port                         |
| `--database-url, -d`        | `DATABASE_URL`            | `postgres://postgres:postgres@127.0.0.1:5432/postgres` | Database connection URL             |
| `--schema, -s`              | `PG_SCHEMA`               | `public`                                               | PostgreSQL schema name              |
| `--endpoint, -e`            | `GRAPHQL_ENDPOINT`        | `/graphql`                                             | GraphQL endpoint path               |
| `--cors`                    | `ENABLE_CORS`             | `true`                                                 | Enable CORS                         |
| `--subscriptions`           | `ENABLE_SUBSCRIPTIONS`    | `true`                                                 | Enable GraphQL subscriptions        |
| `--env`                     | `NODE_ENV`                | `development`                                          | Environment mode                    |
| `--debug`                   | `DEBUG`                   | `false`                                                | Enable debug mode (verbose logging) |
| `--query-timeout`           | `QUERY_TIMEOUT`           | `30000`                                                | GraphQL query timeout (ms)          |
| `--max-connections`         | `MAX_CONNECTIONS`         | `1000`                                                 | Maximum database connections        |
| `--heartbeat-interval`      | `HEARTBEAT_INTERVAL`      | `30000`                                                | WebSocket heartbeat interval (ms)   |
| `--enable-metrics`          | `ENABLE_METRICS`          | `false`                                                | Enable performance metrics          |
| `--enable-live-queries`     | `ENABLE_LIVE_QUERIES`     | `true`                                                 | Enable GraphQL live queries         |
| `--enable-pg-subscriptions` | `ENABLE_PG_SUBSCRIPTIONS` | `true`                                                 | Enable PostgreSQL subscriptions     |
| `--enable-native-websocket` | `ENABLE_NATIVE_WEBSOCKET` | `true`                                                 | Enable native WebSocket support     |
| `--realtime-port`           | `REALTIME_PORT`           | `undefined`                                            | Realtime WebSocket port             |

### Environment Configuration (Alternative)

You can also use a `.env` file instead of CLI arguments:

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

# Performance settings
QUERY_TIMEOUT=30000
MAX_CONNECTIONS=1000
HEARTBEAT_INTERVAL=30000

# Debug and monitoring
DEBUG=false
ENABLE_METRICS=false

# Subscription capabilities
ENABLE_LIVE_QUERIES=true
ENABLE_PG_SUBSCRIPTIONS=true
ENABLE_NATIVE_WEBSOCKET=true
REALTIME_PORT=4001
```

## Core Features

### Intelligent Database Adaptation

The server automatically scans and adapts to your database structure:

- **Dynamic Scanning**: Automatically discovers all tables created by `dubhe-indexer`
- **PostGraphile Powered**: Generates GraphQL APIs based on database schema
- **Zero Configuration**: No manual schema definition required
- **Real-time Schema Updates**: Automatically adapts to database changes

### Plugin Architecture

The server uses a modular plugin architecture:

- **Database Introspector**: Scans and analyzes database table structures
- **Welcome Page Generator**: Creates informative server homepage
- **PostGraphile Configuration**: Manages GraphQL API generation
- **Subscription Manager**: Handles real-time WebSocket connections
- **Enhanced Server Manager**: Manages HTTP and WebSocket servers

### Advanced Filtering

The server provides comprehensive filtering capabilities through the `postgraphile-plugin-connection-filter` plugin:

- **Rich Operators**: Supports 20+ filtering operators (eq, gt, lt, in, like, etc.)
- **Logical Combinations**: AND, OR, NOT operations for complex queries
- **Type-aware Filtering**: Automatic operator selection based on field types
- **Case-insensitive Search**: Text search with case sensitivity options
- **Null Handling**: Explicit null and not-null filtering

```graphql
# Basic filtering
query GetHighValueAccounts {
  accounts(filter: { balance: { gt: "1000" } }) {
    nodes {
      assetId
      account
      balance
    }
  }
}

# Complex logical combinations
query GetComplexFilteredAccounts {
  accounts(
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
```

### Real-time Subscriptions

Advanced WebSocket support powered by PostgreSQL LISTEN/NOTIFY:

- **Live Queries**: PostGraphile Live Queries for real-time data updates
- **PostgreSQL Subscriptions**: Native database change notifications
- **WebSocket Transport**: Unified WebSocket endpoint for all subscriptions
- **Connection Management**: Automatic heartbeat and connection recovery
- **Universal Subscriptions**: Custom subscription plugin for store tables

```graphql
# Subscribe to specific table changes
subscription OnAccountChanges {
  accounts(first: 10, orderBy: [CREATED_AT_TIMESTAMP_DESC]) {
    nodes {
      assetId
      account
      balance
    }
  }
}
```

## Access Endpoints

After starting the server, you can access:

- **Welcome Page**: `http://localhost:4000/` - Server information and table overview
- **GraphQL Playground**: `http://localhost:4000/playground` - Modern GraphQL IDE
- **GraphQL API**: `http://localhost:4000/graphql` - API endpoint
- **Health Check**: `http://localhost:4000/health` - Server health status
- **Subscription Config**: `http://localhost:4000/subscription-config` - Client configuration
- **WebSocket**: `ws://localhost:4000/graphql` - Subscription endpoint

## Deployment

### Development

```bash
# Start development server
pnpm install
dubhe-graphql-server start --debug --enable-metrics
```

### Production

```bash
# Build the project
pnpm install
pnpm build

# Start production server
dubhe-graphql-server start \
  --env production \
  --max-connections 500 \
  --query-timeout 60000
```

### Docker Deployment

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  graphql-server:
    image: node:22-alpine
    working_dir: /app
    command: npx @0xobelisk/graphql-server start
    ports:
      - '4000:4000'
    environment:
      - DATABASE_URL=postgres://user:password@postgres:5432/sui_indexer
      - PORT=4000
      - ENABLE_SUBSCRIPTIONS=true
      - NODE_ENV=production
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=sui_indexer
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Configuration

```bash
# CLI approach for production
dubhe-graphql-server start \
  --env production \
  --database-url "postgres://user:password@prod-db:5432/sui_indexer" \
  --port 4000 \
  --no-cors \
  --max-connections 500 \
  --query-timeout 60000 \
  --enable-metrics
```

## Configuration

### Server Configuration Interface

The server uses a comprehensive configuration interface:

```typescript
interface ServerConfig {
  // Basic server configuration
  port: string;
  databaseUrl: string;
  schema: string;
  endpoint: string;
  cors: boolean;
  subscriptions: boolean;
  env: string;

  // Debug configuration
  debug: boolean;

  // Performance configuration
  queryTimeout: number;
  maxConnections: number;
  heartbeatInterval: number;
  enableMetrics: boolean;

  // Subscription capabilities
  enableLiveQueries: boolean;
  enablePgSubscriptions: boolean;
  enableNativeWebSocket: boolean;
  realtimePort?: number;

  // Internal debug flags
  debugNotifications: boolean;
}
```

### Database Permissions

Set up proper database permissions:

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

## Monitoring and Debugging

### Health Checks

The server provides comprehensive monitoring endpoints:

- `http://localhost:4000/` - Welcome page with system information
- `http://localhost:4000/health` - Health check endpoint with subscription status
- `http://localhost:4000/subscription-config` - Client configuration for subscriptions
- `http://localhost:4000/subscription-docs` - Configuration documentation
- `http://localhost:4000/playground` - Enhanced GraphQL Playground

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Enable debug mode with verbose logging
dubhe-graphql-server start --debug

# Enable performance metrics
dubhe-graphql-server start --enable-metrics

# Combine both for comprehensive monitoring
dubhe-graphql-server start --debug --enable-metrics
```

### Performance Monitoring

The server includes built-in performance monitoring:

- **Query Logging**: SQL query logs (controlled by `--debug`)
- **Request Metrics**: HTTP request timing and status
- **Connection Monitoring**: Database connection pool status
- **WebSocket Metrics**: Subscription connection statistics

## Troubleshooting

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

### Debug Commands

```bash
# View generated schema
ls -la *.graphql

# Check database connection
psql $DATABASE_URL -c "SELECT version();"

# Test GraphQL endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## Architecture

### System Architecture

```
dubhe-indexer database
         ↓
  [Database Introspector] ← Scans table structures
         ↓
   [PostGraphile] ← Generates GraphQL schema
         ↓
  [Enhanced Server Manager] ← Manages HTTP/WebSocket
         ↓
  [GraphQL API + WebSocket] ← Unified endpoint
```

### Core Components

1. **Database Introspector**:

   - Scans `store_*` tables and system tables
   - Reads field metadata from `table_fields`
   - Monitors database connection health

2. **PostGraphile Engine**:

   - Generates GraphQL schema from database structure
   - Provides CRUD operations and filtering
   - Handles connection pooling and query optimization

3. **Subscription Manager**:

   - Manages PostgreSQL LISTEN/NOTIFY subscriptions
   - Handles WebSocket connections and heartbeat
   - Provides universal subscriptions for all store tables

4. **Enhanced Server Manager**:
   - Express.js server with modular middleware
   - Welcome page, health checks, and documentation
   - GraphQL Playground integration

### Supported Table Types

1. **System Tables**: Auto-detected indexer tables

   - `table_fields` - Table structure metadata (stores field definitions for dynamic tables)

2. **Dynamic Tables**: Contract-defined tables
   - `store_*` - Tables created from your `dubhe.config.json` (e.g., `store_component0`, `store_component1`)
   - Each table includes system fields: `created_at_timestamp_ms`, `updated_at_timestamp_ms`, `is_deleted`
   - Automatically generate GraphQL types and operations

## Best Practices

### Development

1. **Use debug mode** for development: `--debug --enable-metrics`
2. **Monitor welcome page** for table discovery status
3. **Use GraphQL Playground** for query development and testing
4. **Check health endpoint** regularly for system status

### Production

1. **Configure connection pooling**: Use `--max-connections` appropriately
2. **Set proper timeouts**: Configure `--query-timeout` based on usage
3. **Enable security**: Use `--no-cors` or configure specific origins
4. **Monitor performance**: Enable `--enable-metrics` for production monitoring
5. **Use read-only database user** for security
6. **Implement rate limiting** at the reverse proxy level
7. **Set up proper logging** and monitoring infrastructure

### Database Optimization

1. **Create indexes** on frequently queried columns
2. **Use connection pooling** efficiently
3. **Monitor subscription connections** to prevent resource exhaustion
4. **Configure PostgreSQL** for optimal performance with LISTEN/NOTIFY

### Integration

1. **Start dubhe-indexer first** before GraphQL server
2. **Ensure database schema compatibility** between services
3. **Use environment-specific configurations** for different stages
4. **Implement proper error handling** in client applications
