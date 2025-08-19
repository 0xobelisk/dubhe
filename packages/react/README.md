# @0xobelisk/react

Modern React integration library for the Dubhe framework with auto-initialization and unified API design.

## Features

⚡ **Single Initialization** - Guaranteed one-time client creation with useRef  
🎯 **Provider Pattern** - Application-wide client sharing via React Context  
🔧 **Type Safety** - Complete TypeScript support with strict typing  
📦 **Optimal Performance** - No re-initialization, stable client instances  
🌐 **Multi-Chain Ready** - Extensible architecture for future blockchain support  
🛡️ **Error Handling** - Comprehensive error management and validation

## Supported Blockchains

- ✅ **Sui** - Full support with auto-initialization
- 🚧 **Aptos** - Coming soon
- 🚧 **Initia** - Coming soon

## Installation

```bash
# Core React package
npm install @0xobelisk/react

# Sui ecosystem dependencies
npm install @0xobelisk/sui-client @0xobelisk/graphql-client @0xobelisk/ecs

# React dependencies
npm install react react-dom
```

## Quick Start

### Provider Pattern Setup

```tsx
import React from 'react';
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from './contracts/metadata.json';

// App root with Provider
function App() {
  const config = {
    network: 'devnet',
    packageId: '0x123...',
    metadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    }
  };

  return (
    <DubheProvider config={config}>
      <MyDApp />
    </DubheProvider>
  );
}

// Component using shared clients
function MyDApp() {
  const { contract, address, network } = useDubhe();

  const handleTransaction = async () => {
    try {
      const tx = new Transaction();
      const result = await contract.tx.counter_system.inc({ tx, params: [] });
      console.log('Transaction successful:', result.digest);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  const handleQuery = async () => {
    try {
      const result = await contract.query.counter_system.get({ params: [] });
      console.log('Counter value:', result);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  return (
    <div>
      <h1>Dubhe Counter DApp</h1>
      <p>Address: {address}</p>
      <p>Network: {network}</p>
      
      <button onClick={handleQuery}>Query Counter</button>
      <button onClick={handleTransaction}>Increment Counter</button>
    </div>
  );
}
```

### Environment Variable Configuration

```tsx
import React from 'react';
import { useDubhe } from '@0xobelisk/react/sui';
import metadata from './contracts/metadata.json';
import dubheMetadata from './contracts/dubhe.config.json';

function App() {
  // Helper function to handle environment variables
  const getConfig = () => ({
    network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as NetworkType,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '',
    metadata,
    dubheMetadata, // Enable GraphQL and ECS features
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    },
    endpoints: {
      graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
    }
  });

  const { contract, graphqlClient, ecsWorld } = useDubhe(getConfig());

  return <MyDApp contract={contract} />;
}
```

### Full Feature Example with GraphQL and ECS

```tsx
import React, { useEffect, useState } from 'react';
import { useDubhe } from '@0xobelisk/react/sui';
import metadata from './contracts/metadata.json';
import dubheMetadata from './contracts/dubhe.config.json';

function AdvancedDApp() {
  const [entities, setEntities] = useState([]);
  
  const { 
    contract, 
    graphqlClient, 
    ecsWorld, 
    address, 
    network 
  } = useDubhe({
    network: 'devnet',
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    metadata,
    dubheMetadata, // Required for GraphQL and ECS
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    }
  });

  // Using GraphQL for real-time data
  useEffect(() => {
    if (graphqlClient) {
      const subscription = graphqlClient.subscribe({
        query: `
          subscription {
            entities {
              id
              components {
                type
                value
              }
            }
          }
        `
      }).subscribe(result => {
        setEntities(result.data.entities);
      });

      return () => subscription.unsubscribe();
    }
  }, [graphqlClient]);

  // Using ECS World for component queries
  const queryComponents = async () => {
    if (ecsWorld) {
      const components = await ecsWorld.getComponent('CounterComponent');
      console.log('Counter components:', components);
    }
  };

  return (
    <div>
      <h1>Advanced Dubhe DApp</h1>
      <p>Connected to {network} as {address}</p>
      
      <div>
        <h2>Real-time Entities: {entities.length}</h2>
        <button onClick={queryComponents}>Query Components</button>
      </div>
      
      <div>
        <h3>Features Available:</h3>
        <p>📝 Contract: {contract ? '✅' : '❌'}</p>
        <p>🔗 GraphQL: {graphqlClient ? '✅' : '❌'}</p>
        <p>🌍 ECS: {ecsWorld ? '✅' : '❌'}</p>
      </div>
    </div>
  );
}
```

## Individual Feature Hooks

For components that only need specific features, use individual hooks:

