module dubhe::dapp_system;

use dubhe::dapp_service::{
    Self,
    DappHub,
    DappStorage,
    UserStorage,
};
use dubhe::dubhe_events;
use dubhe::type_info;
use dubhe::dapp_metadata;
use dubhe::errors::{
    no_permission_error,
    not_latest_version_error,
    dapp_paused_error,
    invalid_package_id_error,
    invalid_version_error,
    dapp_already_initialized_error,
    no_pending_ownership_transfer_error,
    user_debt_limit_exceeded_error,
    dapp_suspended_error,
    dapp_key_mismatch_error,
    no_active_session_error,
    not_canonical_owner_error,
    insufficient_credit_to_unsuspend_error,
    user_storage_already_exists_error,
    invalid_session_key_error,
    invalid_session_duration_error,
};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::transfer;
use std::ascii::{String, string};
use std::type_name;

// ─── Framework constants ──────────────────────────────────────────────────────

/// Current framework version. Lifecycle functions gate on this constant.
/// After a package upgrade, call bump_framework_version(dh) in migrate() to
/// increment DappHub.version to match; old package calls will then abort.
const FRAMEWORK_VERSION: u64 = 1;

/// Minimum session key validity duration (1 minute in milliseconds).
const MIN_SESSION_DURATION_MS: u64 = 60_000;

/// Maximum session key validity duration (7 days in milliseconds).
const MAX_SESSION_DURATION_MS: u64 = 7 * 24 * 60 * 60 * 1_000;

/// Minimum fee increase delay (48 hours in milliseconds).
const MIN_FEE_INCREASE_DELAY_MS: u64 = 48 * 60 * 60 * 1_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/// Assert that DappHub.version matches FRAMEWORK_VERSION.
/// Lifecycle functions call this to block calls from old package IDs after
/// a framework upgrade (once migrate() bumps DappHub.version).
fun assert_framework_version(dh: &DappHub) {
    not_latest_version_error(dapp_service::framework_version(dh) == FRAMEWORK_VERSION);
}

// ─── DApp lifecycle ───────────────────────────────────────────────────────────

/// Create a new DApp: produce a DappStorage object with initialised metadata.
///
/// `dapp_hub` is required so the framework can enforce a one-shot guard:
/// each DappKey type may only produce ONE DappStorage ever.  The check is
/// performed here inside the framework — not in the codegen-generated
/// genesis.move — so it cannot be bypassed even if the developer modifies
/// their genesis module.
///
/// Returns the `DappStorage` so the caller can:
///   1. Run deploy_hook to set up initial state.
///   2. Call `transfer::public_share_object(ds)` to publish it.
///
/// Typical usage in `genesis::run`:
/// ```
///   let mut ds = dapp_system::create_dapp<DappKey>(dapp_key, dapp_hub, ...);
///   my_package::deploy_hook::run(&mut ds, ctx);
///   transfer::public_share_object(ds);
/// ```
public fun create_dapp<DappKey: copy + drop>(
    _dapp_key:   DappKey,
    dapp_hub:    &mut DappHub,
    name:        String,
    description: String,
    clock:       &Clock,
    ctx:         &mut TxContext,
): DappStorage {
    assert_framework_version(dapp_hub);

    // One-shot guard enforced by the framework: a given DappKey type can only
    // ever produce one DappStorage, regardless of what genesis.move does.
    dapp_already_initialized_error(!dapp_service::is_dapp_genesis_done<DappKey>(dapp_hub));

    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    let mut ds = dapp_service::new_dapp_storage<DappKey>(ctx);

    let created_at  = clock::timestamp_ms(clock);
    let admin       = ctx.sender();
    let package_ids = vector[type_info::get_package_id<DappKey>()];

    dapp_metadata::set(
        &mut ds,
        name,
        description,
        string(b""),
        vector::empty(),
        vector::empty(),
        package_ids,
        created_at,
        admin,
        @0x0,
        1,
        false,
        ctx,
    );

    // Register genesis as complete. Any future call to create_dapp with the
    // same DappKey type will abort with dapp_already_initialized_error.
    dapp_service::set_dapp_genesis_done<DappKey>(dapp_hub);

    dubhe_events::emit_dapp_created(dapp_key_str, admin, clock::timestamp_ms(clock));
    ds
}

