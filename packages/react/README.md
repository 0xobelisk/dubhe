# @0xobelisk/react

React integration library providing multi-chain support with React Hooks and components for the Dubhe framework.

## Features

🔌 **Plugin Architecture** - Support for multiple blockchain ecosystems  
📦 **On-Demand Loading** - Install only the chain clients you need  
🎯 **Unified API** - Same interface, different implementations  
🔧 **Type Safety** - Complete TypeScript support  
⚡ **Server Support** - Works on both client and server side

## Supported Blockchains

- ✅ **Sui** - Full support
- 🚧 **Aptos** - Coming soon
- 🚧 **Initia** - Coming soon

## Installation

```bash
# Base package
npm install @0xobelisk/react

# Sui ecosystem support
npm install @0xobelisk/sui-client

# Aptos ecosystem support (coming soon)
# npm install @0xobelisk/aptos-client

# React dependencies
npm install react react-dom
```

## Quick Start

### Using with Sui Ecosystem

```tsx
import React from 'react';
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from './metadata.json';

// 1. Setup Provider
function App() {
  return (
    <DubheProvider
      networkType="devnet"
      packageId="0x..."
      metadata={metadata}
      secretKey="your-secret-key"
    >
      <CounterDApp />
    </DubheProvider>
  );
}

// 2. Use Hook
function CounterDApp() {
  const dubhe = useDubhe();

  if (dubhe.isLoading) return <div>Loading...</div>;
  if (!dubhe.isConnected) return <div>Not connected</div>;

  const handleIncrement = async () => {
    const tx = new Transaction();
    await dubhe.tx?.counter_system.inc({
      tx,
      params: [],
      onSuccess: (result) => console.log('Success:', result.digest),
    });
  };

  const handleQuery = async () => {
    const tx = new Transaction();
    const result = await dubhe.query?.counter_system.get({ tx, params: [] });
    const data = dubhe.view?.(result);
    console.log('Counter value:', data?.[0]?.value);
  };

  return (
    <div>
      <h1>Dubhe Counter DApp</h1>
      <p>Address: {dubhe.address}</p>
      <p>Network: {dubhe.network}</p>
      
      <button onClick={handleQuery}>Query Counter</button>
      <button onClick={handleIncrement}>Increment</button>
      <button onClick={() => dubhe.requestFaucet?.()}>Request Faucet</button>
    </div>
  );
}
```

## Server-Side Usage

### Next.js API Routes

```typescript
// pages/api/counter.ts
import { createDubheClient } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from '../../metadata.json';

const dubhe = createDubheClient({
  environment: 'server',
  networkType: 'devnet',
  packageId: process.env.PACKAGE_ID!,
  metadata,
  secretKey: process.env.PRIVATE_KEY!,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const tx = new Transaction();
      const result = await dubhe.executeTransaction({
        moduleName: 'counter_system',
        functionName: 'inc',
        tx,
        params: [],
      });
      
      res.json({ success: true, digest: result.digest });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### Next.js Server Components

```tsx
// app/counter/page.tsx
import { createDubheClient } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from '../../metadata.json';

async function getCounterValue() {
  const dubhe = createDubheClient({
    environment: 'server',
    networkType: 'devnet',
    packageId: process.env.PACKAGE_ID!,
    metadata,
    secretKey: process.env.PRIVATE_KEY!,
  });

  const tx = new Transaction();
  const result = await dubhe.queryContract({
    moduleName: 'counter_system',
    functionName: 'get',
    tx,
    params: [],
  });

  return dubhe.dubhe.view(result);
}

export default async function CounterPage() {
  const counterData = await getCounterValue();
  
  return (
    <div>
      <h1>Counter Value: {counterData[0]?.value || 0}</h1>
    </div>
  );
}
```

## API Reference

### `useDubhe()` Hook

```tsx
const dubhe = useDubhe();

// State
dubhe.isLoading     // boolean
dubhe.isConnected   // boolean  
dubhe.error         // Error | null
dubhe.address       // string | null
dubhe.network       // NetworkType | null
dubhe.packageId     // string | null

// All Dubhe instance methods
dubhe.tx            // Transaction executor
dubhe.query         // Query executor
dubhe.view()        // BCS data decoder
dubhe.getBalance()  // Get balance
dubhe.requestFaucet() // Request test tokens
// ... All Dubhe methods
```

### `createDubheClient()` Server Client

```typescript
const dubhe = createDubheClient({
  environment: 'server',
  networkType: 'devnet',
  packageId: '0x...',
  metadata,
  secretKey: process.env.PRIVATE_KEY,
});

// Server-specific methods
dubhe.executeTransaction(params)
dubhe.queryContract(params)
dubhe.getBalance(address)
dubhe.requestFaucet(address)
```

## Architecture Design

### Plugin-based Multi-chain Support

```
@0xobelisk/react
├── core/           # Core interfaces and types
├── sui/            # Sui ecosystem implementation
├── aptos/          # Aptos ecosystem implementation (planned)
└── initia/         # Initia ecosystem implementation (planned)
```

### Import Methods

```typescript
// Generic import
import { DubheProvider, useDubhe } from '@0xobelisk/react';

// Ecosystem-specific imports
import { DubheProvider, useDubhe } from '@0xobelisk/react/sui';
import { DubheProvider, useDubhe } from '@0xobelisk/react/aptos';
import { DubheProvider, useDubhe } from '@0xobelisk/react/initia';
```

## Extending to New Blockchains

To add support for a new blockchain, you only need to:

1. Implement the `BaseClient` interface
2. Create corresponding Provider and Context
3. Implement unified Hook interfaces
4. Export to `@0xobelisk/react/{ecosystem}`

## Type Safety

All Hooks and components provide complete TypeScript type support:

```typescript
import type { SuiHookResult, SuiProviderConfig } from '@0xobelisk/react/sui';
```

## Development and Debugging

```bash
# Development mode
npm run watch

# Type checking
npm run type-check

# Build
npm run build
```

This design allows you to easily provide unified React integration for different blockchain ecosystems while maintaining code modularity and maintainability! 🚀
