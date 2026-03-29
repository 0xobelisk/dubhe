# @0xobelisk/client

Unified client creation layer for Dubhe framework with multi-chain support.

## 🚀 Features

- **🎯 Unified Interface** - Configuration aligned with @0xobelisk/react for consistency
- **⚡ All-in-One Bundle** - Contract, GraphQL, gRPC, and ECS clients in one call
- **🛡️ Type Safety** - Complete TypeScript support with strict typing
- **🌐 Platform Agnostic** - Works in Browser, Node.js, and COCOS
- **📦 Multi-Chain Ready** - Extensible architecture for multiple blockchains
- **🔧 Factory Pattern** - Simple client instantiation with validation

## 📦 Installation

```bash
# Install the client package
npm install @0xobelisk/client

# Peer dependencies (automatically installed in most cases)
npm install @0xobelisk/sui-client @0xobelisk/graphql-client @0xobelisk/grpc-client @0xobelisk/ecs
```

### Requirements

- **Node.js**: 18.0.0+
- **TypeScript**: 5.0+ (recommended)

## 🌐 Multi-Chain Support

| Blockchain | Status         | Import Path                |
| ---------- | -------------- | -------------------------- |
| **Sui**    | ✅ Ready       | `@0xobelisk/client/sui`    |
| **Aptos**  | 🚧 Coming Soon | `@0xobelisk/client/aptos`  |
| **Initia** | 🚧 Coming Soon | `@0xobelisk/client/initia` |
| **Rooch**  | 🚧 Coming Soon | `@0xobelisk/client/rooch`  |

## 🚀 Quick Start

### Basic Usage

```typescript
import { createClient } from '@0xobelisk/client/sui';
import { Transaction } from '@0xobelisk/sui-client';
import metadata from './contracts/metadata.json';

// Create client with configuration
const client = createClient({
  network: 'devnet',
  packageId: '0x123...',
  metadata,
  credentials: {
    secretKey: process.env.PRIVATE_KEY
  }
});

// Access all clients from the bundle
const { contract, graphqlClient, grpcClient, ecsWorld, address } = client;

console.log('Connected as:', address);

// Execute a transaction
const tx = new Transaction();
const result = await contract.tx.counter_system.inc({ tx });
console.log('Transaction result:', result);
```

### With Custom Endpoints

```typescript
const client = createClient({
  network: 'testnet',
  packageId: '0x456...',
  metadata,
  credentials: {
    mnemonics: 'your twelve word mnemonic phrase here...'
  },
  endpoints: {
    fullnodeUrls: ['https://custom-rpc.example.com'],
    graphql: 'https://graphql.example.com/graphql',
    websocket: 'wss://graphql.example.com/graphql',
    grpc: 'https://grpc.example.com'
  }
});
```

### With Performance Options

```typescript
const client = createClient({
  network: 'mainnet',
  packageId: '0x789...',
  metadata,
  credentials: { secretKey: '...' },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 10000,
    debounceMs: 200,
    reconnectOnError: true
  }
});
```

## 🌐 Browser Usage

The `@0xobelisk/client` package can be used directly in browsers via a UMD bundle, perfect for vanilla JavaScript projects, Cocos Engine, Flutter WebView, and other browser environments.

### CDN (Recommended)

```html
<!-- Latest version -->
<script src="https://unpkg.com/@0xobelisk/client@latest/dist/browser/obelisk-client.min.js"></script>

<!-- Specific version (recommended for production) -->
<script src="https://unpkg.com/@0xobelisk/client@1.2.0/dist/browser/obelisk-client.min.js"></script>
```

### Local Installation

```html
<script src="./node_modules/@0xobelisk/client/dist/browser/obelisk-client.min.js"></script>
```

### Basic Browser Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Obelisk Client Demo</title>
  </head>
  <body>
    <h1>Dubhe Client Browser Example</h1>
    <button id="connect">Connect</button>
    <div id="result"></div>

    <!-- Load the client -->
    <script src="https://unpkg.com/@0xobelisk/client@latest/dist/browser/obelisk-client.min.js"></script>

    <script>
      // Access via global variable
      const { createClient } = window.ObeliskClient;

      document.getElementById('connect').addEventListener('click', async () => {
          try {
              // Create client
              const client = createClient({
                  network: 'devnet',
                  packageId: '0x123...',
                  metadata: {...}, // Your contract metadata
                  credentials: {
                      secretKey: 'your-private-key'
                  }
              });

              // Use the client
              const { contract, address } = client;
              document.getElementById('result').innerHTML =
                  `Connected as: ${address}`;

              // Execute transaction
              const tx = new Transaction();
              const result = await contract.tx.counter_system.inc({ tx });
              console.log('Transaction result:', result);

          } catch (error) {
              console.error('Error:', error);
              document.getElementById('result').innerHTML =
                  `Error: ${error.message}`;
          }
      });
    </script>
  </body>
