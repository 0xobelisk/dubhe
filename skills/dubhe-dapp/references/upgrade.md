# DApp Upgrade Guide

This document covers the complete upgrade lifecycle for a Dubhe DApp, including
compatible upgrades, schema migrations, the version guard pattern, and boundary
conditions you should be aware of before deploying to production.

---

## Two Separate Version Mechanisms

Dubhe uses two independent versioning systems that operate at different levels:

| Mechanism             | Constant                                       | Storage                                  | Purpose                                                                             |
| --------------------- | ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **DApp version**      | `ON_CHAIN_VERSION: u32` in `migrate.move`      | `dapp_metadata.version` in `DappStorage` | Gates per-DApp function calls; guards clients against stale packages                |
| **Framework version** | `FRAMEWORK_VERSION: u64` in `dapp_system.move` | `DappHub.version`                        | Gates framework lifecycle calls; blocks old framework packages after `migrate::run` |

As a DApp developer you only manage the DApp version (`ON_CHAIN_VERSION`). The
framework version is managed by the Dubhe team and bumped when a breaking
framework upgrade is shipped.

---

## Upgrade Types

### Compatible Upgrade (no schema change, no version bump)

A pure bug-fix or optimisation that does not add/remove resources and does not
bump `ON_CHAIN_VERSION`.

```sh
dubhe upgrade --network testnet
```

`upgradeHandler` detects no pending migration and skips the migration transaction.
Existing `UserStorage` data is untouched. Old clients remain compatible.

> **Note**: If the bug has security implications, use `--bump-version` instead so
> old-package callers are forced off (see below).

### Breaking Upgrade — logic change, no new resources (`--bump-version`)

When you fix a logic bug or make a rule change that **must** prevent old clients
from calling your contract, pass the `--bump-version` flag:

```sh
dubhe upgrade --network testnet --bump-version
```

`upgradeHandler` will:

1. Call `appendMigrateFunction` to generate `migrate_to_vN` and increment
   `ON_CHAIN_VERSION` in `sources/scripts/migrate.move`.
2. After the package upgrade, execute `migrate_to_vN` on-chain.
3. `migrate_to_vN` calls `dapp_system::upgrade_dapp`, which registers the new
   package ID and advances `DappStorage.version` to `N`.

From that point, old clients compiled against version `N-1` hit
`ensure_latest_version` and abort.

**Typical scenarios for `--bump-version`**:

- Security vulnerability fix (attacker exploits old package logic).
- Game rule change that makes old client behaviour incorrect or exploitable.
- Tokenomics adjustment that invalidates old client calculations.

### Schema Migration (new resources added)

When you add a new resource to `dubhe.config.ts`:

1. Add the resource definition to the config.
2. Run `generate` to generate the new resource files.
3. Run `dubhe upgrade`.

`upgradeHandler` automatically:

- Detects the new resource as a `pendingMigration`.
- Appends `migrate_to_vN` to `sources/scripts/migrate.move`.
- Calls `migrate_to_vN` on-chain after the upgrade.
- `migrate_to_vN` calls `genesis::migrate`, which registers the new resource
  table in `DappStorage` and bumps `dapp_metadata.version`.

Existing `UserStorage` records in **old** tables are not affected.

---

## Version Guard Pattern

Add `ensure_latest_version` at the start of every public entry point to block
calls from clients running against an outdated package:

```move
module my_game::player_system;

use dubhe::dapp_system;
use my_game::dapp_key::DappKey;
use my_game::migrate;

public fun create_player(
    dapp_storage: &DappStorage,
    ctx: &mut TxContext,
) {
    // Reject stale clients — aborts if dapp_metadata.version != ON_CHAIN_VERSION.
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    // ...
}
```

`ensure_latest_version` checks **both directions**: it aborts if the caller's
compiled version is lower (stale) OR higher (from a future package that has not
yet been deployed on-chain). This prevents partial-upgrade inconsistencies.

### What happens when the guard fires

A client built against version N calls a function that expects version M:

- **N < M** (stale client): `not_latest_version_error` is returned. The
  transaction aborts. No state is modified.
- **N > M** (client ahead of on-chain): same abort. This can happen if the on-chain
  migration transaction (`migrate_to_vN`) has not yet been confirmed.

---

## Step-by-Step Upgrade Procedure

### 1. Update `dubhe.config.ts` (if adding resources)

Add or modify resource definitions. New resources trigger `pendingMigration`
detection in `upgradeHandler`.

### 2. Run generate (if config changed)

```sh
dubhe generate
```

Regenerates `sources/codegen/` with the new resource files and updates
`genesis::migrate` with the new table registration call.

### 3. Bump version for breaking upgrades

For **breaking logic changes** (no new resources), pass `--bump-version` to the
upgrade command. The toolchain will generate `migrate_to_vN` and update
`ON_CHAIN_VERSION` automatically:

```sh
dubhe upgrade --network testnet --bump-version
```

For **schema migrations** (new resources added), `ON_CHAIN_VERSION` is updated
automatically when `upgradeHandler` detects pending resources — no flag needed.

### 4. Run the upgrade

```sh
dubhe upgrade --network testnet
```

This performs in order:

