# Framework Upgrade Guide (Admin)

This document is for the Dubhe framework admin — the address stored in
`DappHub.config.admin` — who is responsible for shipping framework upgrades,
calling `migrate::run`, and managing the framework-level governance objects.

---

## Framework Upgrade Architecture

```
framework/src/dubhe/
├── sources/
│   ├── systems/dapp_system.move      ← public API; contains FRAMEWORK_VERSION
│   ├── core/dapp_service.move        ← DappHub storage layer; holds version field
│   └── scripts/
│       ├── deploy_hook.move          ← runs once on first publish (init-time)
│       └── migrate.move              ← ON_CHAIN_VERSION + migrate::run entry point
└── sources/codegen/
    └── genesis.move                  ← AUTO-GENERATED; migrate() body regenerated
                                         by generate when resources change
```

### Version constants

| Constant            | Type  | File                     | Purpose                                                                                 |
| ------------------- | ----- | ------------------------ | --------------------------------------------------------------------------------------- |
| `FRAMEWORK_VERSION` | `u64` | `dapp_system.move`       | Compile-time constant embedded in every framework package binary                        |
| `DappHub.version`   | `u64` | `core/dapp_service.move` | On-chain state bumped by `migrate::run` → `genesis::migrate` → `bump_framework_version` |

After `migrate::run` executes, `DappHub.version` equals `FRAMEWORK_VERSION` of
the **new** package. Any old package binary that still has a lower
`FRAMEWORK_VERSION` constant will fail `assert_framework_version` and cannot
call version-gated lifecycle functions.

---

## Functions Gated by `assert_framework_version`

The following `dapp_system` functions check that the calling package's
`FRAMEWORK_VERSION` matches `DappHub.version` before executing:

| Function               | Effect if version mismatch       |
| ---------------------- | -------------------------------- |
| `create_dapp`          | `not_latest_version_error` abort |
| `create_user_storage`  | `not_latest_version_error` abort |
| `settle_writes`        | `not_latest_version_error` abort |
| `suspend_dapp`         | `not_latest_version_error` abort |
| `unsuspend_dapp`       | `not_latest_version_error` abort |
| `update_framework_fee` | `not_latest_version_error` abort |

Functions **not** gated (read-only or admin paths that must always be
accessible): `get_field`, `has_record`, `get_global_field`,
`ensure_latest_version`, `ensure_not_paused`, `propose_ownership`,
`accept_ownership`, `set_metadata`, `upgrade_dapp`, `recharge_credit`.

---

## Upgrade Types

### Compatible Framework Upgrade (no constant bump)

Add/fix code without changing `FRAMEWORK_VERSION`. After `dubhe upgrade`,
`upgradeHandler` calls `migrate::run` automatically (framework upgrades always
trigger migration). `bump_framework_version` is idempotent when the constant has
not changed, so `DappHub.version` stays the same. All DApps remain operational
without any client-side changes.

### Breaking Framework Upgrade (constant bump)

When a breaking protocol change requires all old framework packages to be
invalidated:

1. Increment `FRAMEWORK_VERSION` in `dapp_system.move`.
2. Update `ON_CHAIN_VERSION` in `migrate.move` if needed.
3. If new resource tables are added to `DappHub` or `DappStorage`, update
   `dubhe.config.ts` and run `generate` to regenerate `genesis.move`.
4. Run `dubhe upgrade`.

After `migrate::run`, `DappHub.version` advances. Old framework package binaries
(with lower `FRAMEWORK_VERSION`) can no longer call version-gated functions.
DApp packages compiled against the old framework version must be upgraded (via
`dubhe upgrade` in each DApp project) to use the new framework.

---

## Step-by-Step Framework Upgrade Procedure

### 1. (If breaking) Increment `FRAMEWORK_VERSION`

```move
// framework/src/dubhe/sources/systems/dapp_system.move
const FRAMEWORK_VERSION: u64 = 2;  // was 1
```

### 2. (If new resources) Update `dubhe.config.ts` and run generate

```sh
# From the framework/ directory
node node_modules/@0xobelisk/sui-cli/dist/dubhe.js generate
```

This regenerates `sources/codegen/genesis.move` with the new
`bump_framework_version` call and any new resource table registrations inside
`genesis::migrate`.

### 3. Run the upgrade

```sh
# From the project root (where Published.toml for dubhe exists)
dubhe upgrade --name dubhe --network testnet
```

`upgradeHandler` for `dubhe`:

1. Builds the new framework package.
2. Submits the `authorize_upgrade` + `upgrade` + `commit_upgrade` PTB.
3. Waits 5 seconds for localnet indexing.
4. Submits a second transaction: `migrate::run(dapp_hub, dapp_storage)`.
   - `genesis::migrate` is called, which calls `bump_framework_version`.
   - `DappHub.version` advances from N to `FRAMEWORK_VERSION`.

### 4. Verify on-chain state

```sh
# Check Published.toml
cat framework/src/dubhe/Published.toml

# Check deployment JSON
cat framework/src/dubhe/.history/sui_testnet/latest.json
```

