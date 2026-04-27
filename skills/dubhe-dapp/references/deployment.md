# Deployment & Upgrade

## First Deployment

```sh
dubhe publish --network testnet
```

What happens internally:

1. The package is built and submitted to the network in a publish transaction.
2. After publication the CLI calls `genesis::run(dapp_hub, clock, ctx)` in a
   separate transaction. `genesis::run`:
   - Calls `dapp_system::create_dapp` to create the `DappStorage` shared object.
   - Calls `deploy_hook::run` to set initial state (global resource defaults, etc.).
   - Calls `transfer::public_share_object(ds)` to publish `DappStorage` as shared.
3. Object IDs and version metadata are written to
   `.history/sui_<network>/latest.json`.

After deployment:

- Your DApp's admin is the address that published the package.
- Your DApp has an initial `free_credit` allocation (granted by the framework).
- System functions can be called immediately.

## Version Guard Pattern

Every public system entry function should validate the on-chain version to
prevent stale clients from calling after an upgrade:

```move
module my_game::player_system;

use dubhe::dapp_service::{DappStorage, UserStorage};
use dubhe::dapp_system;
use my_game::dapp_key::DappKey;
use my_game::migrate;

public entry fun create_player(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx:          &mut TxContext,
) {
    // Reject calls from clients using an old package version.
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    // ... rest of the function
}
```

`migrate::on_chain_version()` returns the `ON_CHAIN_VERSION` constant defined in
`sources/scripts/migrate.move`. Increment this constant when you publish an upgrade.

## Upgrading

### Step 1 — Increment the version

In `sources/scripts/migrate.move`, increment `ON_CHAIN_VERSION`:

```move
const ON_CHAIN_VERSION: u32 = 2;  // was 1
```

### Step 2 — Publish the upgrade

```sh
dubhe upgrade --network testnet
```

What happens internally:

1. The new package is built and submitted as an upgrade of the previous one.
2. The new package gets a new package ID.
3. The CLI calls the generated `migrate_to_vN` function which calls
   `dapp_system::upgrade_dapp` to:
   - Append the new package ID to `dapp_storage.package_ids`.
   - Update `dapp_storage.version` to the new version number.

### Step 3 — Clients auto-reject old calls

After the upgrade, any transaction built against the old package fails the
`ensure_latest_version` check, preventing data corruption from stale logic.

## Managing Credits After Deployment

Storage writes consume credits from the DApp's credit pool. Monitor the pool
balance and top up before it reaches zero:

```typescript
// Recharge with the currently accepted coin type (default: SUI).
// Pass the coin type as a type argument — must match DappHub.fee_config.accepted_coin_type.
await dubhe.tx.dapp_system.recharge_credit({
  typeArgs: ['0x2::sui::SUI'], // replace with the accepted coin type if treasury has migrated
  params: [dapp_storage_id, coin_object_id]
});
```

See [dapp_system API — Credit Management](./dapp-api.md#credit-management) for
the full `recharge_credit` signature.

## Network Addresses

After `dubhe publish`, the CLI writes deployment metadata to
`.history/sui_<network>/latest.json`:

```json
{
  "version": 1,
  "packageId": "0x...",
  "dappHubId": "0x...",
  "dappStorageId": "0x..."
}
```

Pass these to `@0xobelisk/sui-client` when constructing the client:

```typescript
import { Dubhe, loadMetadata } from '@0xobelisk/sui-client';
import latest from './.history/sui_testnet/latest.json';

const metadata = await loadMetadata('testnet', latest.packageId);

const dubhe = new Dubhe({
  networkType: 'testnet',
  packageId: latest.packageId,
  metadata,
  frameworkPackageId: latest.dappHubId, // required for session / settlement ops
  dappStorageId: latest.dappStorageId,
  secretKey: process.env.PRIVATE_KEY
});
```