/// Create a UserStorage for the transaction sender within a DApp.
/// Aborts if the DApp is suspended.
///
/// Each address may only create ONE UserStorage per DApp.  A second call from
/// the same address aborts with `user_storage_already_exists_error`, preventing
/// users from discarding a debt-laden UserStorage and starting fresh with a
/// zero write_count.  During an active proxy the registration persists, so the
/// canonical owner also cannot create a duplicate while their storage is held
/// by the proxy.
public fun create_user_storage<DappKey: copy + drop>(
    dapp_hub:     &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dapp_hub);
    dapp_suspended_error(!dapp_service::is_suspended(dapp_storage));
    let sender = ctx.sender();
    user_storage_already_exists_error(
        !dapp_service::has_registered_user_storage(dapp_storage, sender)
    );
    dapp_service::register_user_storage(dapp_storage, sender);
    let us = dapp_service::new_user_storage<DappKey>(sender, ctx);
    dapp_service::share_user_storage(us);
}

// ─── Hot-path: user writes to UserStorage ─────────────────────────────────────

/// Write a full record to the caller's UserStorage.
///
/// Requirements:
/// - `_auth` must be an instance of the DApp's DappKey type. Because DappKey::new()
///   is public(package), only code inside the DApp's own package can supply this value.
///   This prevents external packages from calling this function directly.
/// - `dapp_hub` is passed read-only to fetch the current max_unsettled_writes threshold.
///   Because it is `&DappHub` (immutable reference), Sui's parallel execution is not
///   affected — multiple transactions can pass the same DappHub concurrently.
/// - `user_storage` must belong to the correct DApp (dapp_key must match).
/// - Caller must be the current owner (canonical_owner or active session key).
/// - Unsettled write count must be below the framework-wide threshold from DappHub.
public fun set_record<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_hub:     &DappHub,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    offchain:     bool,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Only canonical owner or active session key may write.
    no_permission_error(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));

    // Enforce per-user debt limit using the framework-wide threshold from DappHub.
    let unsettled   = dapp_service::unsettled_count(user_storage);
    let max_writes  = dapp_service::max_unsettled_writes(dapp_service::get_config(dapp_hub));
    user_debt_limit_exceeded_error(unsettled < max_writes);

    dapp_service::set_user_record<DappKey>(user_storage, key, field_names, values, offchain);
    if (!offchain) {
        dapp_service::increment_write_count(user_storage);
    };
}

/// Update a single named field within an existing UserStorage record.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
/// `dapp_hub` is passed read-only to fetch the current max_unsettled_writes threshold.
public fun set_field<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_hub:     &DappHub,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    field_value:  vector<u8>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    no_permission_error(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));

    let unsettled  = dapp_service::unsettled_count(user_storage);
    let max_writes = dapp_service::max_unsettled_writes(dapp_service::get_config(dapp_hub));
    user_debt_limit_exceeded_error(unsettled < max_writes);

    dapp_service::set_user_field<DappKey>(user_storage, key, field_name, field_value);
    dapp_service::increment_write_count(user_storage);
}

/// Delete a record and all its named fields from the caller's UserStorage (no fee on delete).
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun delete_record<DappKey: copy + drop>(
    _auth:        DappKey,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    ctx:          &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    no_permission_error(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));
    dapp_service::delete_user_record<DappKey>(user_storage, key, field_names);
}

/// Delete a single named field from the caller's UserStorage.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun delete_field<DappKey: copy + drop>(
    _auth:        DappKey,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    ctx:          &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    no_permission_error(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));
    dapp_service::delete_user_field<DappKey>(user_storage, key, field_name);
}

// ─── Global writes (DApp-level state) ─────────────────────────────────────────

/// Write a global record into DappStorage (admin / protocol-level data).
/// No debt limit; callers typically are the DApp admin.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun set_global_record<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    offchain:     bool,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_service::set_global_record<DappKey>(dapp_storage, key, field_names, values, offchain, ctx);
}

