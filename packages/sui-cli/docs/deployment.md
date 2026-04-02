# Deployment & Upgrade

## First Deployment

```sh
dubhe publish --network testnet
```

What happens internally:

1. `sui move publish` publishes the package to the network.
2. The Sui runtime calls the `init` function in `genesis.move` (auto-generated).
3. `genesis::init` calls `deploy_hook::run`, which:
   - Creates the `DappHub` shared object.
   - Sets the global fee config (`free_credit`, `base_fee`, `byte_fee`).
   - Records `ctx.sender()` as the Dubhe framework admin.
   - Calls `dapp_system::create_dapp` to register your DApp (idempotent).
4. The package ID and DappHub object ID are written to `Published.toml`.

After deployment:

- Your DApp's admin is the address that published the package.
- Your DApp has an initial `free_credit` allocation (set by the framework).
- System functions can be called immediately.

## Version Guard Pattern

Every public system function entry point should validate the on-chain version to
prevent stale clients from calling after an upgrade:

```move
module my_game::player_system;

use dubhe::dapp_system;
use my_game::dapp_key::DappKey;
use my_game::migrate;

public fun create_player(dh: &mut DappHub, dapp_key: DappKey, ctx: &mut TxContext) {
    // Reject calls from clients using an old package version.
    dapp_system::ensure_latest_version<DappKey>(dh, migrate::on_chain_version());
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

1. `sui move upgrade` publishes the new package as an upgrade of the previous one.
2. The new package gets a new package ID.
3. `upgrade_dapp` is called (via the upgrade transaction) to:
   - Append the new package ID to `dapp_metadata.package_ids`.
   - Update `dapp_metadata.version` to the new version number.

### Step 3 — Clients auto-reject old calls

After the upgrade, any transaction built against the old package will fail the
`ensure_latest_version` check, preventing data corruption from stale logic.

## Managing Credits After Deployment

Storage writes consume credits. Monitor your DApp's balance and top up as needed:

```typescript
// Recharge with 1 SUI
await client.tx.dapp_system.recharge_credit({
  payment: coin_object_id
});
```

Or call directly from the CLI:

```sh
dubhe recharge --amount 1000000000 --network testnet
```

## Network Addresses

After `dubhe publish`, the generated `Published.toml` and `.history/` contain:

- `package_id` — the on-chain Move package address
- `dapp_hub` — the shared `DappHub` object ID

Pass these to `@0xobelisk/sui-client` when constructing the client:

```typescript
import { DubheClient } from '@0xobelisk/sui-client';
import published from './Published.toml';

const client = new DubheClient({
  network: 'testnet',
  packageId: published.package_id,
  metadata: published
});
```
