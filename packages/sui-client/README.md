# Dubhe Client SDK

Dubhe is a client-agnostic SDK that supports various platforms including browsers, Node.js, and the COCOS game engine. It provides a simple interface to interact with your Sui Move contracts.

## Getting Started

### Prerequisites

Before using the SDK, make sure you have:

1. Created and deployed your contract using the Dubhe CLI
2. Obtained the `packageId` after deployment

### Data Model Setup

First, define your contract's configuration using `DubheConfig`:

```typescript
import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter',
  systems: ['counter'],
  schemas: {
    counter: {
      structure: {
        value: 'StorageValue<u32>'
      }
    }
  }
} as DubheConfig;
```

Generate the contract code using CLI:

```bash
dubhe schemagen --config-path dubhe.config.ts
```

### Initializing the Client

There are two ways to initialize the Dubhe client:

1. Using dynamic metadata loading:

```typescript
import { loadMetadata, Dubhe, NetworkType } from '@0xobelisk/sui-client';

const network = 'devnet' as NetworkType;
const packageId = 'YOUR_PACKAGE_ID';

const metadata = await loadMetadata(network, packageId);
const dubhe = new Dubhe({
  networkType: network,
  packageId: packageId,
  metadata: metadata,
  secretKey: privkey
});
```

2. Using pre-saved metadata (recommended for better performance):

```typescript
import metadata from './metadata.json';

const dubhe = new Dubhe({
  networkType: network,
  packageId: packageId,
  metadata: metadata,
  secretKey: privkey
});
```

### Executing Transactions

To call contract methods:

```typescript
import { Transaction } from '@0xobelisk/sui-client';

// Create transaction
const tx = new Transaction();
const params = [
  /* your parameters */
];

// Execute transaction
const response = await dubhe.tx.counter_system.inc(tx, params);

// For wallet integration
await dubhe.tx.counter_system.inc(tx, params, undefined, true);
const response = await dubhe.signAndSendTxn(tx);
```

### Session Cap Transactions (Auto Nonce)

The SDK provides session-cap helpers that default to
`dapp_system::*_with_session_cap_nonce` and manage nonce locally.

Recommended flow:

1. Main account (for example passkey wallet) sends a register transaction that
   creates a `SessionCap` for a delegate address.
2. Delegate uses an ephemeral key to call session-cap write helpers.
3. Data/asset subject remains bound to the owner account in the cap subject.

Create session cap (owner signer):

```typescript
const createResp = await ownerDubhe.createSessionCapWithLimits({
  frameworkPackageId: FRAMEWORK_PACKAGE_ID,
  sessionRegistryId,
  dappKeyType: `${APP_PACKAGE_ID}::dapp_key::DappKey`,
  delegate: delegateAddress,
  scopeMask: 1, // set_record
  expiresAtMs: Date.now() + 10 * 60 * 1000,
  maxUses: 20
});
const sessionCapId = ownerDubhe.getCreatedSessionCapId(createResp, {
  frameworkPackageId: FRAMEWORK_PACKAGE_ID
});
```

Execute with delegate key:

```typescript
const response = await dubhe.setRecordWithSessionCap({
  frameworkPackageId: FRAMEWORK_PACKAGE_ID, // optional if Dubhe.packageId is framework package
  dappHubId,
  dappKeyType: `${APP_PACKAGE_ID}::dapp_key::DappKey`,
  // optional: dappKeyValue defaults to {}
  // optional: dappKeyArg to bypass auto serialization
  key: [new Uint8Array([115, 99, 111, 114, 101])], // "score"
  value: [new Uint8Array([1, 0, 0, 0])], // u32 little-endian
  sessionRegistryId,
  sessionCapId
  // optional: expectedNonce (if omitted, SDK reads session_cap::next_nonce)
});
```

Available helpers:

- `createSessionCap`
- `createSessionCapWithLimits`
- `revokeSessionCap`
- `revokeSubjectSessions`
- `getCreatedSessionCapId`
- `getSessionCapNextNonce`
- `setRecordWithSessionCap`
- `setFieldWithSessionCap`
- `deleteRecordWithSessionCap`
- `clearSessionNonceCache`

Runnable script example:

```bash
NETWORK=testnet \
FRAMEWORK_PACKAGE_ID=0x... \
APP_PACKAGE_ID=0x... \
DAPP_HUB_ID=0x... \
SESSION_REGISTRY_ID=0x... \
OWNER_PRIVATE_KEY=... \
DELEGATE_PRIVATE_KEY=... \
pnpm ts-node ./scripts/test_session_cap_nonce.ts
```

### Querying Data

To query contract state:

```typescript
const tx = new Transaction();
const params = [
  /* your parameters */
];
const result = await dubhe.query.counter_system.get(tx, params);

// For BCS encoded results
const decodedData = dubhe.view(result);
```

### BCS Data Decoding

The SDK provides a `view()` method to decode BCS-encoded return values from contract queries.

#### Supported Types

- Basic types (u8, u16, u32, u64, u128, u256)
- Boolean
- String
- Vector
- Struct
- Option
- Custom objects

#### Example with Complex Types

```typescript
// Example contract return type
struct GameState {
    score: u64,
    player_name: String,
    is_active: bool,
    items: vector<Item>
}

// Query and decode
const tx = new Transaction();
const result = await dubhe.query.game_system.get_state(tx, params);
const decodedState = dubhe.view(result);
```

#### Known Limitations

⚠️ **Important Note**:

1. The current implementation cannot automatically decode enum types due to limitations in Sui metadata.
2. Some complex nested structures might require additional handling.

### Entity Key Generation

Dubhe provides three methods for generating entity keys:

```typescript
// From object ID
const objectKey = await dubhe.entity_key_from_object(objectId);

// From string data
const bytesKey = await dubhe.entity_key_from_bytes('hello');

// From number
const numberKey = await dubhe.entity_key_from_u256(123);
```

### Query Owned Objects

To query objects owned by a specific address:

```typescript
const owner = '0xfa99b5b0463fcfb7d0203c701a76da5eda21a96190eb1368ab36a437cc89195e';
const ownedObjects = await dubhe.getOwnedObjects(owner);
```

## Best Practices

1. Use pre-saved metadata for better performance in production
2. Implement proper error handling for BCS decoding
3. Consider the limitations of enum type handling when designing your contract return types

## Support

For more information or support, please visit our GitHub repository or join our community channels.
