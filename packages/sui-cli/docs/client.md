# Client Packages

Dubhe provides a layered set of client packages for interacting with the on-chain contracts,
the indexer, and the ECS world from TypeScript / JavaScript.

## Package Overview

| Package                     | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `@0xobelisk/client/sui`     | Recommended entry point — bundles all clients in one call |
| `@0xobelisk/react`          | React Provider + hooks for frontend apps                  |
| `@0xobelisk/sui-client`     | Low-level Sui contract client (`Dubhe` class)             |
| `@0xobelisk/graphql-client` | Apollo-based indexer GraphQL client                       |
| `@0xobelisk/ecs`            | Entity-Component-System query / subscription layer        |

---

## `@0xobelisk/client/sui` — Recommended Entry Point

`createClient` initialises all clients at once and returns a `DubheClientBundle`.
Use this for any project that is not using React (Node.js scripts, tests, non-React frontends).

### Install

```sh
pnpm add @0xobelisk/client
```

### Usage

```typescript
import { createClient } from '@0xobelisk/client/sui';
import metadata from './metadata.json';

const client = createClient({
  network: 'testnet', // 'mainnet' | 'testnet' | 'devnet' | 'localnet'
  packageId: '0x123...',
  metadata, // SuiMoveNormalizedModules from loadMetadata()
  credentials: {
    secretKey: process.env.PRIVATE_KEY // base64 or hex private key
    // mnemonics: '...'                   // alternative: 12/24-word mnemonic
  },
  endpoints: {
    graphql: 'http://localhost:4000/graphql',
    websocket: 'ws://localhost:4000/graphql',
    grpc: 'http://localhost:8080'
    // fullnodeUrls: ['https://...'],     // optional: override RPC endpoint
  },
  dubheMetadata: config.dubheMetadata // optional: enables ECS/GraphQL table-awareness
});

// client.contract   — Dubhe instance (call Move functions)
// client.graphqlClient — DubheGraphqlClient (query indexer)
// client.ecsWorld   — DubheECSWorld (entity/component queries)
// client.grpcClient — DubheGrpcClient
// client.address    — user wallet address string
```

### `ClientConfig` Reference

```typescript
interface ClientConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  metadata: any; // from loadMetadata() or imported JSON
  dubheSchemaId?: string;
  dubheMetadata?: any; // enables ECS/GraphQL schema awareness
  credentials?: {
    secretKey?: string; // base64 or hex private key
    mnemonics?: string; // 12 or 24 words, space-separated
  };
  endpoints?: {
    fullnodeUrls?: string[]; // multiple URLs for redundancy
    graphql?: string;
    websocket?: string;
    grpc?: string;
    channelUrl?: string;
  };
  options?: {
    enableBatchOptimization?: boolean; // default true
    cacheTimeout?: number; // ms, default 5000
    debounceMs?: number; // ms, default 100
    reconnectOnError?: boolean; // default true
  };
}
```

### Call a Move function

```typescript
import { Transaction } from '@mysten/sui/transactions';

// PTB transaction
const tx = new Transaction();
await client.contract.tx.player_system.create_player({ tx });

// Query (read-only devInspect)
const result = await client.contract.query.player_system.get_level({ tx: new Transaction() });
```

---

## `@0xobelisk/react` — React Provider + Hooks

For React / Next.js apps. Wraps `createClient` in a Context Provider with `useRef`-based
single-initialisation (no re-renders on config re-evaluation).

### Install

```sh
pnpm add @0xobelisk/react
```

### Setup: Wrap your app with `DubheProvider`

```tsx
import { DubheProvider } from '@0xobelisk/react';
import metadata from './metadata.json';

function App() {
  const config = {
    network: 'testnet',
    packageId: '0x123...',
    metadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    },
    endpoints: {
      graphql: 'http://localhost:4000/graphql',
      websocket: 'ws://localhost:4000/graphql'
    }
  };

  return (
    <DubheProvider config={config}>
      <MyApp />
    </DubheProvider>
  );
}
```

### Hooks

All hooks must be called inside a component tree wrapped by `DubheProvider`.

#### `useDubhe` — full bundle

```tsx
import { useDubhe } from '@0xobelisk/react';

function PlayerCard() {
  const { contract, graphqlClient, ecsWorld, address } = useDubhe();

  const handleMove = async () => {
    const tx = new Transaction();
    await contract.tx.player_system.move_player({ tx });
  };

  return <div>Player: {address}</div>;
}
```