/// Update a single named field within a DappStorage global record.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun set_global_field<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    field_value:  vector<u8>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_service::set_global_field<DappKey>(dapp_storage, key, field_name, field_value);
}

/// Delete a global record and all its named fields from DappStorage.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun delete_global_record<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_service::delete_global_record<DappKey>(dapp_storage, key, field_names);
}

/// Delete a single named field from DappStorage.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
public fun delete_global_field<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_service::delete_global_field<DappKey>(dapp_storage, key, field_name);
}

// ─── Read-only helpers ────────────────────────────────────────────────────────

public fun get_field<DappKey: copy + drop>(
    user_storage: &UserStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
): vector<u8> {
    dapp_service::get_user_field<DappKey>(user_storage, key, field_name)
}

public fun has_record<DappKey: copy + drop>(
    user_storage: &UserStorage,
    key:          vector<vector<u8>>,
): bool {
    dapp_service::has_user_record<DappKey>(user_storage, key)
}

public fun ensure_has_record<DappKey: copy + drop>(
    user_storage: &UserStorage,
    key:          vector<vector<u8>>,
) {
    dapp_service::ensure_has_user_record<DappKey>(user_storage, key)
}

public fun ensure_has_not_record<DappKey: copy + drop>(
    user_storage: &UserStorage,
    key:          vector<vector<u8>>,
) {
    dapp_service::ensure_has_not_user_record<DappKey>(user_storage, key)
}

public fun get_global_field<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
): vector<u8> {
    dapp_service::get_global_field<DappKey>(dapp_storage, key, field_name)
}

public fun has_global_record<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    key:          vector<vector<u8>>,
): bool {
    dapp_service::has_global_record<DappKey>(dapp_storage, key)
}

public fun ensure_has_global_record<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    key:          vector<vector<u8>>,
) {
    dapp_service::ensure_has_global_record<DappKey>(dapp_storage, key)
}

public fun ensure_has_not_global_record<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    key:          vector<vector<u8>>,
) {
    dapp_service::ensure_has_not_global_record<DappKey>(dapp_storage, key)
}

// ─── Lazy Settlement ──────────────────────────────────────────────────────────

/// Settle accumulated write debt for a user.
///
/// Reads the currently effective fee from DappHub and computes the charge for
/// all unsettled writes, then deducts from DappStorage.credit_pool.
///
/// `ctx` is used to check whether a pending fee increase has matured (using
/// ctx.epoch_timestamp_ms(), ≈24h granularity). If the pending fee has matured
/// it is used for this settlement without persisting it to storage; the next call
/// to update_framework_fee will formally commit it.
///
/// Behaviour when credit is insufficient:
/// - Full balance available  → full settlement (settled_count = write_count).
/// - Partial balance         → partial settlement (deduct all remaining credit).
/// - Zero balance / free fee → silent skip, emit SettlementSkipped event.
///
/// This function NEVER aborts due to insufficient credit so it is safe to
/// insert at the start of any PTB without risking user-transaction rollback.
public fun settle_writes<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
) {
    assert_framework_version(dh);

    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    let unsettled = dapp_service::unsettled_count(user_storage);
    if (unsettled == 0) { return };

    let fee_per_write = get_effective_fee_per_write_at(dh, ctx.epoch_timestamp_ms());

    // Free-tier: mark settled without touching credit pool.
    if (fee_per_write == 0) {
        dapp_service::set_settled_count_to_write_count(user_storage);
        dubhe_events::emit_writes_settled(
            dapp_key_str,
            dapp_service::canonical_owner(user_storage),
            unsettled,
            0,
        );
        return
    };

    let total_cost = (unsettled as u256) * fee_per_write;
    let available  = dapp_service::credit_pool(dapp_storage);

    if (available == 0) {
        dubhe_events::emit_settlement_skipped(
            dapp_key_str,
            dapp_service::canonical_owner(user_storage),
            unsettled,
        );
        return
    };

    if (available >= total_cost) {
        // Full settlement.
        dapp_service::deduct_credit(dapp_storage, total_cost);
        dapp_service::set_settled_count_to_write_count(user_storage);
        dapp_service::add_total_settled(dapp_storage, (unsettled as u256));
        dubhe_events::emit_writes_settled(
            dapp_key_str,
            dapp_service::canonical_owner(user_storage),
            unsettled,
            total_cost,
        );
    } else {
        // Partial settlement: drain the credit pool, settle as many writes as possible.
        let settled_writes = (available / fee_per_write) as u64;
        let cost_paid = (settled_writes as u256) * fee_per_write;
        dapp_service::deduct_credit(dapp_storage, cost_paid);
        dapp_service::add_settled_count(user_storage, settled_writes);
        dapp_service::add_total_settled(dapp_storage, (settled_writes as u256));
        dubhe_events::emit_settlement_partial(
            dapp_key_str,
            dapp_service::canonical_owner(user_storage),
            settled_writes,
            unsettled - settled_writes,
            cost_paid,
        );
    };
}

