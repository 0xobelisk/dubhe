# Codegen Pipeline

## Overview

Dubhe uses a code-generation step to produce boilerplate Move modules from a TypeScript
config file. The flow is:

```
dubhe.config.ts
      │
      │  node .../dubhe.js generate
      ▼
sources/codegen/
  ├── error.move               — error constants + assertion helpers
  ├── genesis.move             — DappStorage initialisation entry point
  ├── dapp_key.move            — DappKey struct for this package
  ├── init_test.move           — #[test_only] DappHub factory
  ├── user_storage_init.move   — init_user_storage entry for first-time registration
  ├── resources/
  │     ├── <resource_a>.move  — global (DappStorage) or user (UserStorage)
  │     └── <resource_b>.move
  ├── objects/                 — DApp-owned named shared objects (ObjectStorage<T>)
  │     └── <object_key>.move
  ├── permits/                 — ScenePermit participant management (ScenePermit<T>)
  │     └── <permit_key>.move
  └── scenes/                  — Multi-user scene shared objects (SceneStorage<T>)
        └── <scene_key>.move
```

## Running generate

From the package directory that contains `dubhe.config.ts`:

```sh
node .../dubhe.js generate
```

Both `framework/` and `e2e/` have their own `dubhe.config.ts`. Run generate in each
directory after any config change to keep them in sync.

## `dubhe.config.ts` Structure

```typescript
import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'my_dapp',
  description: '...',

  resources: {
    // Global resource — stored in DappStorage
    server_config: {
      fields: { value: 'u64' },
      global: true
    },
    // User resource — stored in UserStorage
    player_score: {
      fields: { score: 'u64', level: 'u32' },
      keys: ['level']
    },
    // Annotated resources
    gold: { fields: { amount: 'u64' }, fungible: true, transferable: true },
    hp: { fields: { current: 'u64', max: 'u64' }, reactive: true }
  },

  objects: {
    guild: { fields: { level: 'u32' }, accepts: ['gold'] }
  },

  permits: {
    pvp_permit: {}
  },

  scenes: {
    pvp_match: {
      fields: { round: 'u32' },
      authorization: { kind: 'permit', permit: 'pvp_permit' },
      accepts: ['gold']
    }
  },

  errors: {
    not_found: 'Record not found'
  }
} as DubheConfig;
```

## Adding a new error

1. Open `framework/dubhe.config.ts` (and `e2e/dubhe.config.ts` if applicable).
2. Add an entry to the `errors` object.
3. Run generate in both directories.
4. The new constant and helper appear in `codegen/error.move`:

```move
#[error]
const MY_NEW_ERROR: vector<u8> = b"Descriptive error message";
public fun my_new_error_error(condition: bool) { assert!(condition, MY_NEW_ERROR) }
```

5. Call `error::my_new_error_error(condition)` where needed.

## Adding a new resource

1. Add a resource definition to `resources` in `dubhe.config.ts`.
   - Use `global: true` for DApp-wide singleton state (stored in `DappStorage`).
   - Omit `global` (default `false`) for per-user state (stored in `UserStorage`).
   - Add annotations (`fungible`, `reactive`, `transferable`, `listable`) as needed.
2. Run generate.
3. A new module `codegen/resources/<resource_name>.move` is created with:
   - `set`, `get`, `has`, `delete`, `encode` (and struct helpers for multi-field records)
   - Annotation extensions injected by `generateAnnotationExtensions`:
     - `fungible` → `add` / `sub`
     - `keys` (non-offchain, non-global) → `mint` (calls `ensure_has_not` + `set`)
     - `reactive` → `set_reactive` / `set_<field>_reactive`
     - `transferable` → `transfer_user_to_<obj>` / `transfer_<obj>_to_user` for each
       `objects`/`scenes` entry that accepts this resource
     - `listable` → `list<CoinType>` / `buy<CoinType>` / `cancel_listing<CoinType>` /
       `expire_listing<CoinType>`

> All annotation-generated functions are `public(package)` — they must be wrapped
> by system functions that add guards and access control.

## Adding `objects`

1. Add an entry to `objects` in `dubhe.config.ts`.
2. Run generate.
3. A new module `codegen/objects/<key>.move` is created with:
   - `create_<key>` entry function (with admin check if `adminOnly: true`)
   - Field accessors (`get_<field>` / `set_<field>`)
   - Bag accessors for each resource listed in `accepts`:
     - Fungible: `get_<resource>` / `add_<resource>` / `sub_<resource>`
     - Keyed: `has_<resource>` / `get_<resource>_data` / `set_<resource>_data` / `remove_<resource>_data`
   - Cross-object transfer receivers for `acceptsFrom` entries

## Adding `permits`

1. Add an entry to `permits` in `dubhe.config.ts`.
2. Run generate.
3. A new module `codegen/permits/<key>.move` is created with:
   - A phantom marker struct `<PascalKey>`
   - `new_<key>` / `create_<key>` (fixed participant list)
   - `new_<key>_with_invitations` / `create_<key>_with_invitations` (open invitations)
   - `accept_<key>` / `join_<key>` / `leave_<key>` / `expire_<key>` / `share_<key>`
   - `meta` / `is_active` / `is_participant` accessors

Use `permit::meta(&permit)` to get `&PermitMetadata` for passing to `reactive` write functions.

## Adding `scenes`

1. Add an entry to `scenes` in `dubhe.config.ts`. The `authorization` field is required.
2. Run generate.
3. A new module `codegen/scenes/<key>.move` is created with:
   - A phantom marker struct `<PascalKey>`
   - `create_<key>` / `expire_<key>` lifecycle functions
   - Field accessors whose write functions depend on `authorization`:
     - `{ kind: 'permit', permit: '...' }` → `set_<field>(permit, storage, value, ctx)`
     - `{ kind: 'system' }` → `set_<field>(storage, value)` (no permit argument)
   - Bag accessors for `accepts` resources (same as `objects`)
   - Cross-storage transfer receivers for `acceptsFrom` entries

## What NOT to edit

The following files are entirely owned by generate:

- `sources/codegen/error.move`
- `sources/codegen/genesis.move`
- `sources/codegen/dapp_key.move`
- `sources/codegen/init_test.move`
- `sources/codegen/user_storage_init.move`
- `sources/codegen/resources/*.move`
- `sources/codegen/objects/*.move`
- `sources/codegen/permits/*.move`
- `sources/codegen/scenes/*.move`

Any manual changes will be overwritten on the next `generate` run.
Hand-written logic belongs in `sources/systems/`, `sources/core/`, or `sources/utils/`.

## framework/ vs e2e/ sync

`framework/dubhe.config.ts` and `e2e/dubhe.config.ts` serve different purposes.
The framework config defines errors and resources for the core infrastructure; the
e2e config defines resources used in integration tests. After updating either, run
generate in that directory and verify the corresponding `codegen/error.move` compiles.
