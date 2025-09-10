# @0xobelisk/react

Modern React integration for Dubhe framework with Provider pattern and multi-chain support.

## 🚀 Features

- **🎯 Provider Pattern** - Single initialization with React Context sharing
- **⚡ Performance Optimized** - useRef pattern prevents re-initialization
- **🛡️ Type Safety** - Complete TypeScript support with strict typing
- **🌐 Multi-Chain Ready** - Extensible architecture for multiple blockchains
- **📦 Individual Hooks** - Granular access to specific functionality
- **🔧 Configuration Driven** - Flexible setup with smart defaults

## 📦 Installation

```bash
# Core React package
npm install @0xobelisk/react

# Peer dependencies
npm install react react-dom @0xobelisk/sui-client zod

# Optional dependencies for enhanced features
npm install @0xobelisk/graphql-client @0xobelisk/ecs
```

### Requirements

- **React**: 18.0.0+ or 19.0.0+
- **Node.js**: 18.0.0+
- **TypeScript**: 5.0+ (recommended)

## 🌐 Multi-Chain Support

| Blockchain | Status         | Import Path               |
| ---------- | -------------- | ------------------------- |
| **Sui**    | ✅ Ready       | `@0xobelisk/react/sui`    |
| **Aptos**  | 🚧 Coming Soon | `@0xobelisk/react/aptos`  |
| **Initia** | 🚧 Coming Soon | `@0xobelisk/react/initia` |

## 🚀 Quick Start

### Basic Provider Setup

```typescript
import React from 'react';
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from './contracts/metadata.json';

// App root with Provider
function App() {
  const config = {
    network: 'devnet' as const,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID!,
    metadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY // ⚠️ LOCAL DEVELOPMENT ONLY  // ⚠️ LOCAL DEVELOPMENT ONLY
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
      const result = await contract.tx.counter_system.increment({ tx });
      console.log('Success:', result.digest);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <div>
      <p>Connected: {address}</p>
      <p>Network: {network}</p>
      <button onClick={handleTransaction}>Execute Transaction</button>
    </div>
  );
}
```

## 🎯 Provider Pattern

### DubheProvider Component

The `DubheProvider` uses React Context with useRef pattern to ensure single client initialization:

```typescript
import { DubheProvider } from '@0xobelisk/react/sui';
import type { DubheConfig } from '@0xobelisk/react/sui';

function App() {
  const config: DubheConfig = {
    network: 'devnet',
    packageId: '0x123...',
    metadata: contractMetadata,
    // Optional features
    dubheMetadata: dubheConfigMetadata, // Enables GraphQL + ECS
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY // ⚠️ LOCAL DEVELOPMENT ONLY  // ⚠️ LOCAL DEVELOPMENT ONLY
    },
    endpoints: {
      graphql: process.env.NEXT_PUBLIC_GRAPHQL_URL,
      websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL
    },
    options: {
      enableBatchOptimization: true,
      cacheTimeout: 5000,
      debounceMs: 100,
      reconnectOnError: true
    }
  };

  return (
    <DubheProvider config={config}>
      <YourApp />
    </DubheProvider>
  );
}
```

### Key Benefits of Provider Pattern

- **Single Initialization**: Clients created once using useRef
- **Context Sharing**: All components access same instances
- **No Re-renders**: useRef prevents unnecessary re-initialization
- **Type Safety**: Full TypeScript support across the tree

## 🪝 Hook Usage

### Primary Hook: useDubhe()

Access all Dubhe features in one hook:

```typescript
import { useDubhe } from '@0xobelisk/react/sui';

function MyComponent() {
  const {
    contract, // Dubhe contract instance
    graphqlClient, // GraphQL client (if dubheMetadata provided)
    ecsWorld, // ECS World (if GraphQL available)
    address, // User address
    network, // Current network
    packageId, // Contract package ID
    metadata // Contract metadata
  } = useDubhe();

  return (
    <div>
      <p>Contract: {contract ? '✅' : '❌'}</p>
      <p>GraphQL: {graphqlClient ? '✅' : '❌'}</p>
      <p>ECS: {ecsWorld ? '✅' : '❌'}</p>
    </div>
  );
}
```

### Individual Hooks

For components that only need specific functionality:

```typescript
import React, { useEffect } from 'react';
import { useDubheContract, useDubheGraphQL, useDubheECS } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';

// Contract-only component
function TransactionComponent() {
  const contract = useDubheContract();

  const executeTransaction = async () => {
    const tx = new Transaction();
    await contract.tx.my_system.my_method({ tx });
  };

  return <button onClick={executeTransaction}>Execute</button>;
}

// GraphQL-only component
function DataComponent() {
  const graphqlClient = useDubheGraphQL();

  useEffect(() => {
    if (graphqlClient) {
      graphqlClient.query({ query: '{ entities { id } }' }).then((result) => console.log(result));
    }
  }, [graphqlClient]);

  return <div>Data component</div>;
}

// ECS-only component
function ECSComponent() {
  const ecsWorld = useDubheECS();

  useEffect(() => {
    if (ecsWorld) {
      ecsWorld.getComponent('MyComponent').then((components) => console.log(components));
    }
  }, [ecsWorld]);

  return <div>ECS component</div>;
}
```

## ⚙️ Configuration Reference

### DubheConfig Interface

```typescript
interface DubheConfig {
  /** Network type */
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';

  /** Contract package ID */
  packageId: string;

  /** Contract metadata (required for contract instantiation) */
  metadata: SuiMoveNormalizedModules;

  /** Dubhe Schema ID (optional, for enhanced features) */
  dubheSchemaId?: string;

  /** Dubhe metadata (enables GraphQL/ECS features) */
  dubheMetadata?: any;

  /** Authentication credentials */
  credentials?: {
    secretKey?: string; // ⚠️ LOCAL DEVELOPMENT ONLY - see security warning below
    mnemonics?: string; // ⚠️ LOCAL DEVELOPMENT ONLY - see security warning below
  };

  /** Service endpoints configuration */
  endpoints?: {
    graphql?: string; // Default: 'http://localhost:4000/graphql'
    websocket?: string; // Default: 'ws://localhost:4000/graphql'
  };

  /** Performance and behavior options */
  options?: {
    enableBatchOptimization?: boolean; // Default: true
    cacheTimeout?: number; // Default: 5000ms
    debounceMs?: number; // Default: 100ms
    reconnectOnError?: boolean; // Default: true
  };
}
```

### Environment Variable Configuration

```typescript
// .env.local
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_PACKAGE_ID=0x123...
NEXT_PUBLIC_PRIVATE_KEY=suiprivkey...
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql

// App configuration
function App() {
  const config = {
    network: process.env.NEXT_PUBLIC_NETWORK as NetworkType,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID!,
    metadata: contractMetadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY  // ⚠️ LOCAL DEVELOPMENT ONLY  // ⚠️ LOCAL DEVELOPMENT ONLY
    },
    endpoints: {
      graphql: process.env.NEXT_PUBLIC_GRAPHQL_URL,
      websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL
    }
  };

  return (
    <DubheProvider config={config}>
      <MyApp />
    </DubheProvider>
  );
}
```

## 🔐 Security Warning

> **⚠️ IMPORTANT SECURITY NOTICE**
>
> **`secretKey` and `mnemonics` are for LOCAL DEVELOPMENT ONLY!**
>
> - ❌ **NEVER use secretKey/mnemonics in production**
> - ❌ **NEVER commit private keys to version control**
> - ❌ **NEVER expose private keys in client-side code**
>
> **For production applications:**
>
> - ✅ Use official wallet providers for transaction signing
> - ✅ Implement proper wallet integration (Sui Wallet, etc.)
> - ✅ Let users connect their own wallets securely
>
> **Proper wallet integration example:**
>
> ```typescript
> // For production - use wallet providers instead of secretKey
> const config = {
>   network: 'mainnet',
>   packageId: process.env.NEXT_PUBLIC_PACKAGE_ID!,
>   metadata
>   // ✅ NO credentials - let wallet handle signing
> };
> ```
>
> Keep your private keys safe! If compromised, attackers can steal all funds.

## 📚 Practical Examples

### Basic Contract Usage

