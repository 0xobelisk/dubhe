# GraphQL Server Plugin Architecture

This directory contains various functional module plugins for the Sui Indexer GraphQL server, using modular design for easy management and extension.

## 📁 Plugin Structure

### Core Plugins

#### `database-introspector.ts` - Database Introspector

- **Function**: Scan and analyze database table structure
- **Main Class**: `DatabaseIntrospector`
- **Responsibilities**:
  - Get store\_\* dynamic tables
  - Get system tables (dubhe related)
  - Get field information from table_fields
  - Test database connection
  - Output table structure logs

#### `welcome-page.ts` - Welcome Page Generator

- **Function**: Generate server homepage
- **Main Function**: `createWelcomePage()`
- **Responsibilities**:
  - Display server status and configuration information
  - Show detected data tables
  - Provide navigation links and usage guides
  - Responsive design and beautiful interface

#### `postgraphile-config.ts` - PostGraphile Configuration Generator

- **Function**: Create PostGraphile configuration
- **Main Function**: `createPostGraphileConfig()`
- **Responsibilities**:
  - Configure GraphQL endpoints and features
  - Integrate enhanced Playground
  - Set up subscriptions and real-time queries
  - Optimize performance parameters

#### `subscription-manager.ts` - Subscription Manager

- **Function**: Manage GraphQL subscription features
- **Main Class**: `SubscriptionManager`
- **Responsibilities**:
  - Load @graphile/pg-pubsub plugin
  - Configure custom subscription plugins
  - Error handling and fallback solutions
  - Output subscription status information

#### `server-manager.ts` - Server Manager

- **Function**: Manage HTTP and WebSocket servers
- **Main Class**: `ServerManager`
- **Responsibilities**:
  - Create and configure HTTP server
  - Start real-time subscription server
  - Database change monitoring
  - Graceful shutdown handling

#### `enhanced-playground.ts` - Enhanced GraphQL Playground

- **Function**: Provide modern GraphQL IDE
- **Main Function**: `createEnhancedPlayground()`
- **Responsibilities**:
  - Visual Schema Explorer
  - Code export functionality
  - Modern UI interface
  - Keyboard shortcuts support

## 🔧 Usage

### Unified Import

```typescript
import {
  DatabaseIntrospector,
  createPostGraphileConfig,
  SubscriptionManager,
  ServerManager,
  WelcomePageConfig
} from './plugins';
```

### Typical Usage Flow

1. **Database Scanning**: Use `DatabaseIntrospector` to get table structure
2. **Subscription Configuration**: Load plugins through `SubscriptionManager`
3. **Configuration Generation**: Create configuration using `createPostGraphileConfig`
4. **Server Startup**: Manage server lifecycle through `ServerManager`

## 🎯 Design Advantages

### Modular Design

- Each plugin has a single clear responsibility
- Easy to test and maintain individually
- Supports independent upgrades and replacements

### Type Safety

- Complete TypeScript support
- Clear interface definitions
- Compile-time error checking

### Extensibility

- Plugin architecture easy to extend
- Supports custom plugin development
- Flexible and adjustable configuration

### Error Handling

- Graceful error degradation
- Detailed log output
- Fault isolation protection

## 📈 Extension Guide

### Adding New Plugins

1. Create new file in `plugins/` directory
2. Export main interfaces and classes
3. Add export in `index.ts`
4. Update main entry file to use

### Custom Configuration

- Pass configuration through environment variables
- Use interfaces to define configuration structure
- Support runtime dynamic configuration

### Plugin Integration

- Follow unified error handling patterns
- Use consistent log formats
- Maintain interface compatibility

This architecture makes the GraphQL server more modular, maintainable, and provides a solid foundation for future feature extensions.