// ─── Session key management ────────────────────────────────────────────────────
//
// A "session key" is an ephemeral keypair generated by the game frontend.
// The canonical owner authorises it once; the session key can then sign game
// transactions without requiring the main wallet for every action.
//
// Unlike the old proxy model, UserStorage is NOT transferred.  It stays as a
// shared object reachable by both parties.  The canonical owner can revoke
// the session at any time, and a lost session key is never a lockout risk.

/// Authorise an ephemeral session key to write on behalf of the canonical owner.
///
/// - Only the canonical owner may call this.
/// - `session_wallet` must differ from the caller and must not be @0x0.
/// - `duration_ms` controls expiry (1 min – 7 days). The expiry timestamp is
///   stored as a Clock millisecond value, but write-path checks use
///   ctx.epoch_timestamp_ms() (≈ 24 h granularity on mainnet/testnet, ≈ 1 h on
///   devnet). Treat the deadline as a soft bound: the session may remain valid
///   for up to one epoch after the Clock expiry. The canonical owner can always
///   revoke early via deactivate_session.
/// - Calling activate_session while a session is already active replaces it
///   immediately — no need to deactivate first.
public fun activate_session<DappKey: copy + drop>(
    user_storage:  &mut UserStorage,
    session_wallet: address,
    duration_ms:    u64,
    clock:          &Clock,
    ctx:            &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    let canonical = dapp_service::canonical_owner(user_storage);
    not_canonical_owner_error(canonical == ctx.sender());

    invalid_session_key_error(session_wallet != @0x0);
    invalid_session_key_error(session_wallet != ctx.sender());
    invalid_session_duration_error(duration_ms >= MIN_SESSION_DURATION_MS);
    invalid_session_duration_error(duration_ms <= MAX_SESSION_DURATION_MS);

    let expires_at = clock::timestamp_ms(clock) + duration_ms;
    dapp_service::set_session_key(user_storage, session_wallet);
    dapp_service::set_session_expires_at(user_storage, expires_at);

    dubhe_events::emit_session_activated(dapp_key_str, canonical, session_wallet, expires_at);
}

/// Deactivate the current session key.
///
/// Allowed callers:
///   - The canonical owner (revoke at any time, e.g. on browser refresh).
///   - The session key itself (voluntary sign-out at end of game session).
///   - Anyone, once the session has expired (cleanup).
public fun deactivate_session<DappKey: copy + drop>(
    user_storage: &mut UserStorage,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Must have an active session to deactivate.
    no_active_session_error(dapp_service::session_key(user_storage) != @0x0);

    let sender    = ctx.sender();
    let canonical = dapp_service::canonical_owner(user_storage);
    let sk        = dapp_service::session_key(user_storage);
    let expires   = dapp_service::session_expires_at(user_storage);
    let expired   = expires > 0 && ctx.epoch_timestamp_ms() >= expires;

    // Canonical owner may always deactivate; session key may deactivate itself;
    // anyone may clean up after natural expiry.
    no_permission_error(sender == canonical || sender == sk || expired);

    dapp_service::clear_session(user_storage);
    dubhe_events::emit_session_deactivated(dapp_key_str, canonical);
}

// ─── Credit management ────────────────────────────────────────────────────────

