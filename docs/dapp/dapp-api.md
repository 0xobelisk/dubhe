# dapp_system Public API

All functions live in `module dubhe::dapp_system`. The framework exposes three
shared storage objects that every DApp interacts with:

| Object        | Type          | Ownership        | Purpose                                           |
| ------------- | ------------- | ---------------- | ------------------------------------------------- |
| `DappHub`     | `DappHub`     | Framework-shared | Global registry: fee config, framework admin      |
| `DappStorage` | `DappStorage` | Per-DApp shared  | DApp metadata, credit pool, version state         |
| `UserStorage` | `UserStorage` | Per-user shared  | Per-user game/app data, session key, write counts |

DApp developers work with these objects at two levels:

1. **Generated resource modules** (`sources/codegen/resources/`) — always use these
   for reading and writing your DApp's own data. They handle encoding automatically.
2. **`dapp_system` functions** — call these directly for guards, session management,
   credit recharging, and DApp admin operations.

---

## Generated Resource Module API

`dubhe generate` produces one Move module per resource in `sources/codegen/resources/`.
Each module exposes the following functions. For user resources (non-global) the
storage parameter is `user_storage: &UserStorage` or `&mut UserStorage`; for global
resources it is `dapp_storage: &DappStorage` or `&mut DappStorage`.

### `set(storage, ..., ctx)`

Write all fields at once. `set` is `public(package)` — only modules within your
DApp's package can call it.

```move
// User resource (fields: hp, level)
player::set(user_storage, hp, level, ctx);

// Global resource (fields: max_level, base_hp)
game_config::set(dapp_storage, max_level, base_hp, ctx);
```

### `set_<field>(storage, key..., value, ctx)` (multi-field resources only)

Update a single field without rewriting the entire record. More gas-efficient
when only one field changes.

```move
player::set_level(user_storage, new_level, ctx);
game_config::set_max_level(dapp_storage, new_max, ctx);
```

### `get(storage, key...)` / `get_<field>(storage, key...)`

Read the full record as a tuple, or read a single field.

```move
let (hp, level) = player::get(user_storage);
let level       = player::get_level(user_storage);
let max_level   = game_config::get_max_level(dapp_storage);
```

### `get_struct(storage, key...)` / `set_struct(storage, key..., struct, ctx)`

Read or write using the generated `<ResourceName>` struct. Useful when passing
data between functions.

```move
let p = player::get_struct(user_storage);
p.update_level(p.level() + 1);
player::set_struct(user_storage, p, ctx);
```

### `has(storage, key...)` / `ensure_has(storage)` / `ensure_has_not(storage)`

Check record existence. `ensure_has` / `ensure_has_not` abort with an error if
the condition is not met.

```move
let exists = player::has(user_storage);
player::ensure_has(user_storage);       // aborts if player does not exist
player::ensure_has_not(user_storage);   // aborts if player already exists
```

### `delete(storage, key..., ctx)`

Delete a record and all its fields. `delete` is `public(package)`.

```move
player::delete(user_storage, ctx);
```

---

## Guards

Call these at the **top** of every public system entry function.

### `ensure_latest_version`

```move
public fun ensure_latest_version<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    version:      u32,
)
```

Aborts with `not_latest_version_error` if `dapp_storage.version != version`.
Use with `migrate::on_chain_version()` so stale clients fail fast:

```move
dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
```

### `ensure_dapp_admin`

```move
public fun ensure_dapp_admin<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    admin:        address,
)
```

Aborts with `no_permission_error` if `admin` is not the registered DApp admin.

```move
dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
```

### `ensure_not_paused`

```move
public fun ensure_not_paused<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
)
```

Aborts with `dapp_paused_error` if the DApp is paused. Add to all non-admin
entry functions to halt user activity when the DApp is paused.

---

## UserStorage Lifecycle

### `create_user_storage`

```move
public fun create_user_storage<DappKey: copy + drop>(
    dapp_hub:     &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
)
```

Create a `UserStorage` shared object for the transaction sender. Each address
may only create one `UserStorage` per DApp; a second call aborts with
`user_storage_already_exists_error`.

Typically called once from a "register" system entry function:

```move
public entry fun register(
    dapp_hub:     &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    dapp_system::create_user_storage<DappKey>(dapp_hub, dapp_storage, ctx);
}
```

### `settle_writes`

```move
public fun settle_writes<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
)
```

