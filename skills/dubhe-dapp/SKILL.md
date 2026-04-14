---
name: dubhe-dapp
description: Guides development of DApps built on top of the Dubhe framework on Sui. Use this skill whenever the user is building, configuring, deploying, or upgrading a Dubhe DApp — including writing dubhe.config.ts, running dubhe generate, writing Move system functions, deploying with dubhe publish/upgrade, or using the TypeScript client packages (@0xobelisk/client, @0xobelisk/react, @0xobelisk/sui-client). Also use when the user asks about Dubhe storage, session keys, credit management, DappStorage/UserStorage, or the ECS world client.
---

# Dubhe DApp Development

This skill covers the full lifecycle of building a DApp on the Dubhe framework: from defining
the schema in `dubhe.config.ts`, generating Move code, writing system functions, deploying on
Sui, and interacting with the chain from TypeScript.

## Reference Files

Load the relevant reference file(s) based on the user's question. Each file is self-contained.

| File                         | When to read                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `references/quickstart.md`   | Getting started, project scaffolding, first deploy end-to-end                                       |
| `references/cli.md`          | Any `dubhe` CLI command (`generate`, `publish`, `upgrade`, `test`, `watch`, `node`, `faucet`, etc.) |
| `references/dubhe-config.md` | `dubhe.config.ts` fields — `resources`, `enums`, `errors`, `global`, `keys`, `offchain` options     |
| `references/dapp-api.md`     | `dapp_system` public API — guards, storage, session keys, credit, admin, ownership                  |
| `references/deployment.md`   | First publish flow, version guard pattern, upgrading, credit management after deploy                |
| `references/upgrade.md`      | Full upgrade lifecycle — compatible/breaking upgrades, schema migration, boundary conditions        |
| `references/client.md`       | TypeScript clients — `createClient`, `Dubhe`, `DubheProvider` + hooks, GraphQL, ECS, DubheChannel   |

Read multiple files when the question spans several topics. When in doubt about which
to load, start with `quickstart.md` for new-user questions and `dapp-api.md` for API questions.

## Key Concepts

**Three-tier storage**: `DappHub` (framework global) → `DappStorage` (per-DApp shared) →
`UserStorage` (per-user shared object, one per user per DApp). DApp contracts never receive
a raw address to identify users; the user passes their own `UserStorage` object, and the
framework verifies ownership via `canonical_owner`.

**Code generation**: `dubhe.config.ts` drives `dubhe generate` to produce all boilerplate
under `sources/codegen/`. Never edit generated files by hand — change the config and regenerate.

**Version guard**: Every public entry function must call
`dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version())`
to prevent stale clients from writing after an upgrade.

**Credits**: Storage writes consume credits from `DappStorage.credit_pool`. Call
`dapp_system::settle_writes` periodically to settle user debt. Top up with `recharge_credit`.
The per-user unsettled write limit is `MAX_UNSETTLED_WRITES = 1_000`.

## Quick Patterns

### Minimal system function

```move
module my_game::player_system;

use dubhe::dapp_service::{DappStorage, UserStorage};
use dubhe::dapp_system;
use my_game::dapp_key::DappKey;
use my_game::migrate;
use my_game::player;

public entry fun create_player(
    dapp_storage: &DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    player::set(user_storage, 100, 10, 1, ctx);
}
```

### TypeScript client (recommended)

```typescript
import { createClient } from '@0xobelisk/client/sui';
import latest from './.history/sui_testnet/latest.json';
import metadata from './metadata.json';

const client = createClient({
  network: 'testnet',
  packageId: latest.packageId,
  metadata,
  credentials: { secretKey: process.env.PRIVATE_KEY }
});

await client.contract.tx.player_system.create_player({ tx });
```
