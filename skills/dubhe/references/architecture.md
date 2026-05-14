# Dubhe Framework Architecture

## Overview

Dubhe is a Sui Move framework that provides shared infrastructure for on-chain DApp development.
It uses a three-tier storage model (v2): `DappHub` (global registry), `DappStorage` (per-DApp
shared object), and `UserStorage` (per-user owned object). Higher-level modules (`dapp_system`,
`address_system`) expose the public API that DApp contracts call.

## Module Layers

```
┌──────────────────────────────────────────────────────┐
│  DApp contracts  (user-written, call systems/)       │
└───────────────────────┬──────────────────────────────┘
                        │ calls
┌───────────────────────▼──────────────────────────────┐
│  systems/                                            │
│  ├── dapp_system       — primary public API          │
│  ├── address_system    — cross-chain origin lookup   │
│  └── utils             — shared helpers              │
└───────────────────────┬──────────────────────────────┘
                        │ calls
┌───────────────────────▼──────────────────────────────┐
│  core/                                               │
│  ├── dapp_service      — DappHub/DappStorage/        │
│  │                        UserStorage storage layer  │
│  ├── events            — event emission              │
│  ├── data_key          — composite key encoding      │
│  └── table_*           — table metadata helpers      │
└───────────────────────┬──────────────────────────────┘
                        │ uses
┌───────────────────────▼──────────────────────────────┐
│  codegen/              — AUTO-GENERATED, do not edit │
│  ├── error.move                                      │
│  ├── genesis.move                                    │
│  ├── dapp_key.move                                   │
│  ├── init_test.move                                  │
│  ├── user_storage_init.move                          │
│  └── resources/        — one module per resource     │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  scripts/                                            │
│  ├── deploy_hook       — runs once on first deploy   │
│  └── migrate           — defines ON_CHAIN_VERSION    │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  utils/                                              │
│  ├── bcs               — BCS encode/decode helpers   │
│  ├── type_info         — type name / package id      │
│  ├── math              — safe arithmetic             │
│  └── entity_id         — deterministic ID derivation │
└──────────────────────────────────────────────────────┘
```

## Three-Tier Storage Model (v2)

### `DappHub` — Global Registry

A single shared object holding framework-level config (`FrameworkFeeConfig`) and the global
DApp registry. Created once during genesis. Passed to lifecycle functions (upgrade, admin ops).

### `DappStorage` — Per-DApp Shared Object

One `DappStorage` is created per DApp (via `dapp_system::create_dapp`). It holds:

- DApp metadata (name, admin, version, package IDs)
- Global resources (shared state accessible by all users)
- Credit pool for lazy settlement fees
- Suspension flag

### `UserStorage` — Per-User Shared Object

Each user has one `UserStorage` per DApp (a shared object created via `user_storage_init::init_user_storage`). It holds user-scoped resources (hot-path writes).
Writes are tracked with `write_count` / `settled_count` for the Lazy Settlement fee model.
The canonical owner has full authority — the DApp cannot forcibly modify their storage.

---

## Extended Storage Layer (codegen-driven)

In addition to the three core objects, `dubhe generate` produces typed shared objects
for richer data models. These are declared in `dubhe.config.ts` under `objects`,
`permits`, and `scenes`.

### `ObjectStorage<T>` — DApp-Owned Named Entities

`objects` entries generate `ObjectStorage<MarkerType>` shared objects. The DApp
(not any individual user) controls creation. Examples: guilds, boss encounters,
seasonal reward pools.

- Created by `create_<key>` (optionally restricted to DApp admin via `adminOnly: true`).
- Stores typed resource data in an internal `Bag`, accessed via generated accessors.
- Resources can be transferred between `UserStorage` and `ObjectStorage` when both
  declare `transferable: true` / `accepts: [...]`.
- Entity uniqueness is enforced: the same `entity_id` for the same type cannot be
  registered twice in `DappStorage`.

### `ScenePermit<T>` — Participant Authorization Objects

`permits` entries generate `ScenePermit<MarkerType>` shared objects that manage a
set of authorized participants and an optional expiry. Permits serve two roles:

1. **Authorization token for `reactive` writes** — `set_reactive` / `set_<field>_reactive`
   require `scene_id: &sui::object::UID` and `meta: &dubhe::dapp_service::PermitMetadata`.
   The framework verifies both the writer (`from.canonical_owner`) and the target
   (`target.canonical_owner`) are listed in the permit.

2. **Write gate for `SceneStorage`** — scenes declared with
   `authorization: { kind: 'permit', permit: '...' }` require a matching `ScenePermit`
   to call `set_<field>`.

`PermitMetadata` is obtained via `permit::meta(&scene_permit)`.

### `SceneStorage<T>` — Multi-User Scene Objects

`scenes` entries generate `SceneStorage<MarkerType>` shared objects for time-bounded
multi-user interactions (PvP matches, dungeon runs, etc.).

- Each scene has an `authorization` field that controls field writes:
  - `{ kind: 'permit', permit: '...' }` — `set_<field>` requires `&ScenePermit<T>`
  - `{ kind: 'system' }` — `set_<field>` is callable directly by system functions
- Scenes store resources in a `Bag`; the bag must be empty before the scene can be destroyed.
- `expire_<scene>` destroys the scene after its expiry time has passed.

## Lazy Settlement Fee Model

DApps pay fees for user writes lazily:

1. Each write to `UserStorage` increments `write_count`.
2. Periodically, `settle_writes` charges `fee_due` (base fee + bytes fee × bytes written) from `credit_pool`.
3. If `credit_pool` runs dry, the DApp is `suspended` until it is recharged.
4. A per-user debt limit (`MAX_UNSETTLED_WRITES = 1_000`) prevents runaway debt.

## Key Modules

### `dapp_service` (core)

The storage layer. Provides `set_global_record`, `get_global_record`, `set_record`, `get_record`,
`set_field`, `get_field`, `has_record`, and related operations on `DappStorage` and `UserStorage`.
Not called directly by DApp contracts — they go through `dapp_system`.

### `dapp_system` (systems)

The primary public API. Wraps `dapp_service` calls and adds:

- Lazy settlement fee enforcement on every user write
- Admin / version / pause guard functions
- DApp lifecycle (`create_dapp` returns `DappStorage` for deploy_hook, then share it)
- Ownership transfer (`propose_ownership`, `accept_ownership`) — Ownable2Step pattern
- Credit management (`recharge_credit` — any address can top up the DApp's credit pool)
- Session key management (`activate_session`, `deactivate_session`)
- Scene permit management (`new_scene_permit`, `create_and_share_scene_permit`,
  `join_scene_permit`, `leave_scene_permit`, `accept_scene_permit_invitation`,
  `destroy_scene_permit`)
- Reactive write enforcement (`set_record_reactive`, `set_field_reactive` — verify
  both writer and target are in the permit's participant list)
- Object entity registration (`register_object_entity`, `unregister_object_entity`)
- Marketplace helpers (`take_record`, `buy_record`, `restore_record`, `expire_listing`,
  `take_fungible_record`, `buy_fungible_record`, etc.)

### `address_system` (systems)

Resolves the "real" user address for cross-chain relayed transactions.
Always call `address_system::ensure_origin(ctx)` — not `ctx.sender()` directly —
when deriving the key for user data. See `security-patterns.md`.

### `deploy_hook` (scripts)

For the dubhe framework: runs once on first deploy to initialize `FrameworkFeeConfig` in `DappHub`.
For external DApps: receives `&mut DappStorage` to set initial resource values.
`genesis::run` calls it before sharing `DappStorage`.

### `migrate` (scripts)

Defines `ON_CHAIN_VERSION: u32`. DApp system functions call
`ensure_latest_version<DappKey>(ds, ON_CHAIN_VERSION)` to reject calls from stale clients
after an upgrade.

## Codegen Rule

Everything under `sources/codegen/` is produced by `generate` from `dubhe.config.ts`.
**Do not edit these files by hand.** Change the config and regenerate. See `codegen-pipeline.md`.
