# Quickstart — Build a DApp with Dubhe

## Prerequisites

- Node.js >= 22, pnpm >= 9
- `@0xobelisk/sui-cli` installed (locally or globally)
- Sui CLI installed and configured with a funded keypair

## Step 1 — Define `dubhe.config.ts`

Create a `dubhe.config.ts` in your project root:

```typescript
import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
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
} as DubheConfig;
```

See [DubheConfig Reference](./dubhe-config.md) for all options.

## Step 2 — Generate Move Code

```sh
node node_modules/@0xobelisk/sui-cli/dist/dubhe.js schemagen
```

This creates `sources/codegen/` with:

- `resources/player.move` — `set(user_storage, ...)`, `get(user_storage)`, `has`, `delete`
- `resources/game_config.move` — `set(dapp_storage, ...)`, `get(dapp_storage)`, `has`
- `errors.move` — `player_not_found_error(condition)`, etc.
- `genesis.move`, `dapp_key.move`, `init_test.move` — framework glue

**Do not edit these files by hand.** Change the config and re-run generate instead.

## Step 3 — Write a System Function

Create `sources/systems/player_system.move`:

```move
module my_game::player_system;

use dubhe::dapp_service::{DappStorage, UserStorage};
use my_game::errors::player_not_found_error;
use my_game::migrate;
use my_game::player;

/// Initialize a new player for the caller.
public entry fun create_player(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    // Always check version to reject stale clients after an upgrade.
    my_game::dapp_key::assert_latest_version(dapp_storage, migrate::on_chain_version());
    player::set(user_storage, 100, 10, 1, ctx);
}

/// Level up the caller's player.
public entry fun level_up(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    my_game::dapp_key::assert_latest_version(dapp_storage, migrate::on_chain_version());
    player_not_found_error(player::has(user_storage));

    let level = player::get_level(user_storage);
    player::set_level(user_storage, level + 1, ctx);
}
```

> **Note**: The caller owns `user_storage` — the framework never accepts a raw address
> parameter for user data. This eliminates the CVE-D-02 class of storage spoofing attacks.

## Run Move unit tests (optional)

From the project root (where `dubhe.config.ts` lives):

```sh
dubhe test
dubhe test <filter>   # substring of the fully qualified name (addr::module::function)
dubhe test --list     # list tests without running (same as sui move test -l)
```

See the [CLI `test` command](/dubhe/sui/cli#test) for `--gas-limit`, `--config-path`, and how filters map to `sui move test`.

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
import { Dubhe } from '@0xobelisk/sui-client';

const dubhe = new Dubhe({ networkType: 'testnet', packageId: '0x...' });
// SDK auto-discovers and injects dapp_storage and user_storage
await dubhe.tx.player_system.create_player();
```
