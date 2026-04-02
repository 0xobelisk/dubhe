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
│  ├── errors.move                                     │
│  ├── genesis.move                                    │
│  ├── dapp_key.move                                   │
│  ├── init_test.move                                  │
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

### `UserStorage` — Per-User Owned Object

Each user owns one `UserStorage` per DApp. It holds user-scoped resources (hot-path writes).
Writes are tracked with `write_count` / `settled_count` for the Lazy Settlement fee model.
The user has full custody — the DApp cannot forcibly modify it.

## Lazy Settlement Fee Model

DApps pay fees for user writes lazily:

1. Each write to `UserStorage` increments `write_count`.
2. Periodically, `settle_writes` charges `fee_per_write × unsettled_count` from `credit_pool`.
3. If `credit_pool` runs dry, the DApp is `suspended` until it is recharged.
4. A per-user debt limit (`MAX_UNSETTLED_WRITES = 200`) prevents runaway debt.

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
- Credit management (`add_credit`)
- Proxy management (canonical owner transfers with expiry)

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

Everything under `sources/codegen/` is produced by `schemagen` from `dubhe.config.ts`.
**Do not edit these files by hand.** Change the config and regenerate. See `codegen-pipeline.md`.
