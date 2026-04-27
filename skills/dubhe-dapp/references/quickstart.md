# Quickstart — Build a DApp with Dubhe

## Option A — Use the Scaffold (Recommended)

The fastest way to start is with the interactive scaffold, which creates a
full project with Move contracts, deployment scripts, and an optional frontend:

```sh
pnpm create dubhe
```

Choose a template (`contract`, `101`, or `nextjs`) and a project name. The scaffold
creates a ready-to-run project with a sample `dubhe.config.ts`, system functions,
deploy scripts, and a configured `package.json`.

## Option B — Manual Setup

If you prefer to start from scratch or are adding Dubhe to an existing project,
follow the steps below.

### Prerequisites

- Node.js >= 22, pnpm >= 9
- `@0xobelisk/sui-cli` installed (locally or globally)
- Sui CLI installed and configured with a funded keypair

---

## Step 1 — Define `dubhe.config.ts`

Create a `dubhe.config.ts` in your project root:

```typescript
import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'my_game', // used as Move module name prefix
  description: 'My on-chain game',
  resources: {
    // Global resource — one shared value for the whole DApp (stored in DappStorage)
    game_config: {
      global: true,
      fields: {
        max_level: 'u32',
        start_hp: 'u64'
      }
    },
    // User resource — per-player data (stored in each player's UserStorage)
    player: {
      fields: {
        hp: 'u64',
        attack: 'u64',
        level: 'u32'
      }
    }
  },
  errors: {
    player_not_found: 'Player not found',
    max_level_reached: 'Player has reached the maximum level'
  }
});
```

See [DubheConfig Reference](./dubhe-config.md) for all options.

## Step 2 — Generate Move Code

```sh
node node_modules/@0xobelisk/sui-cli/dist/dubhe.js generate
```

This creates `sources/codegen/` with:

- `resources/player.move` — `set(user_storage, ...)`, `get(user_storage)`, `has`, `delete`
- `resources/game_config.move` — `set(dapp_storage, ...)`, `get(dapp_storage)`, `has`
- `error.move` — `player_not_found_error(condition)`, etc.
- `user_storage_init.move` — `init_user_storage` entry function for first-time user registration
- `genesis.move`, `dapp_key.move`, `init_test.move` — framework glue

**Do not edit these files by hand.** Change the config and re-run generate instead.

## Step 3 — Write a System Function

Create `sources/systems/player_system.move`:

```move
module my_game::player_system;

use dubhe::dapp_service::{DappStorage, UserStorage};
use dubhe::dapp_system;
use my_game::dapp_key::DappKey;
use my_game::error::player_not_found_error;
use my_game::migrate;
use my_game::player;

/// Initialize a new player for the caller.
public entry fun create_player(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    // Always check version to reject stale clients after an upgrade.
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    player::set(user_storage, 100, 10, 1, ctx);
}

/// Level up the caller's player.
public entry fun level_up(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    player_not_found_error(player::has(user_storage));

    let level = player::get_level(user_storage);
    player::set_level(user_storage, level + 1, ctx);
}
```

> **Note**: The user passes their own `user_storage` (a shared object they own) —
> the framework never accepts a raw address parameter for user data. This eliminates
> the CVE-D-02 class of storage spoofing attacks.

## Step 4a — Register a User (first time)

Before a user can interact with user-level resources, they must call
`user_storage_init::init_user_storage` once to create their `UserStorage`:

```typescript
// Call the generated entry function (one-time, per user per DApp)
await dubhe.tx.user_storage_init.init_user_storage({ tx });
```

## Run Move unit tests (optional)

From the project root (where `dubhe.config.ts` lives):

```sh
dubhe test
dubhe test <filter>   # substring of the fully qualified name (addr::module::function)
dubhe test --list     # list tests without running (same as sui move test -l)
```

See the [CLI Reference](./cli.md#test-filter) for `--gas-limit`, `--config-path`, and how filters map to `sui move test`.

## Step 4 — Deploy

```sh
dubhe publish --network testnet
```

On first publish, `genesis::run` creates `DappStorage`, calls `deploy_hook::run` to
set initial state, then shares it. See [Deployment & Upgrade](./deployment.md) for details.

## Step 5 — Call from a Client

After deployment, the TypeScript client (`@0xobelisk/sui-client`) can call your system
functions. `UserStorage` is discovered and injected automatically:

```typescript
import { Dubhe, loadMetadata } from '@0xobelisk/sui-client';
import { Transaction } from '@mysten/sui/transactions';

const metadata = await loadMetadata('testnet', '0x<packageId>');
const dubhe = new Dubhe({ networkType: 'testnet', packageId: '0x<packageId>', metadata });

const tx = new Transaction();
await dubhe.tx.player_system.create_player({ tx });
```