```typescript
import React, { useState } from 'react';
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';

function CounterApp() {
  const { contract, address } = useDubhe();
  const [counter, setCounter] = useState(0);

  const queryCounter = async () => {
    try {
      const result = await contract.query.counter_system.get({});
      setCounter(result);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  const incrementCounter = async () => {
    try {
      const tx = new Transaction();
      const result = await contract.tx.counter_system.increment({ tx });
      console.log('Transaction:', result.digest);
      await queryCounter(); // Refresh counter
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <div>
      <h1>Counter: {counter}</h1>
      <p>Address: {address}</p>
      <button onClick={queryCounter}>Refresh</button>
      <button onClick={incrementCounter}>Increment</button>
    </div>
  );
}
```

### GraphQL Integration

```typescript
import React, { useEffect, useState } from 'react';
import { useDubhe } from '@0xobelisk/react/sui';

function DataComponent() {
  const { graphqlClient, ecsWorld } = useDubhe();
  const [entities, setEntities] = useState([]);

  // Real-time subscription
  useEffect(() => {
    if (graphqlClient) {
      const subscription = graphqlClient
        .subscribe({
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
        })
        .subscribe((result) => {
          setEntities(result.data.entities);
        });

      return () => subscription.unsubscribe();
    }
  }, [graphqlClient]);

  // ECS component queries
  const queryComponents = async () => {
    if (ecsWorld) {
      const components = await ecsWorld.getComponent('CounterComponent');
      console.log('Components:', components);
    }
  };

  return (
    <div>
      <h2>Real-time Entities: {entities.length}</h2>
      <button onClick={queryComponents}>Query Components</button>

      {graphqlClient ? (
        <p>✅ GraphQL Connected</p>
      ) : (
        <p>❌ GraphQL Unavailable (add dubheMetadata to config)</p>
      )}
    </div>
  );
}
```

### Error Handling

```typescript
import React from 'react';
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';

function ErrorHandlingExample() {
  const { contract } = useDubhe();

  const handleTransactionWithRetry = async () => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const tx = new Transaction();
        const result = await contract.tx.my_system.my_method({ tx });
        console.log('Success:', result.digest);
        return result;
      } catch (error) {
        attempt++;
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  return <button onClick={handleTransactionWithRetry}>Execute with Retry</button>;
}
```

## 🔧 TypeScript Support

### Type Exports

```typescript
import type {
  NetworkType,
  DubheConfig,
  DubheReturn,
  ContractReturn // Alias for DubheReturn
} from '@0xobelisk/react/sui';
```

### Type-Safe Configuration

```typescript
const config: DubheConfig = {
  network: 'devnet', // Type-safe network selection
  packageId: '0x123...',
  metadata: contractMetadata, // Typed metadata
  credentials: {
    secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY // ⚠️ LOCAL DEVELOPMENT ONLY
  }
};

const result: DubheReturn = useDubhe();
// Full type safety for all return values
```

## 🛠️ Development

```bash
# Watch mode for development
npm run watch

# Type checking
npm run type-check

# Build package
npm run build

# Run tests
npm run test

# Format code
npm run format
```

## 📖 API Reference

### DubheReturn Interface

```typescript
interface DubheReturn {
  contract: Dubhe; // Enhanced contract instance
  graphqlClient: DubheGraphqlClient | null; // GraphQL client (if enabled)
  ecsWorld: DubheECSWorld | null; // ECS World (if enabled)
  metadata: SuiMoveNormalizedModules; // Contract metadata
  network: NetworkType; // Current network
  packageId: string; // Package ID
  dubheSchemaId?: string; // Schema ID (if provided)
  address: string; // User address
  options?: DubheOptions; // Configuration options
  metrics?: DubheMetrics; // Performance metrics
}
```

### Available Hooks

- `useDubhe()` → `DubheReturn` - Complete Dubhe ecosystem
- `useDubheContract()` → `Dubhe` - Contract instance only
- `useDubheGraphQL()` → `DubheGraphqlClient | null` - GraphQL client only
- `useDubheECS()` → `DubheECSWorld | null` - ECS World only
- `useContract()` → `DubheReturn` - Alias for `useDubhe()`

## 🚨 Error Handling

The package includes comprehensive error handling:

```typescript
// Configuration validation
try {
  const { contract } = useDubhe();
} catch (error) {
  console.error('Configuration error:', error.message);
}

// Provider context validation
function MyComponent() {
  try {
    const dubhe = useDubhe();
  } catch (error) {
    // Error: useDubhe must be used within a DubheProvider
  }
}
```
