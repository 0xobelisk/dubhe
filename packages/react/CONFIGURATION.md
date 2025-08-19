# Dubhe React Configuration Guide

## Overview

The Dubhe React package has been updated to follow a more explicit configuration pattern. **Environment variables are no longer handled internally** - developers must handle environment variables themselves before passing configuration to the hooks.

## Key Changes

### Before (❌ Old Pattern)
```typescript
// The library used to handle environment variables internally
const { contract } = useContract(); // Would automatically read process.env
```

### After (✅ New Pattern)
```typescript
// Developers explicitly handle environment variables
const { contract } = useContract({
  network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as NetworkType,
  packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || 'default-package-id',
  metadata: contractMetadata,
  credentials: process.env.NEXT_PUBLIC_PRIVATE_KEY ? {
    secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
  } : undefined
});
```

## Benefits of the New Approach

1. **🎯 Explicit Control**: Developers have full control over environment variable handling
2. **🔒 Security**: No internal environment variable processing reduces security risks
3. **🧪 Testing**: Easier to test with mock configurations
4. **📦 Bundle Size**: Smaller bundle size by removing internal env processing
5. **🔧 Flexibility**: Different environments can be handled differently

## Usage Patterns

### 1. Basic Configuration

```typescript
import { useContract } from '@0xobelisk/react/sui';
import metadata from './contracts/metadata.json';

function MyApp() {
  const { contract, address } = useContract({
    network: 'devnet',
    packageId: '0x123...',
    metadata,
    credentials: {
      secretKey: 'your-secret-key'
    }
  });

  return <div>Connected as {address}</div>;
}
```

### 2. Environment Variable Helper

```typescript
import { useContract } from '@0xobelisk/react/sui';
import type { DubheConfig, NetworkType } from '@0xobelisk/react/sui';

// Helper function to build config from environment variables
function getConfigFromEnv(): Partial<DubheConfig> {
  const config: Partial<DubheConfig> = {
    network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as NetworkType,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    metadata: require('./contracts/metadata.json'),
    endpoints: {
      graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
    }
  };

  // Only add credentials if private key is available
  if (process.env.NEXT_PUBLIC_PRIVATE_KEY) {
    config.credentials = {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    };
  }

  return config;
}

function MyApp() {
  const { contract, graphqlClient } = useContract(getConfigFromEnv());
  
  return <div>My DApp</div>;
}
```

### 3. Multiple Environment Support

```typescript
// config/environments.ts
export const environments = {
  development: {
    network: 'devnet' as const,
    packageId: '0xdev...',
    endpoints: {
      graphql: 'http://localhost:4000/graphql',
      websocket: 'ws://localhost:4000/graphql'
    }
  },
  staging: {
    network: 'testnet' as const,
    packageId: '0xstaging...',
    endpoints: {
      graphql: 'https://staging-api.example.com/graphql',
      websocket: 'wss://staging-api.example.com/graphql'
    }
  },
  production: {
    network: 'mainnet' as const,
    packageId: '0xprod...',
    endpoints: {
      graphql: 'https://api.example.com/graphql',
      websocket: 'wss://api.example.com/graphql'
    }
  }
};

// In your app
function MyApp() {
  const env = process.env.NODE_ENV || 'development';
  const config = {
    ...environments[env],
    metadata: require('./contracts/metadata.json'),
    credentials: process.env.PRIVATE_KEY ? {
      secretKey: process.env.PRIVATE_KEY
    } : undefined
  };

  const { contract } = useContract(config);
  return <div>My DApp</div>;
}
```

### 4. Configuration Validation

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  network: z.enum(['mainnet', 'testnet', 'devnet', 'localnet']),
  packageId: z.string().startsWith('0x'),
  privateKey: z.string().optional(),
  graphqlEndpoint: z.string().url().optional()
});

function createValidatedConfig() {
  const rawConfig = {
    network: process.env.NEXT_PUBLIC_NETWORK,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    privateKey: process.env.NEXT_PUBLIC_PRIVATE_KEY,
    graphqlEndpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT
  };

  const validatedConfig = ConfigSchema.parse(rawConfig);

  return {
    network: validatedConfig.network,
    packageId: validatedConfig.packageId,
    metadata: require('./contracts/metadata.json'),
    credentials: validatedConfig.privateKey ? {
      secretKey: validatedConfig.privateKey
    } : undefined,
    endpoints: validatedConfig.graphqlEndpoint ? {
      graphql: validatedConfig.graphqlEndpoint
    } : undefined
  };
}
```

## Migration Guide

### Step 1: Update Your Hook Calls

Replace any calls to hooks without parameters:

```typescript
// Before
const { contract } = useContract();

// After
const { contract } = useContract({
  network: 'devnet',
  packageId: '0x123...',
  metadata: contractMetadata
});
```

### Step 2: Handle Environment Variables Explicitly

Create a configuration function:

```typescript
function getAppConfig() {
  return {
    network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as NetworkType,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || 'default-package-id',
    metadata: contractMetadata,
    credentials: process.env.NEXT_PUBLIC_PRIVATE_KEY ? {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    } : undefined
  };
}
```

### Step 3: Update Your Components

```typescript
function App() {
  const config = getAppConfig();
  const { contract, address } = useContract(config);
  
  return <MyDApp contract={contract} address={address} />;
}
```

## Environment Variables Reference

The following environment variables are commonly used (but you must handle them yourself):

- `NEXT_PUBLIC_NETWORK`: Network type (`mainnet`, `testnet`, `devnet`, `localnet`)
- `NEXT_PUBLIC_PACKAGE_ID`: Contract package ID
- `NEXT_PUBLIC_PRIVATE_KEY`: Private key for transactions
- `NEXT_PUBLIC_DUBHE_SCHEMA_ID`: Schema ID for enhanced features
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT`: GraphQL endpoint URL
- `NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT`: GraphQL WebSocket endpoint URL

## Best Practices

1. **Use TypeScript**: Leverage the type system for configuration validation
2. **Validate Environment Variables**: Use libraries like `zod` for runtime validation
3. **Separate Concerns**: Keep environment handling separate from business logic
4. **Test Configurations**: Mock configurations in tests for better coverage
5. **Document Your Setup**: Make it clear how to configure your app for new developers

## Troubleshooting

### Common Issues

1. **Missing Required Configuration**: Make sure all required fields are provided
2. **Invalid Network Type**: Ensure network is one of the supported values
3. **Package ID Format**: Package IDs must start with `0x`
4. **Credentials Handling**: Only pass credentials when they exist, avoid empty strings

### Debug Tips

```typescript
// Add logging to see your final configuration
const config = getAppConfig();
console.log('Dubhe Config:', {
  ...config,
  credentials: config.credentials ? '[REDACTED]' : undefined
});

const { contract } = useContract(config);
```