/// Recharge a DApp's credit pool by paying SUI.
/// Any account may call this — no admin restriction.
/// Payment is forwarded to the framework treasury.
/// Credits added at 1 MIST = 1 credit unit.
public fun recharge_credit<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    payment:      Coin<SUI>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let amount = coin::value(&payment) as u256;
    let treasury = dapp_service::treasury(dapp_service::get_fee_config(dh));
    transfer::public_transfer(payment, treasury);

    dapp_service::add_credit(dapp_storage, amount);

    dubhe_events::emit_credit_recharged(dapp_key_str, ctx.sender(), amount);
}

// ─── DApp suspension ─────────────────────────────────────────────────────────

/// Framework admin: suspend a DApp (e.g. when credit is exhausted).
/// Suspended DApps cannot create new UserStorage entries.
/// Caller must be the framework admin address.
public fun suspend_dapp<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);

    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    no_permission_error(admin == ctx.sender());

    dapp_service::set_suspended(dapp_storage, true);
    dubhe_events::emit_dapp_suspended(dapp_key_str);
}

/// Framework admin: resume a suspended DApp.
///
/// Credit requirement before unsuspension:
/// - If DappStorage.min_credit_to_unsuspend > 0: credit_pool must meet that threshold.
///   DApp admins set this via set_dapp_config to ensure meaningful credit buffer.
/// - Otherwise: credit_pool must be > 0 (any positive amount).
public fun unsuspend_dapp<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);

    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    no_permission_error(admin == ctx.sender());

    let pool    = dapp_service::credit_pool(dapp_storage);
    let min_req = dapp_service::min_credit_to_unsuspend(dapp_storage);
    if (min_req > 0) {
        insufficient_credit_to_unsuspend_error(pool >= min_req);
    } else {
        insufficient_credit_to_unsuspend_error(pool > 0);
    };

    dapp_service::set_suspended(dapp_storage, false);
    dubhe_events::emit_dapp_unsuspended(dapp_key_str);
}

// ─── DApp configuration ───────────────────────────────────────────────────────

/// DApp admin: configure the minimum credit required to unsuspend this DApp.
///
/// - `min_credit_to_unsuspend`: minimum credit required to unsuspend via
///   unsuspend_dapp. 0 means any credit > 0 is sufficient.
///
/// Note: The per-user unsettled write limit (max_unsettled_writes) is now
/// managed centrally by the framework admin via update_framework_config
/// and is stored in DappHub rather than per-DApp.
public fun set_dapp_config<DappKey: copy + drop>(
    _auth:                   DappKey,
    dapp_storage:            &mut DappStorage,
    min_credit_to_unsuspend: u256,
    ctx:                     &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == ctx.sender());

    dapp_service::set_min_credit_to_unsuspend(dapp_storage, min_credit_to_unsuspend);
}

// ─── Framework config management ─────────────────────────────────────────────
//
// The framework admin manages operational parameters stored in DappHub.config.
// This is separate from the treasury which manages financial operations.

/// Framework admin: update the operational config parameters.
///
/// - `max_unsettled_writes`: the new per-user unsettled write limit. All
///   subsequent set_record / set_field calls will use this value. Takes effect
///   immediately without a package upgrade.
///
/// Only the current framework admin (DappHub.config.admin) may call this.
public fun update_framework_config(
    dh:                   &mut DappHub,
    max_unsettled_writes: u64,
    ctx:                  &TxContext,
) {
    let cfg = dapp_service::get_config_mut(dh);
    no_permission_error(dapp_service::framework_admin(cfg) == ctx.sender());
    dapp_service::set_max_unsettled_writes(cfg, max_unsettled_writes);
}

/// Step 1: Current framework admin proposes a new admin address.
/// Only the current framework admin can call this.
/// Propose @0x0 to cancel a pending proposal.
public fun propose_framework_admin(
    dh:        &mut DappHub,
    new_admin: address,
    ctx:       &TxContext,
) {
    let cfg = dapp_service::get_config_mut(dh);
    no_permission_error(dapp_service::framework_admin(cfg) == ctx.sender());
    dapp_service::set_pending_framework_admin(cfg, new_admin);
}