```tsx
import { 
  useDubheContract, 
  useDubheGraphQL, 
  useDubheECS 
} from '@0xobelisk/react/sui';

// Only contract functionality
function TransactionComponent() {
  const contract = useDubheContract(config);
  // Use contract.tx and contract.query
}

// Only GraphQL functionality  
function DataComponent() {
  const graphqlClient = useDubheGraphQL(config);
  // Use graphqlClient.query and graphqlClient.subscribe
}

// Only ECS functionality
function ECSComponent() {
  const ecsWorld = useDubheECS(config);
  // Use ecsWorld.getComponent and ecsWorld.getEntity
}
```

## Configuration Options

```typescript
interface DubheConfig {
  // Required
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  metadata: SuiMoveNormalizedModules;
  
  // Optional
  dubheSchemaId?: string;
  dubheMetadata?: any; // Enables GraphQL and ECS features
  credentials?: {
    secretKey?: string;
    mnemonics?: string;
  };
  endpoints?: {
    graphql?: string;
    websocket?: string;
  };
  options?: {
    enableBatchOptimization?: boolean; // Default: true
    cacheTimeout?: number; // Default: 5000ms
    debounceMs?: number; // Default: 100ms
    reconnectOnError?: boolean; // Default: true
  };
}
```

## Performance Features

### Automatic Caching
All hooks use React's `useMemo` for intelligent caching:

```tsx
const { contract } = useDubhe(config);
// Contract instance is cached until config changes
// GraphQL and ECS instances are also intelligently cached
```

### Performance Monitoring (Development Mode)
In development mode, get automatic performance tracking:

```tsx
// Automatic timing logs for transactions and queries
const result = await contract.tx.my_system.my_method(params);
// Console: "Transaction my_system.my_method completed in 245.67ms"
```

### Enhanced Methods
Access enhanced contract methods with built-in error handling:

```tsx
const { contract } = useDubhe(config);

// Enhanced transaction with callbacks
const enhancedTx = contract.txWithOptions('counter_system', 'inc', {
  onSuccess: (result) => console.log('Success!', result),
  onError: (error) => console.error('Failed!', error)
});

await enhancedTx({ tx, params: [] });
```

## Migration from Legacy API

### Old Provider-based Pattern (Deprecated)
```tsx
// ❌ Old way - complex state management
<DubheProvider config={config}>
  <App />
</DubheProvider>

function App() {
  const { connect, isConnected } = useDubheConnection();
  const contract = useDubheContract();
  
  useEffect(() => {
    connect(config);
  }, []);
  
  if (!isConnected) return <div>Connecting...</div>;
  return <MyApp />;
}
```

### New Auto-Initialization Pattern (Recommended)
```tsx
// ✅ New way - simple and direct
function App() {
  const { contract, address } = useDubhe({
    network: 'devnet',
    packageId: '0x123...',
    metadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    }
  });
  
  return <MyApp contract={contract} address={address} />;
}
```

## API Reference

### Main Hook: `useDubhe(config)`

Returns a complete Dubhe ecosystem:

```typescript
interface DubheReturn {
  contract: Dubhe; // Enhanced contract instance
  graphqlClient: DubheGraphqlClient | null; // GraphQL client (if dubheMetadata provided)
  ecsWorld: DubheECSWorld | null; // ECS World (if GraphQL available)
  metadata: SuiMoveNormalizedModules; // Contract metadata
  network: NetworkType; // Current network
  packageId: string; // Package ID
  dubheSchemaId?: string; // Schema ID (if provided)
  address: string; // User address
  options?: DubheOptions; // Configuration options
  metrics?: DubheMetrics; // Performance metrics
}
```

### Individual Hooks

- `useDubheContract(config)` → `Dubhe` - Contract instance only
- `useDubheGraphQL(config)` → `DubheGraphqlClient | null` - GraphQL client only  
- `useDubheECS(config)` → `DubheECSWorld | null` - ECS World only

### Configuration Hook

- `useDubheConfig(config)` → `DubheConfig` - Validated, merged configuration

## Type Safety

Complete TypeScript support with strict typing:

```typescript
import type { 
  DubheConfig, 
  DubheReturn, 
  NetworkType 
} from '@0xobelisk/react/sui';

// All hooks and configurations are fully typed
const config: DubheConfig = {
  network: 'devnet', // Type-safe network selection
  packageId: '0x123...',
  metadata: contractMetadata // Typed metadata
};

const result: DubheReturn = useDubhe(config);
```

## Error Handling

Comprehensive validation and error handling:

```tsx
try {
  const { contract } = useDubhe({
    network: 'devnet',
    packageId: '0x123...',
    metadata: contractMetadata
  });
} catch (error) {
  // Detailed validation errors
  console.error('Configuration error:', error.message);
}
```

## Development

```bash
# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Build package
npm run build

# Run tests
npm run test
```

## Compatibility

- **React**: 16.8+ (Hooks support required)
- **TypeScript**: 4.7+ (Strict mode recommended)
- **Node.js**: 16+ (ES2020 support)

---

Built with ❤️ for the Dubhe ecosystem. For more examples and advanced usage, check out our [documentation](https://docs.obelisk.build).