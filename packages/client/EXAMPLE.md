# @0xobelisk/client - Usage Examples

This document provides comprehensive examples of using the `@0xobelisk/client` package.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Node.js Backend](#nodejs-backend)
- [Browser Application](#browser-application)
- [COCOS Game Engine](#cocos-game-engine)
- [Advanced Usage](#advanced-usage)

## Basic Setup

### Installation

```bash
npm install @0xobelisk/client
```

### Minimal Example

```typescript
import { createClient } from '@0xobelisk/client/sui';
import metadata from './contracts/metadata.json';

const client = createClient({
  network: 'devnet',
  packageId: '0x123...',
  metadata
});

console.log('Connected as:', client.address);
```

## Node.js Backend

### Script for Contract Interaction

```typescript
// backend/interact.ts
import { createClient } from '@0xobelisk/client/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from '../contracts/metadata.json';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Create client with credentials from environment
  const client = createClient({
    network: 'testnet',
    packageId: process.env.PACKAGE_ID!,
    metadata,
    credentials: {
      secretKey: process.env.PRIVATE_KEY
    },
    endpoints: {
      fullnodeUrls: [process.env.RPC_URL || 'https://fullnode.testnet.sui.io']
    }
  });

  console.log('Connected as:', client.address);

  // Execute transaction
  const tx = new Transaction();
  const result = await client.contract.tx.counter_system.increment({
    tx,
    params: []
  });

  console.log('Transaction successful:', result.digest);
}

main().catch(console.error);
```

### Automated Task with GraphQL

```typescript
// backend/monitor.ts
import { createClient } from '@0xobelisk/client/sui';
import metadata from '../contracts/metadata.json';
import dubheMetadata from '../contracts/dubhe-metadata.json';

async function monitorEntities() {
  const client = createClient({
    network: 'mainnet',
    packageId: process.env.PACKAGE_ID!,
    metadata,
    dubheMetadata,
    endpoints: {
      graphql: 'https://graphql.example.com/graphql',
      websocket: 'wss://graphql.example.com/graphql'
    }
  });

  // Subscribe to entity updates
  client.graphqlClient.subscribe({
    query: `
      subscription OnEntityUpdate {
        entityUpdated {
          id
          components {
            name
            value
          }
        }
      }
    `,
    onData: (data) => {
      console.log('Entity updated:', data);
      // Process update...
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    }
  });

  console.log('Monitoring started...');
}

monitorEntities().catch(console.error);
```

## Browser Application

### Vanilla JavaScript

```typescript
// app.ts
import { createClient } from '@0xobelisk/client/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from './metadata.json';

// Initialize client on page load
let client: any = null;

async function initClient() {
  try {
    client = createClient({
      network: 'devnet',
      packageId: import.meta.env.VITE_PACKAGE_ID,
      metadata,
      credentials: {
        // In production, get from wallet connection
        secretKey: localStorage.getItem('privateKey')
      }
    });

    document.getElementById('address')!.textContent = client.address;
    console.log('Client initialized');
  } catch (error) {
    console.error('Failed to initialize client:', error);
  }
}

async function executeAction() {
  if (!client) {
    alert('Client not initialized');
    return;
  }

  const tx = new Transaction();
  const result = await client.contract.tx.game_system.perform_action({
    tx,
    params: [
      /* action params */
    ]
  });

  console.log('Action executed:', result);
}

// Event listeners
document.addEventListener('DOMContentLoaded', initClient);
document.getElementById('actionBtn')?.addEventListener('click', executeAction);
```

### With ECS for Game State

```typescript
// game.ts
import { createClient } from '@0xobelisk/client/sui';
import metadata from './metadata.json';
import dubheMetadata from './dubhe-metadata.json';

class GameClient {
  private client: any;

  async initialize() {
    this.client = createClient({
      network: 'testnet',
      packageId: import.meta.env.VITE_PACKAGE_ID,
      metadata,
      dubheMetadata,
      endpoints: {
        graphql: import.meta.env.VITE_GRAPHQL_URL,
        websocket: import.meta.env.VITE_WS_URL
      },
      options: {
        enableBatchOptimization: true,
        cacheTimeout: 3000,
        debounceMs: 50
      }
    });

    console.log('Game client initialized');
  }

  async loadGameState() {
    // Query entities with specific components
    const entities = await this.client.ecsWorld.queryEntities({
      with: ['Position', 'Health', 'PlayerOwned']
    });

    return entities;
  }

  watchEntityUpdates(entityId: string, callback: (entity: any) => void) {
    this.client.ecsWorld.watchEntity(entityId, callback);
  }

  async movePlayer(x: number, y: number) {
    const tx = new Transaction();
    return await this.client.contract.tx.movement_system.move({
      tx,
      params: [x, y]
    });
  }
}

export const gameClient = new GameClient();
```

## COCOS Game Engine

### Client Manager for COCOS

```typescript
// assets/scripts/DubheClientManager.ts
import { createClient, DubheClientBundle } from '@0xobelisk/client/sui';
import { _decorator, Component } from 'cc';
import metadata from './metadata.json';
import dubheMetadata from './dubhe-metadata.json';

const { ccclass } = _decorator;

@ccclass('DubheClientManager')
export class DubheClientManager extends Component {
  private static instance: DubheClientManager;
  private client: DubheClientBundle | null = null;

  static getInstance(): DubheClientManager {
    return this.instance;
  }

  onLoad() {
    DubheClientManager.instance = this;
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.client = createClient({
        network: 'mainnet',
        packageId: '0x123...', // Your package ID
        metadata,
        dubheMetadata,
        credentials: {
          secretKey: localStorage.getItem('gamePrivateKey') || undefined
        },
        endpoints: {
          graphql: 'https://game-graphql.example.com/graphql',
          websocket: 'wss://game-graphql.example.com/graphql'
        },
        options: {
          enableBatchOptimization: true,
          cacheTimeout: 5000,
          debounceMs: 100,
          reconnectOnError: true
        }
      });

      console.log('Dubhe client initialized for address:', this.client.address);
      this.setupRealtimeSync();
    } catch (error) {
      console.error('Failed to initialize Dubhe client:', error);
    }
  }

  private setupRealtimeSync() {
    if (!this.client) return;

    // Subscribe to game state updates
    this.client.graphqlClient.subscribe({
      query: `
        subscription OnGameStateUpdate {
          gameStateUpdated {
            playerId
            position { x y }
            health
            score
          }
        }
      `,
      onData: (data) => {
        // Update game state in COCOS
        this.updateGameState(data);
      }
    });
  }

  getClient(): DubheClientBundle {
    if (!this.client) {
      throw new Error('Dubhe client not initialized');
    }
    return this.client;
  }

  private updateGameState(data: any) {
    // Update your COCOS game state here
    console.log('Game state updated:', data);
  }
}
```

### Using in Game Scripts

```typescript
// assets/scripts/PlayerController.ts
import { _decorator, Component } from 'cc';
import { Transaction } from '@0xobelisk/sui-client';
import { DubheClientManager } from './DubheClientManager';

const { ccclass } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
  private clientManager: DubheClientManager | null = null;

  start() {
    this.clientManager = DubheClientManager.getInstance();
  }

  async movePlayer(x: number, y: number) {
    try {
      const client = this.clientManager!.getClient();
      const tx = new Transaction();

      const result = await client.contract.tx.movement_system.move({
        tx,
        params: [x, y]
      });

      console.log('Move successful:', result);
    } catch (error) {
      console.error('Move failed:', error);
    }
  }

  async attackEnemy(enemyId: string) {
    try {
      const client = this.clientManager!.getClient();
      const tx = new Transaction();

      const result = await client.contract.tx.combat_system.attack({
        tx,
        params: [enemyId]
      });

      console.log('Attack successful:', result);
    } catch (error) {
      console.error('Attack failed:', error);
    }
  }
}
```

## Advanced Usage

### Multiple Network Clients

```typescript
import { createClient } from '@0xobelisk/client/sui';

// Testnet client for testing
const testClient = createClient({
  network: 'testnet',
  packageId: '0xtest...',
  metadata: testMetadata,
  credentials: { secretKey: testKey }
});

// Mainnet client for production
const mainClient = createClient({
  network: 'mainnet',
  packageId: '0xmain...',
  metadata: mainMetadata,
  credentials: { secretKey: mainKey }
});

// Use appropriate client based on environment
const client = process.env.NODE_ENV === 'production' ? mainClient : testClient;
```

### Configuration Validation

```typescript
import { createClientWithValidation, validateClientConfig } from '@0xobelisk/client/sui';

// Load config from external source
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Validate before use
try {
  validateClientConfig(config);
  const client = createClient(config);
} catch (error) {
  console.error('Invalid configuration:', error.message);
  process.exit(1);
}

// Or use combined validation
const client = createClientWithValidation(config);
```

### Custom Error Handling

```typescript
import { createClient } from '@0xobelisk/client/sui';
import { Transaction } from '@0xobelisk/sui-client';

const client = createClient({
  /* config */
});

async function executeWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = new Transaction();
      const result = await client.contract.tx.my_system.my_method({
        tx,
        params: [],
        onSuccess: async (result) => {
          console.log('Transaction successful:', result.digest);
        },
        onError: async (error) => {
          console.error('Transaction failed:', error);
          if (i < maxRetries - 1) {
            console.log(`Retrying... (${i + 1}/${maxRetries})`);
          }
        }
      });
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Batch Operations

```typescript
import { createClient } from '@0xobelisk/client/sui';
import { Transaction } from '@0xobelisk/sui-client';

const client = createClient({
  /* config */
});

async function batchProcess(items: any[]) {
  const tx = new Transaction();

  // Add multiple operations to single transaction
  for (const item of items) {
    await client.contract.tx.batch_system.process_item({
      tx,
      params: [item],
      isRaw: true // Don't execute yet
    });
  }

  // Execute all at once
  const result = await client.contract.signAndSendTxn(tx);
  console.log('Batch processed:', result);
}
```

## Environment Variables

Create a `.env` file for your configuration:

```env
# Network
NETWORK=testnet

# Contract
PACKAGE_ID=0x123...
DUBHE_SCHEMA_ID=0x456...

# Credentials
PRIVATE_KEY=your_private_key_here
# Or use mnemonics
MNEMONICS=your twelve word mnemonic phrase here

# Endpoints
RPC_URL=https://fullnode.testnet.sui.io
GRAPHQL_URL=https://graphql.example.com/graphql
WEBSOCKET_URL=wss://graphql.example.com/graphql
GRPC_URL=https://grpc.example.com
```

Then use in your code:

```typescript
import { createClient } from '@0xobelisk/client/sui';
import * as dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  network: process.env.NETWORK as any,
  packageId: process.env.PACKAGE_ID!,
  metadata,
  credentials: {
    secretKey: process.env.PRIVATE_KEY,
    mnemonics: process.env.MNEMONICS
  },
  endpoints: {
    fullnodeUrls: process.env.RPC_URL ? [process.env.RPC_URL] : undefined,
    graphql: process.env.GRAPHQL_URL,
    websocket: process.env.WEBSOCKET_URL,
    grpc: process.env.GRPC_URL
  }
});
```

## Tips and Best Practices

1. **Always validate configuration** when loading from external sources
2. **Use environment variables** for sensitive data (private keys, mnemonics)
3. **Enable batch optimization** for GraphQL queries in production
4. **Set appropriate cache timeouts** based on your application needs
5. **Handle errors gracefully** with proper error boundaries
6. **Use TypeScript** for better type safety and IDE support
7. **Keep metadata up-to-date** by regenerating after contract changes
8. **Test with testnet** before deploying to mainnet
9. **Monitor GraphQL subscriptions** for connection issues
10. **Use the gRPC client** for high-performance scenarios

## Troubleshooting

### Client initialization fails

```typescript
try {
  const client = createClient(config);
} catch (error) {
  console.error('Initialization failed:', error);
  // Check: network, packageId, metadata are correct
  // Check: credentials are valid
  // Check: endpoints are accessible
}
```

### GraphQL queries timeout

```typescript
const client = createClient({
  // ... other config
  options: {
    cacheTimeout: 10000, // Increase timeout
    reconnectOnError: true // Auto-reconnect on errors
  }
});
```

### Transaction failures

```typescript
const tx = new Transaction();
const result = await client.contract.tx.my_system.my_method({
  tx,
  params: [],
  onSuccess: (result) => console.log('Success:', result),
  onError: (error) => {
    console.error('Transaction error:', error);
    // Check: gas budget
    // Check: parameter types
    // Check: account has sufficient balance
  }
});
```

For more examples and documentation, visit [docs.obelisk.build](https://docs.obelisk.build).
