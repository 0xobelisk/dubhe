# 🚀 Dubhe React - Modern Sui Development Experience

Modern React integration based on `nanostores` providing a minimal, powerful development experience for Sui blockchain development.

## ✨ Features

- 🎯 **Zero Configuration** - Best practices out of the box
- ⚡ **Smart State Management** - Global state based on nanostores
- 🛡️ **Complete Type Safety** - 100% TypeScript support
- 📊 **Built-in Monitoring** - Performance metrics and error tracking
- 🔄 **Auto Reconnection** - Smart error recovery mechanism
- 🎨 **Modern API** - Intuitive, clean Hook design

## 📦 Installation

```bash
npm install @0xobelisk/react nanostores @nanostores/react
```

## 🚀 Quick Start

### Auto Connection (Recommended)

```tsx
import React from 'react';
import { useDubheAutoConnect, useDubhe } from '@0xobelisk/react/sui';
import metadata from './contracts/metadata.json';
import dubheMetadata from './contracts/dubhe.config.json';

function App() {
  // Auto-connect configuration
  const { isReady, isLoading, error } = useDubheAutoConnect({
    network: 'devnet',
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID!,
    metadata,
    dubheMetadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY,
    },
    options: {
      devMode: true, // Development mode
      cacheTimeout: 3000,
    },
  });

  if (isLoading) return <div>🚀 Connecting...</div>;
  if (error) return <div>❌ Error: {error}</div>;
  if (!isReady) return <div>⏳ Getting ready...</div>;

  return <MyDApp />;
}

function MyDApp() {
  const { address, network } = useDubhe();

  return (
    <div>
      <h1>🎉 Dubhe is ready!</h1>
      <p>Network: {network}</p>
      <p>Address: {address}</p>
    </div>
  );
}
```

### Manual Connection Control

```tsx
import { useDubheConnection } from '@0xobelisk/react/sui';

function ConnectButton() {
  const { isConnected, connect, disconnect, isConnecting } = useDubheConnection();

  const handleConnect = () => {
    connect({
      network: 'devnet',
      packageId: 'your-package-id',
      metadata: yourMetadata,
      // Other configuration...
    });
  };

  if (isConnected) {
    return <button onClick={disconnect}>Disconnect</button>;
  }

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect Dubhe'}
    </button>
  );
}
```

## 🎯 Core Hooks

### useDubhe() - Main State Hook

```tsx
function Dashboard() {
  const {
    isConnected,     // Connection state
    isConnecting,    // Connecting
    hasError,        // Has errors
    status,          // Detailed status
    address,         // User address
    network,         // Current network
    contract,        // Contract instance
    graphql,         // GraphQL client
    ecs,             // ECS World
    metrics,         // Performance metrics
  } = useDubhe();

  return (
    <div>
      <div>Status: {status}</div>
      <div>Address: {address}</div>
      <div>Network: {network}</div>
    </div>
  );
}
```

### useDubheContract() - Enhanced Contract Operations

```tsx
function Counter() {
  const contract = useDubheContract();

  const handleIncrement = async () => {
    if (!contract) return;

    // Use enhanced transaction method
    await contract.txWithOptions('counter_system', 'inc', {
      onSuccess: (result) => console.log('Success!', result.digest),
      onError: (error) => console.error('Failed!', error),
    })({
      tx: new Transaction(),
      params: []
    });
  };

  const handleQuery = async () => {
    // Use enhanced query method (with caching support)
    const result = await contract.queryWithOptions('counter_system', 'get', {
      cache: true,
      cacheTime: 3000
    })({ params: [] });

    console.log('Count:', result[0]?.value);
  };

  return (
    <div>
      <button onClick={handleQuery}>Query</button>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
}
```

### useDubheCapabilities() - Feature Checking

```tsx
function FeatureGate() {
  const capabilities = useDubheCapabilities();

  return (
    <div>
      <div>Contract: {capabilities.contract ? '✅' : '❌'}</div>
      <div>GraphQL: {capabilities.graphql ? '✅' : '❌'}</div>
      <div>ECS: {capabilities.ecs ? '✅' : '❌'}</div>
    </div>
  );
}
```

### useDubheMetrics() - Performance Monitoring

```tsx
function PerformancePanel() {
  const metrics = useDubheMetrics();

  return (
    <div>
      <div>Initialization: {metrics?.initTime}ms</div>
      <div>Requests: {metrics?.requestCount}</div>
      <div>Last Activity: {new Date(metrics?.lastActivity || 0).toLocaleString()}</div>
    </div>
  );
}
```

## ⚙️ Configuration Options