</html>
```

### Cocos Engine Integration

```javascript
// In your Cocos Creator script
const { Component } = cc;

cc.Class({
  extends: Component,

  onLoad() {
    // Access ObeliskClient from window
    const { createClient } = window.ObeliskClient;

    this.client = createClient({
      network: 'mainnet',
      packageId: '0xabc...',
      metadata: this.contractMetadata,
      credentials: {
        secretKey: this.privateKey
      }
    });

    console.log('Dubhe client initialized:', this.client.address);
  },

  async executeTransaction() {
    const tx = new Transaction();
    const result = await this.client.contract.tx.game_system.move({
      tx,
      params: [this.x, this.y]
    });
    console.log('Move result:', result);
  }
});
```

### Flutter WebView Integration

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class DubheWebView extends StatefulWidget {
  @override
  _DubheWebViewState createState() => _DubheWebViewState();
}

class _DubheWebViewState extends State<DubheWebView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();

    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadHtmlString('''
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://unpkg.com/@0xobelisk/client@latest/dist/browser/obelisk-client.min.js"></script>
        </head>
        <body>
            <script>
                const { createClient } = window.ObeliskClient;

                // Initialize client
                window.dubheClient = createClient({
                    network: 'testnet',
                    packageId: '0x123...',
                    metadata: {...}
                });

                // Expose functions to Flutter
                window.executeMove = async (x, y) => {
                    const tx = new Transaction();
                    const result = await window.dubheClient.contract.tx.move({
                        tx,
                        params: [x, y]
                    });
                    return JSON.stringify(result);
                };
            </script>
        </body>
        </html>
      ''');
  }

  Future<void> callMove(int x, int y) async {
    final result = await controller.runJavaScriptReturningResult(
      'window.executeMove($x, $y)'
    );
    print('Move result: $result');
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: controller);
  }
}
```

### Browser Build Files

The package provides two versions:

| File                    | Size    | Use Case                       |
| ----------------------- | ------- | ------------------------------ |
| `obelisk-client.js`     | ~241 KB | Development (with source maps) |
| `obelisk-client.min.js` | ~242 KB | Production (optimized)         |

### Global API

When loaded in the browser, all exports are available under `window.ObeliskClient`:

```javascript
// Available functions
window.ObeliskClient.createClient;
window.ObeliskClient.createClientWithValidation;
window.ObeliskClient.validateClientConfig;
window.ObeliskClient.isNetworkType;
```

### TypeScript Support for Browser

If you're using TypeScript in a browser environment, you can still get type safety:

```typescript
declare global {
  interface Window {
    ObeliskClient: typeof import('@0xobelisk/client/sui');
  }
}

const { createClient } = window.ObeliskClient;
```

## 📖 API Reference

### `createClient(config: ClientConfig): DubheClientBundle`

Creates a complete Dubhe client bundle with all necessary instances.

#### Configuration (`ClientConfig`)

| Property        | Type        | Required | Description                                         |
| --------------- | ----------- | -------- | --------------------------------------------------- |
| `network`       | NetworkType | ✅       | Network: 'mainnet', 'testnet', 'devnet', 'localnet' |
| `packageId`     | string      | ✅       | Contract package ID                                 |
| `metadata`      | any         | ✅       | Contract metadata (from dubhe schemagen)            |
| `dubheSchemaId` | string      | ❌       | Dubhe Schema ID for enhanced features               |
| `dubheMetadata` | any         | ❌       | Dubhe metadata for GraphQL/ECS                      |
| `credentials`   | object      | ❌       | Authentication credentials                          |
| `endpoints`     | object      | ❌       | Custom service endpoints                            |
| `options`       | object      | ❌       | Performance and behavior options                    |

#### Credentials

```typescript
credentials?: {
  secretKey?: string;    // Private key (base64 or hex)
  mnemonics?: string;    // 12 or 24 word mnemonic phrase
}
```

#### Endpoints