/// Step 2: Pending framework admin accepts, completing the rotation.
/// Only the pending framework admin can call this.
public fun accept_framework_admin(
    dh:  &mut DappHub,
    ctx: &TxContext,
) {
    let cfg = dapp_service::get_config_mut(dh);
    let pending = dapp_service::pending_framework_admin(cfg);
    no_pending_ownership_transfer_error(pending != @0x0);
    no_permission_error(pending == ctx.sender());
    dapp_service::set_framework_admin(cfg, pending);
    dapp_service::set_pending_framework_admin(cfg, @0x0);
}

// ─── Framework version management ────────────────────────────────────────────

/// Bump DappHub.version to the current FRAMEWORK_VERSION.
/// Called from migrate() after a package upgrade to enable version-gated
/// lifecycle functions from the new package while blocking the old package.
///
/// MONOTONIC: the version only ever increases. This prevents an attack where
/// a caller invokes an older package's migrate::run after a new package has
/// already bumped the version, which would otherwise reset DappHub.version to
/// the old constant and re-enable old clients.
///
/// `public(package)` restricts this to the genesis/migrate modules within the
/// same package — external callers cannot bump the version.
public(package) fun bump_framework_version(dh: &mut DappHub) {
    let current = dapp_service::framework_version(dh);
    if (FRAMEWORK_VERSION > current) {
        dapp_service::set_framework_version(dh, FRAMEWORK_VERSION);
    };
}

// ─── Framework fee management ─────────────────────────────────────────────────

/// Initialise the FrameworkFeeConfig (called once from deploy_hook).
/// Silently skips if already initialised.
public(package) fun initialize_framework_fee(
    dh:            &mut DappHub,
    fee_per_write: u256,
    treasury:      address,
    _ctx:          &mut TxContext,
) {
    if (dapp_service::is_fee_config_initialized(dh)) { return };

    let cfg = dapp_service::get_fee_config_mut(dh);
    dapp_service::set_base_fee_per_write(cfg, fee_per_write);
    dapp_service::set_treasury(cfg, treasury);
}

/// Update the framework fee per write.
/// Fee DECREASE is applied immediately.
/// Fee INCREASE requires a 48-hour delay (pending fee mechanism).
/// Caller must be the framework admin address.
public fun update_framework_fee(
    dh:      &mut DappHub,
    new_fee: u256,
    clock:   &Clock,
    ctx:     &mut TxContext,
) {
    assert_framework_version(dh);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    no_permission_error(admin == ctx.sender());

    let cfg = dapp_service::get_fee_config_mut(dh);

    // Commit any expired pending fee first.
    let now = clock::timestamp_ms(clock);
    let pending_fee      = dapp_service::pending_fee_per_write(cfg);
    let effective_at     = dapp_service::fee_effective_at_ms(cfg);
    if (pending_fee > 0 && now >= effective_at) {
        dapp_service::set_base_fee_per_write(cfg, pending_fee);
        dapp_service::set_pending_fee_per_write(cfg, 0);
        dapp_service::set_fee_effective_at_ms(cfg, 0);
    };

    let current = dapp_service::base_fee_per_write(cfg);

    if (new_fee <= current) {
        // Decrease: apply immediately.
        dapp_service::set_base_fee_per_write(cfg, new_fee);
        dapp_service::set_pending_fee_per_write(cfg, 0);
        dapp_service::set_fee_effective_at_ms(cfg, 0);
        dapp_service::push_fee_history(cfg, new_fee, now);
        dubhe_events::emit_fee_updated(new_fee, now);
    } else {
        // Increase: schedule with delay.
        let effective_at_ms = now + MIN_FEE_INCREASE_DELAY_MS;
        dapp_service::set_pending_fee_per_write(cfg, new_fee);
        dapp_service::set_fee_effective_at_ms(cfg, effective_at_ms);
        dubhe_events::emit_fee_update_scheduled(new_fee, effective_at_ms);
    };
}

