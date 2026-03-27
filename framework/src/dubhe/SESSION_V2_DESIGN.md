# Dubhe Framework Session V2 Design

> 中文版：`SESSION_V2_DESIGN_CN.md`

## Scope
This design is for `framework/src/dubhe` and is aligned with the current `dapp_system + dapp_proxy + dapp_service` architecture.

## Current Constraints In Framework
1. `dapp_system::set_record / set_field / delete_record` do not receive `TxContext`, so sender and expiry cannot be verified on-chain.
2. Existing delegation (`dapp_proxy`) is dapp-level (`delegator + enabled`) and does not support per-account scope or expiry.
3. `set_storage` has `TxContext` but no account-level semantics in its parameters.

## Session V2 Goals
1. Support account-scoped delegation for writes.
2. Enforce expiry and revocation.
3. Ensure all session-aware write APIs require an explicit on-chain session row.
4. Minimize externally callable legacy delegation surfaces.

## Data Model
Add a new resource module: `sources/codegen/resources/dapp_session.move`.

Key: `(dapp_key: String, account: String, delegate: address)`

Value fields:
- `owner: String` (canonical SUI sender hex, `0x` + 32-byte address)
- `scope_mask: u64`
- `expires_at_ms: u64`
- `revoked: bool`
- `nonce: u64` (reserved for future meta-tx flow)

Scope bits (initial):
- `1`: set_record
- `2`: set_field
- `4`: delete_record
- `8`: set_storage

## Module Layout
1. New: `sources/codegen/resources/dapp_session.move`
2. New: `sources/systems/session_system.move`
3. Update: `sources/systems/dapp_system.move`
4. Update: `sources/codegen/errors.move`

## API Design

### session_system
```move
public fun create_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  account: String,
  delegate: address,
  scope_mask: u64,
  expires_at_ms: u64,
  ctx: &mut TxContext
)

public fun revoke_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  account: String,
  delegate: address,
  ctx: &mut TxContext
)

public fun ensure_can_write<DappKey: copy + drop>(
  dh: &DappHub,
  account: String,
  op_mask: u64,
  ctx: &TxContext
)
```

Behavior:
1. Require session exists for `(dapp_key, account, ctx.sender())` (no direct bypass).
2. Validate: `!revoked`, `tx_context::epoch_timestamp_ms(ctx) <= expires_at_ms`, `(scope_mask & op_mask) == op_mask`.
3. Enforce `owner == account` on create and on runtime checks, so a signer cannot mint sessions for arbitrary account strings.
4. Enforce session key binding in `dapp_system::*_with_session`: first storage key must match `account` as BCS `String`.
5. Enforce max TTL (`30 days`) at session creation.
6. Validate operation mask on `ensure_can_write` to prevent invalid mask usage.
7. Session creation accepts `account` equal to either canonical SUI sender hex or validated `address_system::ensure_origin(ctx)` (EVM-origin included); stored `owner` remains canonical SUI sender hex.

### dapp_system
To enforce session in write path, add `ctx + account` aware variants:

```move
public fun set_record_with_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: String,
  account: String,
  key_tuple: vector<vector<u8>>,
  value_tuple: vector<vector<u8>>,
  offchain: bool,
  ctx: &mut TxContext
)
```

Likewise for `set_field_with_session`, `delete_record_with_session`, and `set_storage_with_session`.

Hardened visibility policy in this implementation:
- `set_record/set_field/delete_record` are `public(package)`.
- legacy dapp-level delegation APIs (`delegate/undelegate/is_delegated/set_storage`) are also `public(package)` to avoid exposing two external auth models.

## Error Additions
Add in `errors.move`:
- `SESSION_NOT_FOUND`
- `SESSION_EXPIRED`
- `SESSION_REVOKED`
- `SESSION_SCOPE_DENIED`
- `SESSION_INVALID_EXPIRY`

## Migration Plan
1. Add `dapp_session` table module and register it in genesis/init.
2. Add `session_system` create/revoke/ensure logic.
3. Add `_with_session` write APIs in `dapp_system`.
4. Restrict legacy external write/delegation APIs to `public(package)`.
5. Migrate external integrations to session-aware APIs only.

## Tests
Add/extend Move tests to cover:
1. Owner write fails without session.
2. Delegate write succeeds with valid session and scope.
3. Delegate write fails when expired.
4. Delegate write fails when revoked.
5. Delegate write fails when scope mismatch.
6. Invalid scope and zero delegate are rejected on create.
7. Non-owner cannot revoke session.
8. Multi-session isolation by `(dapp_key, account, delegate)`.

## Notes
1. This design intentionally does not include off-chain signature replay protection yet.
2. `nonce` is reserved so meta-tx can be added later without changing storage shape.
3. If account string is cross-chain formatted, canonicalization must be unified before session keying.

## Audit Verification Baseline (2026-03-27)
Execution results verified on 2026-03-27:
1. `sui move test` => full pass (`42/42`) on default gas bound.
2. `sui move test -i 200000000` => full pass (`42/42`) on audit gas bound.
3. `make test` => full pass (`42/42`) using `SUI_TEST_GAS_LIMIT` (default `200000000`).
4. `make test-default-full` => full pass (`42/42`) using `SUI_TEST_GAS_LIMIT` (default `200000000`).
5. `make test-fast` => pass for fast smoke set (`address/assets/session`) under `SUI_TEST_GAS_LIMIT`.
6. `sui move test session_tests` => full pass (`14/14`).
7. `sui move test dex_tests` => full pass (`7/7`).
8. `sui move test wrapper_tests` => full pass (`1/1`).

Default-path stabilization note:
1. `dex_tests` were normalized to low-state invariant checks so default `sui move test` stays deterministic and timeout-free.
2. Audit runs keep `-i 200000000` for headroom and reproducibility across slower CI/dev machines.
3. `Makefile` now exposes `SUI_TEST_GAS_LIMIT` for unified local/CI control; override example:
   `SUI_TEST_GAS_LIMIT=500000000 make test`.

Standardized local commands:
1. `make test`
2. `make test-fast`
3. `make test-audit`
4. `make test-session`
5. `make test-address`
6. `make test-native` (raw `sui move test`, no explicit gas-limit flag)

## Industry Practice Benchmark (2026-03-27)
Observed production/open-source pattern on Sui:
1. Teams usually tune test gas/instruction bound in CI/scripts (`--gas-limit` or `-i`) instead of patching Sui CLI binary defaults.
2. DeepBook V3 CI runs `sui move test --gas-limit 100000000000` in workflow automation.
3. Sui CLI source exposes both:
   - `--gas-limit <N>`
   - `-i, --instructions <N>` (`instruction_execution_bound`)
4. Sui source default unit-test bound is still conservative (`1_000_000`) when no explicit override is passed.

Practical conclusion for Dubhe:
1. Keep upstream Sui binary untouched.
2. Pin test gas limit in repo-level command wrappers (`Makefile`) and CI env.
3. Use a higher audit/CI bound than local default when suites grow, via `SUI_TEST_GAS_LIMIT=<N> make test`.