```typescript
endpoints?: {
  fullnodeUrls?: string[];  // RPC node URLs (multiple for redundancy)
  graphql?: string;         // GraphQL endpoint (default: http://localhost:4000/graphql)
  websocket?: string;       // WebSocket endpoint (default: ws://localhost:4000/graphql)
  grpc?: string;            // gRPC endpoint (default: http://localhost:8080)
}
```

#### Options

```typescript
options?: {
  enableBatchOptimization?: boolean;  // Default: true
  cacheTimeout?: number;              // Default: 5000 (ms)
  debounceMs?: number;                // Default: 100 (ms)
  reconnectOnError?: boolean;         // Default: true
}
```

#### Return Type (`DubheClientBundle`)

```typescript
{
  contract: Dubhe;                      // Main contract client
  graphqlClient: DubheGraphqlClient;    // GraphQL query client
  grpcClient: DubheGrpcClient;          // gRPC client
  ecsWorld: DubheECSWorld;              // ECS World for entity queries
  metadata: SuiMoveNormalizedModules;   // Contract metadata
  network: NetworkType;                 // Network type
  packageId: string;                    // Package ID
  dubheSchemaId?: string;               // Schema ID (if provided)
  address: string;                      // User address
  options?: {...};                      // Options used
}
```

### `createClientWithValidation(config: Partial<ClientConfig>): DubheClientBundle`

Creates a client with strict configuration validation. Throws descriptive errors for invalid configurations.

```typescript
try {
  const client = createClientWithValidation(externalConfig);
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

### `validateClientConfig(config: Partial<ClientConfig>): asserts config is ClientConfig`

Validates a configuration object. Useful for pre-validation before client creation.

```typescript
const config = loadFromFile();
validateClientConfig(config); // Throws if invalid
// config is now guaranteed to be valid
```

## 🔍 Usage Examples

### Contract Interactions

```typescript
import { Transaction } from '@0xobelisk/sui-client';

const client = createClient({
  /* ... */
});

// Execute a contract method
const tx = new Transaction();
await client.contract.tx.my_system.my_method({
  tx,
  params: [arg1, arg2]
});

// Query contract state
const result = await client.contract.query.my_system.get_value({
  tx: new Transaction()
});
```

### GraphQL Queries

```typescript
// Query indexed data
const data = await client.graphqlClient.query({
  query: `
    query GetEntities {
      entities {
        id
        components
      }
    }
  `
});

// Subscribe to real-time updates
client.graphqlClient.subscribe({
  query: `
    subscription OnEntityUpdate {
      entityUpdated {
        id
        components
      }
    }
  `,
  onData: (data) => {
    console.log('Entity updated:', data);
  }
});
```

### ECS World Queries

```typescript
// Get all entities
const entities = client.ecsWorld.getEntities();

// Query entities with specific components
const filtered = client.ecsWorld.queryEntities({
  with: ['Position', 'Velocity']
});

// Watch for entity changes
client.ecsWorld.watchEntity(entityId, (entity) => {
  console.log('Entity changed:', entity);
});
```

### gRPC Queries

```typescript
// High-performance queries via gRPC
const response = await client.grpcClient.query({
  method: 'GetEntity',
  params: { entityId: '0x123...' }
});
```

## 🆚 Comparison with Other Packages

| Package                 | Use Case                        | Dependencies    |
| ----------------------- | ------------------------------- | --------------- |
| `@0xobelisk/sui-client` | Low-level contract interactions | None            |
| `@0xobelisk/client`     | Unified client for any platform | sui-client, etc |
| `@0xobelisk/react`      | React applications with hooks   | React, client   |

**When to use @0xobelisk/client:**

- Node.js scripts and backend services
- COCOS game engine integration
- Browser applications without React
- When you need all client types (contract + GraphQL + ECS)
- Consistency with @0xobelisk/react configuration

**When to use @0xobelisk/sui-client:**

- You only need contract interactions
- Minimal dependencies are important
- Custom client setup is required

## 🛠️ Development

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

### Watch Mode

```bash
pnpm watch
```

## 📄 License

Apache-2.0

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs to the [main repository](https://github.com/0xobelisk/dubhe).

## 📚 Resources

- [Dubhe Documentation](https://docs.obelisk.build)
- [GitHub Repository](https://github.com/0xobelisk/dubhe)
- [Examples](https://github.com/0xobelisk/dubhe/tree/main/examples)

## 💬 Support

- Discord: [Join our community](https://discord.gg/obelisk)
- Twitter: [@0xobelisk](https://twitter.com/0xobelisk)
- Email: team@obelisk.build