/// Return the currently effective fee per write using a known timestamp.
///
/// If a pending fee increase has matured (now_ms >= fee_effective_at_ms), the
/// pending fee is returned instead of the base fee. The pending fee is NOT
/// committed to storage here; it is formally committed on the next call to
/// update_framework_fee.
///
/// Used internally by settle_writes (passes ctx.epoch_timestamp_ms()).
public fun get_effective_fee_per_write_at(dh: &DappHub, now_ms: u64): u256 {
    let cfg          = dapp_service::get_fee_config(dh);
    let pending_fee  = dapp_service::pending_fee_per_write(cfg);
    let effective_at = dapp_service::fee_effective_at_ms(cfg);
    if (pending_fee > 0 && effective_at > 0 && now_ms >= effective_at) {
        pending_fee
    } else {
        dapp_service::base_fee_per_write(cfg)
    }
}

/// Return the base fee per write (does not account for pending increases).
/// Use get_effective_fee_per_write_at to include matured pending fees.
public fun get_effective_fee_per_write(dh: &DappHub): u256 {
    dapp_service::base_fee_per_write(dapp_service::get_fee_config(dh))
}

// ─── Framework treasury rotation ─────────────────────────────────────────────
//
// Two-step treasury transfer (mirrors DApp Ownable2Step pattern):
//   Step 1: Current treasury proposes a new treasury address.
//   Step 2: New treasury accepts, completing the rotation.
// Either party can cancel by proposing @0x0 (step 1) or simply ignoring.

/// Step 1: Current treasury proposes a new treasury address.
/// Only the current treasury can call this.
public fun propose_treasury(
    dh:           &mut DappHub,
    new_treasury: address,
    ctx:          &TxContext,
) {
    let cfg = dapp_service::get_fee_config_mut(dh);
    no_permission_error(dapp_service::treasury(cfg) == ctx.sender());
    dapp_service::set_pending_treasury(cfg, new_treasury);
}

/// Step 2: New treasury accepts, completing the rotation.
/// Only the pending treasury can call this.
public fun accept_treasury(
    dh:  &mut DappHub,
    ctx: &TxContext,
) {
    let cfg = dapp_service::get_fee_config_mut(dh);
    let pending = dapp_service::pending_treasury(cfg);
    no_pending_ownership_transfer_error(pending != @0x0);
    no_permission_error(pending == ctx.sender());
    dapp_service::set_treasury(cfg, pending);
    dapp_service::set_pending_treasury(cfg, @0x0);
}

// ─── DApp metadata management ────────────────────────────────────────────────

/// Update the DApp's display metadata.
/// Only the current DApp admin may call this.
public fun set_metadata<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    name:         String,
    description:  String,
    website_url:  String,
    cover_url:    vector<String>,
    partners:     vector<String>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == ctx.sender());

    let mut meta = dapp_metadata::get_struct(dapp_storage);
    meta.update_name(name);
    meta.update_description(description);
    meta.update_website_url(website_url);
    meta.update_cover_url(cover_url);
    meta.update_partners(partners);
    dapp_metadata::set_struct(dapp_storage, meta, ctx);
}

/// Step 1 of the two-step DApp admin transfer.
public fun propose_ownership<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    new_admin:    address,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == ctx.sender());
    dapp_metadata::set_pending_admin(dapp_storage, new_admin, ctx);
}

/// Step 2 of the two-step DApp admin transfer.
public fun accept_ownership<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    let pending = dapp_metadata::get_pending_admin(dapp_storage);
    no_pending_ownership_transfer_error(pending != @0x0);
    no_permission_error(pending == ctx.sender());
    dapp_metadata::set_admin(dapp_storage, pending, ctx);
    dapp_metadata::set_pending_admin(dapp_storage, @0x0, ctx);
}

/// DApp admin: update the registered package IDs and version (called during upgrade).
public fun upgrade_dapp<DappKey: copy + drop>(
    dapp_storage:   &mut DappStorage,
    new_package_id: address,
    new_version:    u32,
    ctx:            &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == ctx.sender());
    let mut package_ids = dapp_metadata::get_package_ids(dapp_storage);
    invalid_package_id_error(!package_ids.contains(&new_package_id));
    package_ids.push_back(new_package_id);
    invalid_version_error(new_version > dapp_metadata::get_version(dapp_storage));
    dapp_metadata::set_package_ids(dapp_storage, package_ids, ctx);
    dapp_metadata::set_version(dapp_storage, new_version, ctx);
}