Settle accumulated write debt for a user. Reads the effective fee from
`DappStorage` and deducts from the DApp's credit pool. This function never
aborts due to insufficient credit — it silently emits a `SettlementSkipped`
event when no credit is available.

Call this at the start of any PTB that includes user writes to keep write counts
under `MAX_UNSETTLED_WRITES` (1000). Once that limit is reached, further writes
abort with `user_debt_limit_exceeded_error`.

```move
// Settle writes before game action
dapp_system::settle_writes<DappKey>(dapp_hub, dapp_storage, user_storage, ctx);
```

---

## Session Key Management

Session keys let frontend apps sign game transactions with an ephemeral keypair
so the main wallet is not required for every action.

### `activate_session`

```move
public fun activate_session<DappKey: copy + drop>(
    user_storage:   &mut UserStorage,
    session_wallet: address,
    duration_ms:    u64,
    clock:          &Clock,
    ctx:            &mut TxContext,
)
```

Authorise `session_wallet` to write to `user_storage` on behalf of the canonical
owner. Only the canonical owner may call this. `duration_ms` must be between
1 minute and 7 days. Replaces any existing session without requiring a prior
deactivation.

```move
// Grant a 1-hour session key
dapp_system::activate_session<DappKey>(
    user_storage,
    session_wallet_address,
    3_600_000,
    clock,
    ctx,
);
```

### `deactivate_session`

```move
public fun deactivate_session<DappKey: copy + drop>(
    user_storage: &mut UserStorage,
    ctx:          &mut TxContext,
)
```

Revoke the active session. Allowed callers: the canonical owner (at any time),
the session key itself, or anyone after the session has expired.

---

## Credit Management

Storage writes consume credits from the DApp's credit pool. Monitor the pool
and top up before it is exhausted.

### `recharge_credit`

```move
public fun recharge_credit<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    payment:      Coin<SUI>,
    ctx:          &mut TxContext,
)
```

Add credit to the DApp's pool. Any address may call this — no admin restriction.
1 MIST = 1 credit unit. Payment is forwarded to the framework treasury.

```move
// Top up with 1 SUI
await dubhe.tx.dapp_system.recharge_credit({ payment: coin_id });
```

---

## DApp Admin Functions

The DApp admin is the address that deployed the package (set at genesis). Admins
can update metadata, pause/unpause, and transfer ownership.

### `set_metadata`

```move
public fun set_metadata<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    name:         String,
    description:  String,
    website_url:  String,
    cover_url:    vector<String>,
    partners:     vector<String>,
    ctx:          &mut TxContext,
)
```

Update the DApp's public display metadata. Only the DApp admin can call.

### `set_paused`

```move
public fun set_paused<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    paused:       bool,
    ctx:          &mut TxContext,
)
```

Pause or resume the DApp. When `paused = true`, calls to `ensure_not_paused`
abort. Only the DApp admin can call.

### `set_dapp_config`

```move
public fun set_dapp_config<DappKey: copy + drop>(
    _auth:                   DappKey,
    dapp_storage:            &mut DappStorage,
    min_credit_to_unsuspend: u256,
    ctx:                     &mut TxContext,
)
```

Configure the minimum credit required for the framework to unsuspend this DApp
after a credit-exhaustion suspension. `0` means any positive credit suffices.
Only the DApp admin can call.

### `upgrade_dapp`

```move
public fun upgrade_dapp<DappKey: copy + drop>(
    dapp_storage:   &mut DappStorage,
    new_package_id: address,
    new_version:    u32,
    ctx:            &mut TxContext,
)
```

Register a new package ID and increment the on-chain version after a package
upgrade. Called automatically by the generated `migrate.move` — you do not
normally call this directly. See [Deployment & Upgrade](./deployment.md).

---

## Ownership (Ownable2Step)

### `propose_ownership`

```move
public fun propose_ownership<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    new_admin:    address,
    ctx:          &mut TxContext,
)
```

Step 1: nominate `new_admin` as the pending admin. Only the current admin can
call. Pass `@0x0` to cancel a pending transfer.

### `accept_ownership`

```move
public fun accept_ownership<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
)
```

Step 2: the nominated address confirms and becomes admin. Clears `pending_admin`.

---

## Utility

### `dapp_key`

```move
public fun dapp_key<DappKey: copy + drop>(): String
```

Return the canonical string key for a `DappKey` type. Useful when calling
functions that accept `dapp_key: String` instead of the generic `DappKey`.
