# Dubhe Logger System

High-performance logging system based on Pino, featuring object-oriented design for better understanding and extensibility.

## Features

- 🚀 High-performance logging based on Pino
- 📝 Support for structured logging
- 🎨 Colorful pretty printing in development environment
- 📁 File logging support in production environment
- 🔧 Flexible configuration options
- 📦 Component-based log management
- 🛡️ TypeScript type safety

## Basic Usage

### 1. Using Predefined Component Loggers

```typescript
import { dbLogger, serverLogger, systemLogger } from './utils/logger';

// Database operation logs
dbLogger.info('Database connection successful', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection timeout'), { query: 'SELECT * FROM users' });

// Server logs
serverLogger.info('Server started', { port: 4000, env: 'development' });

// System logs
systemLogger.warn('High memory usage', { usage: '85%' });
```

### 2. Creating Custom Component Loggers

```typescript
import { createComponentLogger } from './utils/logger';

const apiLogger = createComponentLogger('api');
const cacheLogger = createComponentLogger('cache');

apiLogger.info('API request', { method: 'GET', path: '/users', userId: 123 });
cacheLogger.debug('Cache hit', { key: 'user:123', ttl: 3600 });
```

### 3. Using Logger Class to Create Custom Instances

```typescript
import { Logger } from './utils/logger';

// Create logger with custom configuration
const customLogger = new Logger({
  level: 'debug',
  service: 'my-service',
  enableFileLogging: true,
  logsDir: './custom-logs',
  enablePrettyPrint: false
});

const myLogger = customLogger.createComponentLogger('my-component');
myLogger.info('Custom log message');
```

## Configuration Options

```typescript
interface LoggerConfig {
  level?: string;              // Log level (debug|info|warn|error)
  service?: string;            // Service name
  component?: string;          // Component name
  enableFileLogging?: boolean; // Enable file logging
  logsDir?: string;           // Log file directory
  enablePrettyPrint?: boolean; // Enable colorful output
}
```

## Utility Functions

### Performance Logging

```typescript
import { logPerformance } from './utils/logger';

const startTime = Date.now();
// ... perform operations
logPerformance('Database query', startTime, { table: 'users', rows: 1000 });
```

### Database Operation Logging

```typescript
import { logDatabaseOperation } from './utils/logger';

logDatabaseOperation('SELECT', 'users', { limit: 10, offset: 0 });
```

### WebSocket Event Logging

```typescript
import { logWebSocketEvent } from './utils/logger';

logWebSocketEvent('client_connected', 5, { clientId: 'abc123' });
```

### GraphQL Query Logging

```typescript
import { logGraphQLQuery } from './utils/logger';

logGraphQLQuery('query', 'query GetUsers { users { id name } }', { limit: 10 });
```

## Predefined Component Loggers

| Logger | Component | Purpose |
|--------|-----------|---------|
| `dbLogger` | database | Database operations |
| `serverLogger` | server | Server related |
| `wsLogger` | websocket | WebSocket connections |
| `gqlLogger` | graphql | GraphQL queries |
| `subscriptionLogger` | subscription | Subscription features |
| `systemLogger` | system | System level |
| `authLogger` | auth | Authentication |
| `perfLogger` | performance | Performance monitoring |

## Environment Variables

- `LOG_LEVEL`: Set log level (debug|info|warn|error)
- `NODE_ENV`: Set environment mode, enables pretty printing in development

## Log Format

### Development Environment (Pretty Print)
```
2024-01-15 10:30:45 [INFO] dubhe-graphql-server [database]: Database connection successful {"host": "localhost", "port": 5432}
```

### Production Environment (JSON)
```json
{"level":30,"time":"2024-01-15T10:30:45.123Z","service":"dubhe-graphql-server","component":"database","msg":"Database connection successful","host":"localhost","port":5432}
```

## Advanced Usage

### Extending Logger Class

```typescript
import { Logger, LoggerConfig } from './utils/logger';

class CustomLogger extends Logger {
  constructor(config: LoggerConfig) {
    super(config);
  }

  // Add custom methods
  public audit(action: string, userId: string, meta?: any) {
    const auditLogger = this.createComponentLogger('audit');
    auditLogger.info(`User action: ${action}`, { userId, timestamp: new Date().toISOString(), ...meta });
  }
}

const logger = new CustomLogger({ service: 'audit-service' });
logger.audit('login', 'user123', { ip: '192.168.1.1' });
```

### Getting Raw Pino Instance

```typescript
import { Logger } from './utils/logger';

const logger = new Logger();
const pinoInstance = logger.getPinoInstance();

// Use Pino API directly
pinoInstance.info({ customField: 'value' }, 'Using Pino directly');
```

## Migration Guide

Migrating from winston to the new Logger system:

### Before (Winston)
```typescript
import logger from './logger';
logger.info('Message', { meta: 'data' });
```

### Now (Pino + Class)
```typescript
import { systemLogger } from './utils/logger';
systemLogger.info('Message', { meta: 'data' });
```

Most APIs remain compatible, just need to update import paths. 