#### `useDubheContract` — contract only

```tsx
const contract = useDubheContract();
await contract.tx.my_system.my_action({ tx });
```

#### `useDubheGraphQL` — GraphQL client only

```tsx
const graphqlClient = useDubheGraphQL();
useEffect(() => {
  graphqlClient.query({ ... }).then(setData);
}, [graphqlClient]);
```

#### `useDubheECS` — ECS world only

```tsx
const ecsWorld = useDubheECS();
const entities = await ecsWorld.getEntitiesWithComponent('player');
```

#### `useDubheConfigUpdate` — dynamic config changes

```tsx
const updateConfig = useDubheConfigUpdate();
// Switch network at runtime:
updateConfig({ network: 'mainnet', packageId: '0xabc...' });
```

---

## `@0xobelisk/sui-client` — Low-Level Contract Client

Use `Dubhe` directly when you need fine-grained control or are not using the bundle factory.

### Install

```sh
pnpm add @0xobelisk/sui-client
```

### Usage

```typescript
import { Dubhe, loadMetadata } from '@0xobelisk/sui-client';

const metadata = await loadMetadata('testnet', '0x123...');

const dubhe = new Dubhe({
  networkType: 'testnet',
  packageId: '0x123...',
  metadata,
  secretKey: process.env.PRIVATE_KEY
  // mnemonics: '...',
  // fullnodeUrls: ['https://...'],
  // frameworkPackageId: '0x...',   // required for proxy operations
});

const address = dubhe.getAddress();

// Send a transaction
const tx = new Transaction();
await dubhe.tx.player_system.create_player({ tx });

// Query (read-only)
const result = await dubhe.query.player_system.get_level({ tx: new Transaction() });
```

---

## `@0xobelisk/graphql-client` — Indexer GraphQL Client

Apollo Client wrapper for the Dubhe indexer. Supports HTTP queries and WebSocket
subscriptions, with optional schema awareness via `dubheMetadata`.

### Install

```sh
pnpm add @0xobelisk/graphql-client
```

### Usage

```typescript
import { createDubheGraphqlClient, QueryBuilders } from '@0xobelisk/graphql-client';

const client = createDubheGraphqlClient({
  endpoint: 'http://localhost:4000/graphql',
  subscriptionEndpoint: 'ws://localhost:4000/graphql',
  dubheMetadata: config.dubheMetadata // optional
});

// Ad-hoc query
const result = await client.query({
  query: gql`
    query {
      players {
        id
        hp
        level
      }
    }
  `
});

// Subscription
client
  .subscribe({
    query: gql`
      subscription {
        playerUpdated {
          id
          hp
        }
      }
    `
  })
  .subscribe(({ data }) => console.log(data));
```

---

## `@0xobelisk/ecs` — Entity-Component-System World

Higher-level abstraction over the GraphQL client. Models on-chain resources as
ECS components and provides entity queries and real-time subscriptions.

In most cases, access the ECS world via `client.ecsWorld` (from `createClient`) or
`useDubheECS()` (from `@0xobelisk/react`) rather than constructing it directly.

### Install

```sh
pnpm add @0xobelisk/ecs
```

### Usage

```typescript
import { createECSWorld } from '@0xobelisk/ecs';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';

const graphqlClient = createDubheGraphqlClient({ endpoint: '...', dubheMetadata });
const world = createECSWorld(graphqlClient, {
  dubheMetadata,
  queryConfig: {
    enableBatchOptimization: true,
    defaultCacheTimeout: 5000
  },
  subscriptionConfig: {
    defaultDebounceMs: 100,
    reconnectOnError: true
  }
});

// Query all entities that have the 'player' component
const entities = await world.getEntitiesWithComponent('player');

// Subscribe to real-time updates for a component
world.subscribeToComponent('player', (update) => {
  console.log('player updated:', update);
});
```

---

## Loading Metadata

`metadata` is required by all contract clients. Load it at startup:

```typescript
import { loadMetadata } from '@0xobelisk/sui-client';

// Fetch from the network at runtime
const metadata = await loadMetadata('testnet', '0x<packageId>');

// Or import a pre-generated JSON file (faster, no network call)
import metadata from './metadata.json';
```

To generate `metadata.json` locally after deployment:

```sh
dubhe load-metadata --network testnet --package-id 0x<packageId>
```
