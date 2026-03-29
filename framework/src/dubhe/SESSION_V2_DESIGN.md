# Dubhe Framework Session V2 Design (As Built)

> 中文版：`SESSION_V2_DESIGN_CN.md`

## Scope

This document describes the current session implementation in
`framework/src/dubhe`.

## Goals

1. Allow owner-authorized delegated writes.
2. Keep write subject bound to owner account/subject.
3. Prevent replay of delegated writes.
4. Support bounded session lifetime and bounded session usage.
5. Keep legacy APIs for compatibility while providing hardened session variants.

## Current Architecture

### Data Model

Session state is represented by `session_cap::SessionCap` object, not a table row.

`SessionCap` key fields:

- `subject: SubjectId`
- `owner: address`
- `delegate: address`
- `scope_mask: u64`
- `expires_at_ms: u64`
- `version: u64` (subject-scoped revocation version from `SessionRegistry`)
- `revoked: bool`
- `max_uses: u64` (`0` means unlimited in `create_session_cap`)
- `used_uses: u64`
- `next_nonce: u64`

### Revocation Model

- Point revoke: `session_cap::revoke` sets `revoked = true`.
- Subject-wide revoke: `session_system::revoke_subject_sessions` bumps
  `SessionRegistry` version for `(dapp_key, subject)` and invalidates old caps.

## API Surface

### `session_cap`

- `create_session_cap` (unlimited uses)
- `create_session_cap_with_limits` (`max_uses > 0` required)
- `ensure_can_write`
- `can_write_with_nonce` / `ensure_can_write_with_nonce`
- `consume_write_with_nonce` (checks auth + nonce, then consumes)
- getters: `max_uses`, `used_uses`, `next_nonce`

### `session_system`

- wraps creation/revoke helpers
- adds `consume_write_with_nonce` wrapper for system-level use

### `dapp_system`

Session-aware write variants now include nonce-protected entrypoints:

- `set_record_with_session_cap_nonce`
- `set_field_with_session_cap_nonce`
- `delete_record_with_session_cap_nonce`

Legacy `*_with_session_cap` variants are retained for compatibility.

## Security Properties

1. **Delegate binding**: only `delegate` can use the cap.
2. **Scope gating**: `(cap.scope_mask & op_mask) == op_mask`.
3. **TTL gating**: session rejected after expiry.
4. **Revocation gating**: explicit revoke and version bump both invalidate use.
5. **Replay protection**: caller must provide `expected_nonce == cap.next_nonce`.
6. **Use-cap enforcement**: bounded session invalid after `used_uses >= max_uses`.
7. **Owner subject binding**: writes execute against cap `subject`, so resulting
   state/assets remain under owner subject.

## SDK Integration (`@0xobelisk/sui-client`)

`Dubhe` provides high-level helpers mapped to nonce-protected framework APIs:

- `getSessionCapNextNonce`
- `setRecordWithSessionCap`
- `setFieldWithSessionCap`
- `deleteRecordWithSessionCap`
- `clearSessionNonceCache`

Helpers auto-read nonce from chain when not provided, and maintain local nonce
cache per `(frameworkPackageId, sessionCapId)`.

## Test Coverage

Move tests cover:

1. Owner registers delegate; delegate writes; data remains under owner subject.
2. Owner cannot execute delegate-bound session.
3. Use cap enforcement.
4. Wrong nonce (replay/stale nonce) rejection.
5. Invalid `max_uses` rejection.
6. Existing scope/revoke/version isolation checks.

Scenario tests live in:

- `sources/tests/scenarios/session_flow.move`

Core session tests live in:

- `sources/tests/session_cap.move`

## Standard Verification Commands

From `framework/src/dubhe`:

1. `make test`
2. `make test-session`
3. `sui move test session_flow_scenario_test`

From repo root:

1. `pnpm --filter @0xobelisk/sui-client type-check`
2. `pnpm --filter @0xobelisk/sui-client test:typecheck`

## Passkey + Ephemeral Key Workflow

Recommended product flow:

1. Main account (for example passkey wallet) sends tx to create `SessionCap`
   bound to delegate address.
2. Delegate ephemeral key sends session writes with nonce-protected APIs.
3. State/asset ownership remains bound to owner subject in session cap.