1. `sui move build` with `--dump-bytecode-as-base64`
2. `package::authorize_upgrade` + `upgrade` + `package::commit_upgrade` in one PTB
3. (If migration needed) calls `migrate_to_vN(dapp_hub, dapp_storage)` — the
   generated function internally retrieves the new package ID and version, then
   calls `dapp_system::upgrade_dapp` and `genesis::migrate`

### 5. Verify the upgrade

```sh
# Check Published.toml for the new version
cat src/<name>/Published.toml

# Check latest.json for resource list
cat src/<name>/.history/sui_testnet/latest.json
```

---

## Deployment Artifacts

| File                                 | Contents                                                                   | Updated by                                                             |
| ------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Published.toml`                     | `version`, `publishedAt`, `originalId`, `chainId`                          | `publishHandler` / `upgradeHandler`                                    |
| `.history/sui_<network>/latest.json` | `version`, `packageId`, `dappHubId`, `dappStorageId`, `resources`, `enums` | `saveContractData`                                                     |
| `Move.lock`                          | `[env.<network>]` with published IDs                                       | Sui CLI during build/publish                                           |
| `sources/scripts/migrate.move`       | `ON_CHAIN_VERSION`, `migrate_to_vN` functions                              | `appendMigrateFunction` (auto on schema migration or `--bump-version`) |

---

## Boundary Conditions and Security

### `upgrade_dapp` constraints

| Scenario                            | Behaviour                                                        |
| ----------------------------------- | ---------------------------------------------------------------- |
| Non-admin caller                    | `no_permission_error` abort                                      |
| Duplicate package ID                | `package_already_registered_error` abort                         |
| New version ≤ current version       | `not_latest_version_error` abort (must strictly increase)        |
| Large version jump (e.g. v1 → v100) | Allowed — any strictly increasing value is accepted              |
| Upgrade while DApp is paused        | **Allowed** — admin can always upgrade regardless of pause state |
| After ownership transfer            | New admin can upgrade; old admin's calls abort                   |

### `ensure_latest_version` constraints

| Caller's compiled version  | On-chain version | Result                           |
| -------------------------- | ---------------- | -------------------------------- |
| Equal                      | Equal            | Pass                             |
| Lower (stale client)       | Higher           | `not_latest_version_error` abort |
| Higher (ahead of on-chain) | Lower            | `not_latest_version_error` abort |

### Pre-upgrade lint check

Before executing any on-chain transaction, `dubhe publish` and `dubhe upgrade`
scan every `public entry fun` in `sources/systems/` that accepts `DappStorage` and
check for the presence of `ensure_latest_version`. If guards are missing:

- An interactive confirmation prompt is shown.
- Type `y` to proceed despite the gap; any other input cancels the command.

`dubhe build` and `dubhe test` emit a non-blocking warning instead.

The check only covers `ensure_latest_version`. If a function has neither guard, the
operator's only real-time safeguard is `ensure_not_paused` combined with an
emergency `set_paused` call.

### Migration atomicity

`migrate_to_vN` is called in a separate transaction after the package upgrade
transaction. There is a brief window (typically a few seconds) between the two
transactions during which:

- The new package ID is on-chain but `dapp_metadata.version` has not yet advanced.
- Any client calling `ensure_latest_version` with `N` will still pass (old version).
- `upgradeHandler` inserts a 5-second delay before the migration transaction.

If `migrate_to_vN` fails, the package upgrade remains on-chain but the metadata
is not updated. Re-run `dubhe upgrade` or call `migrate_to_vN` manually.

### DappStorage data preservation

Schema migrations register new resource tables in `DappStorage` but never touch
existing tables. All `UserStorage` records written before the migration remain
intact and readable via the **same** accessor functions after the upgrade.

### `ensure_latest_version` does NOT protect global (DappStorage) reads

`get_global_field` and `has_global_record` do not call `ensure_latest_version`.
Version-gating is the caller's responsibility for read paths.

---

## Multiple Sequential Upgrades

You can upgrade a DApp multiple times. Each upgrade:

1. Increments the version by exactly 1 (`oldVersion + 1`).
2. Appends a new `migrate_to_vN` to `migrate.move` (if migration needed).
3. Records the new package ID in `dapp_metadata.package_ids` (append-only).
4. Updates `dapp_metadata.version` to the new version number.

The `originalId` field in `Published.toml` and `latest.json` always refers to
the **first** published package ID and never changes across upgrades.

---

## Ownership Transfer During Upgrade

`propose_ownership` and `accept_ownership` implement a two-step admin transfer.
You can safely interleave ownership transfers and upgrades:

- Upgrading while a transfer is pending is allowed.
- After `accept_ownership`, only the **new admin** can call `upgrade_dapp`.
- The old admin's pending nomination is cleared when `accept_ownership` runs.

---

## Rollback

Sui does not support on-chain package rollback. Once a package is upgraded:

- The old package ID remains on-chain permanently (immutable).
- The `UpgradeCap` now points to the new version.
- Clients can still call the **old** package modules, but they will fail
  `ensure_latest_version` if the on-chain version has advanced.

To effectively "roll back", publish a new upgrade that reverts the code changes.
`ON_CHAIN_VERSION` must still increment (it cannot decrease).
