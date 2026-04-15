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

---

## Entry Function Guards

Dubhe provides three guards that must be called manually at the top of system entry
functions. Because Sui packages are immutable once published, a function that ships
without these guards can **never** be retroactively protected.

### The Three Guards

#### `ensure_latest_version` — Version Gate

```move
dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
```

**What it checks**: `DappStorage.version == ON_CHAIN_VERSION` (the constant compiled
into the calling package).

**What it prevents**: Calls from any package whose `ON_CHAIN_VERSION` does not match
the current on-chain version. This covers both stale clients (too old) and ahead-of-chain
clients (migration not yet committed).

**Why it works**: After `dubhe upgrade --bump-version` or a schema migration, the
on-chain version advances. Old packages compiled against the previous version carry a
lower `ON_CHAIN_VERSION` constant — the check always fires for them.

**Why it must be at the entry function level**: Resource accessor functions
(`value::set`, `player::delete`, …) are `public(package)` — each package version
calls only its own accessor bytecode. Adding the guard inside the accessor of the new
package has no effect on old-package call chains. The only universal intercept point is
the `public entry fun` that PTBs invoke directly.

---

#### `ensure_not_paused` — Emergency Circuit Breaker

```move
dapp_system::ensure_not_paused<DappKey>(dapp_storage);
```

**What it checks**: `DappStorage.is_paused == false`.

**What it prevents**: All user-facing writes when the DApp operator has engaged the
emergency pause via `dapp_system::set_paused`.

**Typical use**: Add to every user-facing entry function. Omit from admin-only
functions (so the operator can still act while the DApp is paused).

**Key property**: Works regardless of version. If a buggy function has
`ensure_not_paused` but not `ensure_latest_version`, the operator can still halt
activity by pausing — even though old-package callers can bypass the version check.

---

#### `ensure_dapp_admin` — Permission Gate

```move
dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
```

**What it checks**: `ctx.sender() == DappStorage.admin`.

**What it prevents**: Unauthorised callers from executing privileged operations
(pause/unpause, config changes, emergency withdrawals).

**Typical use**: Add exclusively to admin-only entry functions. Do not add to
user-facing functions (it would lock out regular users).

---

### Combined Effect and Recommended Patterns

#### Standard user-facing function

```move
public entry fun attack(
    dapp_storage: &mut DappStorage,
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    dapp_system::ensure_not_paused<DappKey>(dapp_storage);
    // business logic
}
```

Both guards together provide two independent shutdown mechanisms:

- `ensure_latest_version` permanently blocks calls from every outdated package ID the
  moment `migrate_to_vN` is committed on-chain.
- `ensure_not_paused` gives the operator a real-time kill switch without requiring an
  upgrade.

#### Admin-only function

```move
public entry fun set_game_config(
    dapp_storage: &mut DappStorage,
    new_value: u64,
    ctx: &mut TxContext
) {
    dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
    // update config
}
```

No version or pause check — the admin must always be able to act, including during
an active pause or while a migration is in progress.

#### View / read-only function

```move
public fun get_leaderboard(dapp_storage: &DappStorage): vector<address> {
    // No guards needed — reading state cannot cause harm.
    leaderboard::get(dapp_storage)
}
```

Read-only functions do not modify state; guards are unnecessary overhead.

---

### Guard Coverage Decision Matrix

| Function type               | `ensure_latest_version` | `ensure_not_paused` | `ensure_dapp_admin` |
| --------------------------- | ----------------------- | ------------------- | ------------------- |
| Regular user write          | ✅                      | ✅                  | ❌                  |
| User read                   | ❌                      | ❌                  | ❌                  |
| Admin config / emergency    | ❌                      | ❌                  | ✅                  |
| User register (one-time)    | ✅                      | ✅                  | ❌                  |
| Settlement (public utility) | ❌                      | ❌                  | ❌                  |

---

### Operator Lifecycle: Upgrade + Pause Interaction

```
Normal operation
  → user calls attack()
  → ensure_latest_version ✅  ensure_not_paused ✅  → executes

Security incident discovered
  → admin calls set_paused(..., true)
  → ensure_not_paused now blocks ALL user writes immediately

Patch prepared, new package built
  → dubhe upgrade --bump-version
  → on-chain version advances to N+1
  → ensure_latest_version now blocks old-package callers permanently

Admin calls set_paused(..., false)
  → only new-package callers can proceed
  → old-package callers hit ensure_latest_version and abort
```

The pause+upgrade sequence is the recommended emergency response: pause first to stop
ongoing damage, upgrade to fix the code, then unpause. After the version advances,
even if unpause is delayed or forgotten, old-package callers are still blocked by the
version gate.

---

### Known Gap — Guards Are Not Auto-Injected

Dubhe codegen does **not** generate system function bodies; systems are written entirely
by hand. All guards are therefore **opt-in**.

To surface omissions before deployment, `dubhe publish`, `dubhe build`, `dubhe test`,
and `dubhe upgrade` automatically scan every `public entry fun` in `sources/systems/`
for `ensure_latest_version`. If any are missing:

- **`build` / `test`**: warning printed, execution continues.
- **`publish` / `upgrade`**: interactive confirmation prompt — the command blocks until
  the developer explicitly types `y`.

If a function ships without the guards, there is **no retroactive fix**. The only
fallback is `ensure_not_paused` (if present) combined with an admin pause to halt
activity, followed by a new upgrade.