/// DApp admin: toggle the paused flag.
/// When paused == true, ensure_not_paused aborts and the DApp is effectively halted.
public fun set_paused<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    paused:       bool,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == ctx.sender());
    dapp_metadata::set_paused(dapp_storage, paused, ctx);
}

// ─── Guards ───────────────────────────────────────────────────────────────────

public fun ensure_dapp_admin<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    admin:        address,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    no_permission_error(dapp_metadata::get_admin(dapp_storage) == admin);
}

public fun ensure_latest_version<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    version:      u32,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    not_latest_version_error(dapp_metadata::get_version(dapp_storage) == version);
}

public fun ensure_not_paused<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    dapp_paused_error(!dapp_metadata::get_paused(dapp_storage));
}

// ─── Utility ─────────────────────────────────────────────────────────────────

public fun dapp_key<DappKey: copy + drop>(): String {
    type_name::get<DappKey>().into_string()
}

/// Returns the current framework version constant.
public fun framework_version(): u64 { FRAMEWORK_VERSION }

/// Returns the current per-user unsettled write limit from DappHub.
public fun max_unsettled_writes(dh: &DappHub): u64 {
    dapp_service::max_unsettled_writes(dapp_service::get_config(dh))
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

#[test_only]
public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
    dapp_service::create_dapp_hub_for_testing(ctx)
}

#[test_only]
public fun create_dapp_storage_for_testing<DappKey: copy + drop>(ctx: &mut TxContext): DappStorage {
    let mut ds = dapp_service::new_dapp_storage<DappKey>(ctx);
    // Initialise metadata so lifecycle functions work in tests.
    dapp_metadata::set(
        &mut ds,
        string(b"Test DApp"),
        string(b""),
        string(b""),
        vector::empty(),
        vector::empty(),
        vector[type_info::get_package_id<DappKey>()],
        0,
        ctx.sender(),
        @0x0,
        1,
        false,
        ctx,
    );
    ds
}

#[test_only]
public fun create_user_storage_for_testing<DappKey: copy + drop>(
    owner: address,
    ctx:   &mut TxContext,
): UserStorage {
    dapp_service::new_user_storage<DappKey>(owner, ctx)
}

#[test_only]
public fun min_session_duration_ms(): u64 { MIN_SESSION_DURATION_MS }

#[test_only]
public fun max_session_duration_ms(): u64 { MAX_SESSION_DURATION_MS }

#[test_only]
public fun destroy_dapp_hub(dh: DappHub) {
    dapp_service::destroy(dh)
}

#[test_only]
public fun destroy(dh: DappHub) {
    dapp_service::destroy(dh)
}

#[test_only]
public fun destroy_dapp_storage(ds: DappStorage) {
    dapp_service::destroy_dapp_storage(ds);
}

#[test_only]
public fun destroy_user_storage(us: UserStorage) {
    dapp_service::destroy_user_storage(us);
}

/// Deactivate a session with an explicit `now_ms` instead of `ctx.epoch_timestamp_ms()`.
///
/// `deactivate_session` uses `ctx.epoch_timestamp_ms()` which stays at 0 in
/// `test_scenario` and cannot be advanced without real epoch progression.
/// This helper accepts an explicit `now_ms` so the "expired session can be
/// cleaned up by anyone" code path is exercisable from unit tests.
///
/// Permission rules are identical to the production `deactivate_session`:
///   - canonical owner may always deactivate
///   - session key may deactivate itself
///   - any `sender` may deactivate once `now_ms >= session_expires_at` (expired cleanup)
#[test_only]
public fun deactivate_session_with_now_ms_for_testing<DappKey: copy + drop>(
    user_storage: &mut UserStorage,
    sender:       address,
    now_ms:       u64,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_key_mismatch_error(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    no_active_session_error(dapp_service::session_key(user_storage) != @0x0);

    let canonical = dapp_service::canonical_owner(user_storage);
    let sk        = dapp_service::session_key(user_storage);
    let expires   = dapp_service::session_expires_at(user_storage);
    let expired   = expires > 0 && now_ms >= expires;

    no_permission_error(sender == canonical || sender == sk || expired);
    dapp_service::clear_session(user_storage);
}