Confirm `version` incremented and the new package ID is recorded.

---

## migrate::run Details

```move
// framework/src/dubhe/sources/scripts/migrate.move
public entry fun run(
    dapp_hub:     &mut DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    genesis::migrate(dapp_hub, dapp_storage, ctx);
}
```

`genesis::migrate` is **auto-generated** by `generate`. Its body (between the
separator comments) includes:

```move
// ==========================================
// REGION MANAGED BY `dubhe upgrade` — DO NOT EDIT MANUALLY
dapp_system::bump_framework_version(dapp_hub);
// any new resource table registrations inserted here
// ==========================================
```

`bump_framework_version` is monotonic: it only advances `DappHub.version` when
`FRAMEWORK_VERSION > current`. This means calling `migrate::run` multiple times
or calling it after a newer version has already bumped the hub is safe.

```move
// framework/src/dubhe/sources/systems/dapp_system.move
public(package) fun bump_framework_version(dh: &mut DappHub) {
    let current = dapp_service::framework_version(dh);
    if (FRAMEWORK_VERSION > current) {
        dapp_service::set_framework_version(dh, FRAMEWORK_VERSION);
    };
}
```

---

## Framework Admin Governance

### Two-step admin transfer

`propose_framework_admin` / `accept_framework_admin` implement Ownable2Step:

1. Current admin nominates a new admin address.
2. Nominee calls `accept_framework_admin` to complete the transfer.
3. Proposing `@0x0` cancels the pending nomination.

Only the current admin can call `propose_framework_admin`.
Only the nominated address can call `accept_framework_admin`.

### Framework admin vs treasury

| Role            | Address stored in             | Can call                                                                                                       |
| --------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Framework admin | `DappHub.config.admin`        | `suspend_dapp`, `unsuspend_dapp`, `update_framework_fee`, `update_framework_config`, `propose_framework_admin` |
| Treasury        | `DappHub.fee_config.treasury` | `propose_treasury` only (receives settlement payments)                                                         |

The treasury address **cannot** call `suspend_dapp`, `unsuspend_dapp`, or
`update_framework_fee`. This separation prevents a compromised treasury key
from affecting DApp availability.

### Fee updates

```move
// Decrease: takes effect immediately.
// Increase: subject to a time-delay defined in fee_config to protect DApps.
dapp_system::update_framework_fee(dapp_hub, new_fee_per_write, clock, ctx);
```

`update_framework_fee` is also version-gated. If the framework has been upgraded
and `migrate::run` has bumped the hub version, the admin must use the new
package to call this function.

---

## Security Boundaries

### What happens if `migrate::run` is NOT called after a breaking upgrade

The new package binary is on-chain with `FRAMEWORK_VERSION = 2`, but
`DappHub.version` is still `1`. Any call to a version-gated function from the
**new** package will abort with `not_latest_version_error`. The system is
effectively frozen until `migrate::run` is executed.

Old package binaries (`FRAMEWORK_VERSION = 1`) continue to work normally because
`DappHub.version` still equals their constant.

### Idempotency guarantee

`bump_framework_version` is safe to call multiple times. If `migrate::run` is
called twice (e.g., error recovery), the second call is a no-op.

### DApp impact during framework upgrade

Between the upgrade transaction and the `migrate::run` transaction:

- New framework package cannot call version-gated functions (version mismatch).
- Old framework package continues to work (version still matches hub).
- DApps using the old framework package are unaffected.

This window is short (typically seconds) and `upgradeHandler` inserts a 5-second
delay before the migration transaction to allow indexing.

### Epoch-delayed fee increases

When `update_framework_fee` increases the fee, it stores a `PendingFee` with
a future effective timestamp. `get_effective_fee_per_write` returns:

- The current fee until the pending fee's `effective_at` timestamp passes.
- The new fee after that timestamp.

This gives DApp operators time to recharge credits before higher fees apply.

---

## e2e Upgrade Testing

The framework upgrade test suite lives at:
`e2e/tests/integration/upgrade-workflow.test.ts`

Run integration tests (requires localnet):

```sh
cd e2e
pnpm test:integration
```

Key suites covering framework upgrade:

| Suite   | What it verifies                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------ |
| Suite 1 | Framework code-only upgrade; counter backward compat; counter upgrade against new framework      |
| Suite 3 | `migrate::run` on-chain effect; DappStorage accessible post-migration; DappHub object consistent |

Move unit tests covering version gating (run with `sui move test`):

| Test                                                           | Location        |
| -------------------------------------------------------------- | --------------- |
| `test_create_user_storage_aborts_after_framework_version_bump` | `fee_test.move` |
| `test_settle_writes_aborts_after_framework_version_bump`       | `fee_test.move` |
| `test_suspend_dapp_aborts_after_framework_version_bump`        | `fee_test.move` |
| `test_create_user_storage_succeeds_at_correct_version`         | `fee_test.move` |
| `test_bump_framework_version_updates_dapp_hub_version`         | `fee_test.move` |
