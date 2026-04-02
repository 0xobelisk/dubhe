# dapp_system Public API

All functions live in `module dubhe::dapp_system`. DApp system modules import
`DappHub` from `dubhe::dapp_service` and pass it through.

## Security Rule (CVE-D-02)

For any function that writes **per-user data**, `resource_address` must come from
`address_system::ensure_origin(ctx)` — never from a caller-supplied argument.

```move
// CORRECT
let resource_address = address_system::ensure_origin(ctx);
dapp_system::set_record<DappKey>(dh, dapp_key, key, value, resource_address, false, ctx);
```

---

## Storage

### `set_record`

```move
public fun set_record<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
    key: vector<vector<u8>>,
    value: vector<vector<u8>>,
    resource_address: String,
    offchain: bool,
    ctx: &mut TxContext
)
```

Write a full record (all fields at once). Charges fees based on total byte size.
`offchain: true` emits an event without writing to chain storage.
`key` and `value` are BCS-encoded tuples; use the generated resource module's `set`
function which handles encoding automatically.

### `set_field`

```move
public fun set_field<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
    resource_address: String,
    key: vector<vector<u8>>,
    field_index: u8,
    value: vector<u8>,
    ctx: &mut TxContext
)
```

Update a single field within an existing record. More gas-efficient than `set_record`
when only one field changes. `field_index` is 0-based.

### `delete_record`

```move
public fun delete_record<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
    key: vector<vector<u8>>,
    resource_address: String,
)
```

Remove a record entirely. No fee is charged for deletes.

### `get_record`

```move
public fun get_record<DappKey: copy + drop>(
    dh: &DappHub,
    resource_address: String,
    key: vector<vector<u8>>
): vector<u8>
```

Read a full record as raw BCS bytes. Use the generated resource module's `get` or
field-specific getters (`get_<field>`) instead.

### `get_field`

```move
public fun get_field<DappKey: copy + drop>(
    dh: &DappHub,
    resource_address: String,
    key: vector<vector<u8>>,
    field_index: u8
): vector<u8>
```

Read a single field as raw BCS bytes. The generated field getters call this internally.

### `has_record`

```move
public fun has_record<DappKey: copy + drop>(
    dh: &DappHub,
    resource_address: String,
    key: vector<vector<u8>>
): bool
```

Check existence without reading data.

### `ensure_has_record` / `ensure_has_not_record`

```move
public fun ensure_has_record<DappKey: copy + drop>(dh: &DappHub, resource_address: String, key: vector<vector<u8>>)
public fun ensure_has_not_record<DappKey: copy + drop>(dh: &DappHub, resource_address: String, key: vector<vector<u8>>)
```

Assert helpers — abort if the record does not exist / already exists.

---

## DApp Lifecycle

### `create_dapp`

```move
public fun create_dapp<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
    name: String,
    description: String,
    clock: &Clock,
    ctx: &mut TxContext
)
```

Register this DApp in the framework registry. Idempotent — safe to call again;
aborts with `dapp_already_initialized_error` if already registered.
Called automatically by the generated `genesis.move` on first deployment.

---

## Guards

Call these at the **top** of every system entry function.

### `ensure_latest_version`

```move
public fun ensure_latest_version<DappKey: copy + drop>(dh: &DappHub, version: u32)
```

Aborts with `not_latest_version_error` if the on-chain version does not match.
Use with `migrate::on_chain_version()`:

```move
dapp_system::ensure_latest_version<DappKey>(dh, migrate::on_chain_version());
```

### `ensure_dapp_admin`

```move
public fun ensure_dapp_admin<DappKey: copy + drop>(dh: &DappHub, admin: address)
```

Aborts with `no_permission_error` if `admin` is not the registered DApp admin.

```move
dapp_system::ensure_dapp_admin<DappKey>(dh, ctx.sender());
```

### `ensure_not_pausable`

```move
public fun ensure_not_pausable<DappKey: copy + drop>(dh: &DappHub)
```

Aborts with `dapp_already_paused_error` if the DApp is currently paused.

---

## Ownership (Ownable2Step)

### `propose_ownership`

```move
public fun propose_ownership(
    dh: &mut DappHub,
    dapp_key: String,
    new_admin: address,
    ctx: &mut TxContext
)
```

Step 1: nominate `new_admin` as the pending next admin. Only the current admin can call.
Pass `@0x0` to cancel a pending transfer.

### `accept_ownership`

```move
public fun accept_ownership(
    dh: &mut DappHub,
    dapp_key: String,
    ctx: &mut TxContext
)
```

Step 2: the nominated address confirms and becomes admin. Clears `pending_admin`.

---

## Fee & Credit Management

### `recharge_credit`

```move
public fun recharge_credit<DappKey: copy + drop>(
    dh: &mut DappHub,
    _dapp_key: DappKey,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

Top up a DApp's storage credit. Anyone can call (admin, sponsor, community).
1 MIST = 1 credit unit. Payment is transferred to the framework fee recipient.

### `set_dapp_free_credit` (framework admin only)

```move
public fun set_dapp_free_credit(
    dh: &mut DappHub,
    target_dapp_key: String,
    amount: u256,
    ctx: &mut TxContext
)
```

Grant or revoke promotional free credits for a DApp. Only the Dubhe framework admin
(genesis deployer) can call this. Set `amount = 0` to revoke all free credits.

---

## Metadata

### `set_metadata`

```move
public fun set_metadata(
    dh: &mut DappHub,
    dapp_key: String,
    name: String,
    description: String,
    website_url: String,
    cover_url: vector<String>,
    partners: vector<String>,
    ctx: &mut TxContext
)
```

Update the DApp's public-facing metadata. Only the DApp admin can call.

### `set_pausable`

```move
public fun set_pausable(dh: &mut DappHub, dapp_key: String, pausable: bool, ctx: &mut TxContext)
```

Enable or disable the pause flag. When `pausable = true`, calls to `ensure_not_pausable`
will abort. Only the DApp admin can call.

---

## Utility

### `dapp_key`

```move
public fun dapp_key<DappKey: copy + drop>(): String
```

Return the canonical string key for a `DappKey` type. Useful when calling functions
that accept `dapp_key: String` instead of the generic `DappKey`.
