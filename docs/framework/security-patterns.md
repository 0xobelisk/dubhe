# Security Patterns

## CVE-D-02 — UserStorage Ownership

### The Rule

In v2, user data is stored in `UserStorage`, a **user-owned** object. The user passes their own
`UserStorage` as an argument to system functions. The framework verifies that the caller owns it
by checking `canonical_owner` (or proxy expiry) — never by accepting an address parameter.

```move
// CORRECT — UserStorage is caller-owned, framework verifies ownership
public entry fun inc(user_storage: &mut UserStorage, ctx: &mut TxContext) {
    let val = value::get(user_storage);
    value::set(user_storage, val + 1, ctx);
}

// WRONG (v1 pattern) — accepting resource_address from caller allows data spoofing
public fun set_player_data_unsafe(
    dh: &mut DappHub,
    resource_address: String,  // ← never accept this from the caller
    value: u64,
    ctx: &mut TxContext
) { ... }
```

### Why

`UserStorage` is a Sui owned object — only the legitimate owner (or an authorized proxy) can
pass it to a transaction. When a proxy is active, `address_system::ensure_origin(ctx)` resolves
to the `canonical_owner`, preventing cross-user namespace attacks.

---

## Ownable2Step — Two-Step Ownership Transfer

DApp admin ownership uses the Ownable2Step pattern to prevent accidental transfers to
wrong addresses.

### Fields

`dapp_metadata` stores two admin-related fields:

- `admin: address` — the current admin
- `pending_admin: address` — the nominated next admin (`@0x0` = no pending transfer)

### Flow

```
Step 1 (current admin calls):
  dapp_system::propose_ownership(dapp_storage, new_admin_address, ctx)
  → sets pending_admin = new_admin_address

Step 2 (new admin calls, to confirm):
  dapp_system::accept_ownership(dapp_storage, ctx)
  → sets admin = pending_admin
  → clears pending_admin = @0x0
```

### Cancellation

The current admin can cancel a pending transfer by calling `propose_ownership` again
with `@0x0` as `new_admin`:

```move
dapp_system::propose_ownership(dapp_storage, @0x0, ctx);
```

### Guards

Any function restricted to the DApp admin should call:

```move
dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
```

---

## Lazy Settlement Fee Model

Every `set_record` / `set_field` call on `UserStorage` increments `write_count`.
Fees are charged lazily via `settle_writes`:

```
unsettled   = write_count - settled_count
fee_due     = unsettled * fee_per_write
```

### Settlement

```move
// Anyone can trigger settlement; fee is deducted from DappStorage.credit_pool
dapp_system::settle_writes(dapp_storage, user_storage, ctx);
```

### Per-User Debt Limit

`MAX_UNSETTLED_WRITES = 200`. Once a user's unsettled count reaches the limit, further
writes abort with `EUserDebtLimitExceeded`. The DApp must settle before the user can
write again.

### DApp Suspension

If `credit_pool` runs dry during settlement, the DApp is `suspended`. Suspended DApps
cannot accept new user writes. The admin must call `add_credit` to top up the pool,
then `unsuspend_dapp` to resume.

### Fee Update Delay

Framework fee increases have a mandatory 7-day delay (`fee_increase_delay_not_met_error`)
to prevent surprise fee hikes on DApp operators.

---

## Proxy / Session Key Security

A proxy grants a delegated wallet the ability to write on behalf of the `canonical_owner`.
When a proxy is active, `address_system::ensure_origin(ctx)` returns the canonical_owner.

Security properties:

- **Mandatory expiry**: proxies have a `proxy_expires_at` timestamp.
  Expired proxies abort with `EProxyExpired`.
- **Canonical owner preserved**: `UserStorage.canonical_owner` is set at creation and
  never changed by the proxy — only the admin can change it via `transfer_canonical_ownership`.
- **Per-DApp scope**: a proxy registered for one DApp cannot be reused for another.