```tsx
const config: DubheConfig = {
  // Basic configuration
  network: 'devnet' | 'testnet' | 'mainnet' | 'localnet',
  packageId: 'your-package-id',
  metadata: yourContractMetadata,
  schemaId?: 'your-schema-id',
  dubheMetadata?: any; // Enable GraphQL/ECS

  // Authentication
  credentials?: {
    secretKey?: string,
    mnemonics?: string,
  },

  // Service endpoints
  endpoints?: {
    graphql?: string;     // Default: http://localhost:4000/graphql
    websocket?: string;   // Default: ws://localhost:4000/graphql
    rpc?: string;
  },

  // Advanced options
  options?: {
    enableBatchOptimization?: boolean; // Default: true
    cacheTimeout?: number;             // Default: 5000ms
    reconnect?: {
      enabled?: boolean;    // Default: true
      maxAttempts?: number; // Default: 3
      delay?: number;       // Default: 1000ms
    },
    debounceMs?: number;    // Default: 100ms
    devMode?: boolean;      // Default: process.env.NODE_ENV === 'development'
  },
};
```

## 🎨 Complete Example

```tsx
import React, { useState } from 'react';
import { 
  useDubheAutoConnect, 
  useDubhe,
  useDubheContract,
  useDubheCapabilities,
  useDubheMetrics 
} from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';

// Configuration
const config = {
  network: 'devnet' as const,
  packageId: process.env.NEXT_PUBLIC_PACKAGE_ID!,
  metadata: yourMetadata,
  dubheMetadata: yourDubheMetadata,
  credentials: {
    secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY,
  },
  options: {
    devMode: true,
    cacheTimeout: 3000,
  },
};

function App() {
  const { isReady, isLoading, error } = useDubheAutoConnect(config);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!isReady) return <div>Getting ready...</div>;

  return <Dashboard />;
}

function Dashboard() {
  const { status, address, network } = useDubhe();
  const capabilities = useDubheCapabilities();
  const metrics = useDubheMetrics();

  return (
    <div>
      <header>
        <h1>Dubhe Dashboard</h1>
        <span>Status: {status}</span>
        <span>Network: {network}</span>
        <span>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <span>Features: {Object.values(capabilities).filter(Boolean).length}/3</span>
      </header>

      <main>
        <ContractDemo />
        <PerformancePanel metrics={metrics} />
      </main>
    </div>
  );
}

function PerformancePanel({ metrics }: { metrics: any }) {
  return (
    <section>
      <h2>Performance Panel</h2>
      <div>Initialization time: {metrics?.initTime}ms</div>
      <div>Request count: {metrics?.requestCount}</div>
    </section>
  );
}

function ContractDemo() {
  const contract = useDubheContract();
  const [count, setCount] = useState(0);

  const queryCount = async () => {
    if (!contract) return;
    
    const result = await contract.queryWithOptions('counter_system', 'get', {
      cache: true
    })({ params: [] });
    
    setCount(result[0]?.value || 0);
  };

  const increment = async () => {
    if (!contract) return;
    
    await contract.txWithOptions('counter_system', 'inc', {
      onSuccess: () => queryCount()
    })({
      tx: new Transaction(),
      params: []
    });
  };

  return (
    <section>
      <h2>Counter: {count}</h2>
      <button onClick={queryCount}>Query</button>
      <button onClick={increment}>Increment</button>
    </section>
  );
}
```

## 🔧 Best Practices

1. **Use auto-connect at app root**
   ```tsx
   // ✅ Recommended
   function App() {
     const { isReady } = useDubheAutoConnect(config);
     if (!isReady) return <Loading />;
     return <MyDApp />;
   }
   ```

2. **Leverage feature checking for conditional rendering**
   ```tsx
   function DataViewer() {
     const capabilities = useDubheCapabilities();
     
     if (!capabilities.graphql) {
       return <div>GraphQL not available</div>;
     }
     
     return <GraphQLDataViewer />;
   }
   ```

3. **Use enhanced contract methods**
   ```tsx
   // ✅ Recommended - with error handling and caching
   await contract.txWithOptions('system', 'method', {
     onSuccess: handleSuccess,
     onError: handleError
   })(params);
   ```

4. **Enable development mode for detailed logs**
   ```tsx
   const config = {
     // ...
     options: { devMode: true }
   };
   ```

## 🚀 Performance Benefits

- **Singleton Pattern**: Single client instance shared across the app
- **Smart Caching**: Automatic caching of query results, reducing duplicate requests
- **Batch Optimization**: Automatic merging of multiple requests
- **Memory Efficiency**: Uses nanostores to minimize re-renders
- **Type Safety**: Compile-time error checking for more stable runtime

## 🤝 Contributing

Issues and Pull Requests are welcome!