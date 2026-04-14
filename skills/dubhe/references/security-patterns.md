# Security Patterns

## CVE-D-02 — UserStorage Ownership

### The Rule

In v2, user data is stored in `UserStorage`, a **shared object** (one per user per DApp). The
user passes their own `UserStorage` as an argument to system functions. The framework verifies
that the caller is the `canonical_owner` (or an active session key) — never by accepting a
raw address parameter.

```move
// CORRECT — UserStorage is passed by the caller, framework verifies canonical_owner
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

`UserStorage` is a shared Sui object but its `canonical_owner` field controls write
authorization. When a session key is active, `address_system::ensure_origin(ctx)` resolves
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

Every write to `UserStorage` increments `write_count`.
Fees are charged lazily via `settle_writes`:

```
unsettled   = write_count - settled_count
fee_due     = unsettled × (base_fee + bytes_fee × bytes_written)
```

### Settlement

```move
// Anyone can trigger settlement; fee is deducted from DappStorage.credit_pool.
// Requires DappHub as first argument to assert the current framework version.
dapp_system::settle_writes<DappKey>(dapp_hub, dapp_storage, user_storage, ctx);
```

### Per-User Debt Limit

`MAX_UNSETTLED_WRITES = 1_000`. Once a user's unsettled count reaches the limit, further
writes abort with `user_debt_limit_exceeded_error`. The DApp must settle before the user
can write again.

### DApp Suspension

If `credit_pool` runs dry during settlement, the DApp is `suspended`. Suspended DApps
cannot accept new user writes. Any address can call `recharge_credit` to top up the pool;
the framework admin calls `unsuspend_dapp` to resume (subject to `min_credit_to_unsuspend`).

### Fee Update Delay

Framework fee increases have a mandatory **48-hour** delay
(`MIN_FEE_INCREASE_DELAY_MS = 48 * 60 * 60 * 1_000`) to prevent surprise fee hikes on
DApp operators. Decreases take effect immediately.

---

## Session Key Security

A session key grants a delegated wallet the ability to write on behalf of the
`canonical_owner` for a limited time. When a session key is active,
`address_system::ensure_origin(ctx)` returns the `canonical_owner`.

Security properties:

- **Mandatory expiry**: session keys have a `session_expires_at` timestamp. Expired
  session keys abort with `session_expired_error`. Duration must be between 1 minute
  and 7 days (`MIN_SESSION_DURATION_MS` / `MAX_SESSION_DURATION_MS`).
- **Canonical owner preserved**: `UserStorage.canonical_owner` is set at creation and
  is never changed by the session key.
- **Per-DApp scope**: a session key registered for one DApp cannot be reused for another.
- **Single active session**: activating a new session key replaces any existing one
  without requiring prior deactivation.
