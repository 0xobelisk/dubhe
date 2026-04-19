#[allow(unused_use)]
module dubhe::dapp_system;

use dubhe::dapp_service::{
    Self,
    DappHub,
    DappStorage,
    UserStorage,
};
use dubhe::dubhe_events;
use dubhe::type_info;
use dubhe::error;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::balance;
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

// ─── Settlement mode constants ────────────────────────────────────────────────

/// DApp subsidizes user write costs from its credit_pool (existing behaviour).
const SETTLEMENT_DAPP: u8 = 0;
/// User pre-pays; revenue is split between framework treasury and DApp admin at deposit time.
const SETTLEMENT_USER: u8 = 1;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/// Assert that DappHub.version matches FRAMEWORK_VERSION.
/// Lifecycle functions call this to block calls from old package IDs after
/// a framework upgrade (once migrate() bumps DappHub.version).
fun assert_framework_version(dh: &DappHub) {
    error::not_latest_version(dapp_service::framework_version(dh) == FRAMEWORK_VERSION);
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
    _dapp_key:    DappKey,
    dapp_hub:     &mut DappHub,
    name:         String,
    description:  String,
    initial_mode: u8,
    clock:        &Clock,
    ctx:          &mut TxContext,
): DappStorage {
    assert_framework_version(dapp_hub);
    error::wrong_settlement_mode(initial_mode == 0 || initial_mode == 1);

    // One-shot guard enforced by the framework: a given DappKey type can only
    // ever produce one DappStorage, regardless of what genesis.move does.
    error::dapp_already_initialized(!dapp_service::is_dapp_genesis_done<DappKey>(dapp_hub));

    let dapp_key_str = type_info::get_type_name_string<DappKey>();

    // Read default free credit from framework config and apply to the new DApp.
    let cfg         = dapp_service::get_config(dapp_hub);
    let free_amount = dapp_service::default_free_credit(cfg);
    let duration_ms = dapp_service::default_free_credit_duration_ms(cfg);
    let created_at  = clock::timestamp_ms(clock);
    let expires_at  = if (duration_ms > 0) { created_at + duration_ms } else { 0 };
    let default_revenue_share = dapp_service::default_dapp_revenue_share_bps(cfg);

    let admin       = ctx.sender();
    let package_ids = vector[type_info::get_package_id<DappKey>()];

    // Copy the current effective fee rates from DappHub into the new DappStorage.
    // These become the per-DApp rates used by settle_writes.
    let (default_base, default_bytes) = get_effective_fees(dapp_hub);

    let ds = dapp_service::new_dapp_storage<DappKey>(
        name,
        description,
        package_ids,
        created_at,
        admin,
        free_amount,
        expires_at,
        default_base,
        default_bytes,
        initial_mode,
        default_revenue_share,
        ctx,
    );

    // Register genesis as complete. Any future call to create_dapp with the
    // same DappKey type will abort with dapp_already_initialized_error.
    dapp_service::set_dapp_genesis_done<DappKey>(dapp_hub);

    dubhe_events::emit_dapp_created(dapp_key_str, admin, created_at);
    dapp_service::emit_fee_state_record<DappKey>(&ds);
    ds
}

/// Create a UserStorage for the transaction sender within a DApp.
/// Aborts if the DApp is paused.
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
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));
    let sender = ctx.sender();
    error::user_storage_already_exists(!dapp_service::has_registered_user_storage(dapp_storage, sender));
    dapp_service::register_user_storage(dapp_storage, sender);
    let write_limit = dapp_service::framework_max_write_limit(dapp_service::get_config(dapp_hub));
    let us = dapp_service::new_user_storage<DappKey>(sender, write_limit, ctx);
    dapp_service::share_user_storage(us);
}

// ─── Hot-path: user writes to UserStorage ─────────────────────────────────────

/// Write a full record to the caller's UserStorage.
///
/// Requirements:
/// - `_auth` must be an instance of the DApp's DappKey type. Because DappKey::new()
///   is public(package), only code inside the DApp's own package can supply this value.
///   This prevents external packages from calling this function directly.
/// - `user_storage` must belong to the correct DApp (dapp_key must match).
/// - Caller must be the current owner (canonical_owner or active session key).
/// - Unsettled write count must be below the DApp's configured write_limit.
public fun set_record<DappKey: copy + drop>(
    _auth:        DappKey,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    offchain:     bool,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Only canonical owner or active session key may write.
    error::no_permission(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));

    // Enforce per-user write count ceiling. Settlement is required once the
    // unsettled write count reaches the DApp's configured write_limit.
    // Using a pure count avoids reading fee rates at write time.
    error::user_debt_limit_exceeded(dapp_service::unsettled_count(user_storage) < dapp_service::user_write_limit(user_storage));

    // Accumulate write metrics.  write_count is incremented for ALL writes
    // (offchain and onchain) because the framework was used regardless.
    // write_bytes is incremented for onchain writes only (offchain writes
    // emit an event but store nothing on-chain, so bytes_fee does not apply).
    dapp_service::increment_write_count(user_storage);
    if (!offchain) {
        let data_bytes = compute_values_bytes(&values);
        dapp_service::add_write_bytes(user_storage, data_bytes);
    };

    dapp_service::set_user_record<DappKey>(user_storage, key, field_names, values, offchain);
}

/// Update a single named field within an existing UserStorage record.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
/// Unsettled write count must be below the DApp's configured write_limit.
public fun set_field<DappKey: copy + drop>(
    _auth:        DappKey,
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    field_value:  vector<u8>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    error::no_permission(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));

    error::user_debt_limit_exceeded(dapp_service::unsettled_count(user_storage) < dapp_service::user_write_limit(user_storage));

    dapp_service::set_user_field<DappKey>(user_storage, key, field_name, field_value);
    dapp_service::increment_write_count(user_storage);
    dapp_service::add_write_bytes(user_storage, (field_value.length() as u256));
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
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    error::no_permission(dapp_service::is_write_authorized(
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
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    error::no_permission(dapp_service::is_write_authorized(
        user_storage, ctx.sender(), ctx.epoch_timestamp_ms()
    ));
    dapp_service::delete_user_field<DappKey>(user_storage, key, field_name);
}

// ─── Global writes (DApp-level state) ─────────────────────────────────────────

/// Write a global record into DappStorage (admin / protocol-level data).
/// `_auth` enforces that only the DApp's own package code can invoke this function.
/// Global writes are free in both settlement modes (no credit deduction).
public fun set_global_record<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    offchain:     bool,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    dapp_service::set_global_record<DappKey>(dapp_storage, key, field_names, values, offchain);
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

/// Update a single named field within a DappStorage global record.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
/// Global writes are free in both settlement modes (no credit deduction).
public fun set_global_field<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    field_value:  vector<u8>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    dapp_service::set_global_field<DappKey>(dapp_storage, key, field_name, field_value);
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
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
/// Uses the per-DApp fee rates stored in DappStorage (synced from DappHub via
/// sync_dapp_fee). Pending DappHub fee changes do not apply until sync_dapp_fee
/// is called after update_framework_fee has committed them.
///
/// Behaviour when credit is insufficient:
/// - Full balance available  → full settlement (settled_count = write_count).
/// - Partial balance, makes progress → partial settlement (proportional advance).
/// - Partial balance, rounds to zero → skip (credit preserved, emit SettlementSkipped).
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    let unsettled_writes = dapp_service::unsettled_count(user_storage);
    let unsettled_bytes  = dapp_service::unsettled_bytes(user_storage);
    if (unsettled_writes == 0 && unsettled_bytes == 0) { return };

    // In USER_PAYS mode the user must provide a Coin via settle_writes_user_pays.
    error::wrong_settlement_mode(dapp_service::settlement_mode(dapp_storage) == SETTLEMENT_DAPP);

    let now_ms    = ctx.epoch_timestamp_ms();
    // Read per-DApp fee rates from DappStorage (synced via sync_dapp_fee from DappHub defaults).
    let base_fee  = dapp_service::dapp_base_fee_per_write(dapp_storage);
    let bytes_fee = dapp_service::dapp_bytes_fee_per_byte(dapp_storage);
    let account   = dapp_service::canonical_owner(user_storage);

    // Free-tier: both fees are zero — mark everything settled at no cost.
    if (base_fee == 0 && bytes_fee == 0) {
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, 0);
        return
    };

    let total_cost     = base_fee * (unsettled_writes as u256) + bytes_fee * unsettled_bytes;
    // DApp only owes the framework's revenue share; the DApp-developer portion is not charged here.
    // This aligns DAPP_SUBSIDIZES with USER_PAYS: in both modes the framework collects only its cut.
    let share_bps      = dapp_service::dapp_revenue_share_bps(dapp_storage) as u256;
    let framework_cost = total_cost * (10000 - share_bps) / 10000;

    // If the framework's share is zero (e.g. share_bps == 10000), writes cost nothing.
    if (framework_cost == 0) {
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, 0);
        return
    };

    // Effective free credit (0 if expired).
    let eff_free        = dapp_service::effective_free_credit(dapp_storage, now_ms);
    // Total budget: free credit consumed first, then paid credit.
    let total_available = eff_free + dapp_service::credit_pool(dapp_storage);

    if (total_available == 0) {
        dubhe_events::emit_settlement_skipped(
            dapp_key_str, account, unsettled_writes, unsettled_bytes,
        );
        return
    };

    if (total_available >= framework_cost) {
        // Full settlement: exact cost deducted, all debt cleared.
        let free_used = if (eff_free >= framework_cost) { framework_cost } else { eff_free };
        let paid_used = framework_cost - free_used;

        if (free_used > 0) { dapp_service::deduct_free_credit(dapp_storage, free_used); };
        if (paid_used > 0) {
            dapp_service::deduct_credit(dapp_storage, paid_used);
            dapp_service::add_total_settled(dapp_storage, paid_used);
        };

        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(
            dapp_key_str, account, unsettled_writes, unsettled_bytes, free_used, paid_used,
        );
        dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
    } else {
        // Partial settlement: compute proportional progress first.
        //
        // settled_writes = floor(total_available × unsettled_writes / framework_cost)
        // settled_bytes  = floor(total_available × unsettled_bytes  / framework_cost)
        //
        // If both round to zero the available credit is insufficient to retire even one
        // write unit. Deducting it anyway would consume DApp funds without making any
        // measurable progress. Treat this as a skip and preserve the credit.
        let settled_writes = ((total_available * (unsettled_writes as u256)) / framework_cost) as u64;
        let settled_bytes  = (total_available * unsettled_bytes) / framework_cost;

        if (settled_writes == 0 && settled_bytes == 0) {
            dubhe_events::emit_settlement_skipped(
                dapp_key_str, account, unsettled_writes, unsettled_bytes,
            );
            return
        };

        // Compute exact cost for the proportionally settled portion only.
        // The DApp owes only the framework's revenue share (same ratio as full settlement):
        //   exact_cost = settled_total_cost × (10000 − share_bps) / 10000
        // Using settled_total_cost × framework_ratio (instead of the raw total) ensures
        // exact_cost ≤ total_available and prevents arithmetic underflow in deduct_credit.
        let settled_total_cost = base_fee * (settled_writes as u256) + bytes_fee * settled_bytes;
        let exact_cost = settled_total_cost * (10000 - share_bps) / 10000;
        let free_used = if (eff_free >= exact_cost) { exact_cost } else { eff_free };
        let paid_used = exact_cost - free_used;

        if (free_used > 0) { dapp_service::deduct_free_credit(dapp_storage, free_used); };
        if (paid_used > 0) {
            dapp_service::deduct_credit(dapp_storage, paid_used);
            dapp_service::add_total_settled(dapp_storage, paid_used);
        };

        dapp_service::add_settled_count(user_storage, settled_writes);
        dapp_service::add_settled_bytes(user_storage, settled_bytes);

        dubhe_events::emit_settlement_partial(
            dapp_key_str, account,
            settled_writes,
            settled_bytes,
            unsettled_writes - settled_writes,
            unsettled_bytes  - settled_bytes,
            free_used,
            paid_used,
        );
        dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
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
    dh:             &DappHub,
    user_storage:   &mut UserStorage,
    session_wallet: address,
    duration_ms:    u64,
    clock:          &Clock,
    ctx:            &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    let canonical = dapp_service::canonical_owner(user_storage);
    error::not_canonical_owner(canonical == ctx.sender());

    error::invalid_session_key(session_wallet != @0x0);
    error::invalid_session_key(session_wallet != ctx.sender());
    error::invalid_session_duration(duration_ms >= MIN_SESSION_DURATION_MS);
    error::invalid_session_duration(duration_ms <= MAX_SESSION_DURATION_MS);

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
    dh:           &DappHub,
    user_storage: &mut UserStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Must have an active session to deactivate.
    error::no_active_session(dapp_service::session_key(user_storage) != @0x0);

    let sender    = ctx.sender();
    let canonical = dapp_service::canonical_owner(user_storage);
    let sk        = dapp_service::session_key(user_storage);
    let expires   = dapp_service::session_expires_at(user_storage);
    let expired   = expires > 0 && ctx.epoch_timestamp_ms() >= expires;

    // Canonical owner may always deactivate; session key may deactivate itself;
    // anyone may clean up after natural expiry.
    error::no_permission(sender == canonical || sender == sk || expired);

    dapp_service::clear_session(user_storage);
    dubhe_events::emit_session_deactivated(dapp_key_str, canonical, sk);
}

// ─── Credit management ────────────────────────────────────────────────────────

/// Recharge a DApp's credit pool by paying with the framework's accepted coin type.
/// Any account may call this — no admin restriction.
/// Payment is forwarded to the framework treasury.
/// Credits added at 1 base-unit = 1 credit unit (e.g. 1 MIST = 1 credit for SUI).
/// The accepted coin type is stored in DappHub and can be changed by the treasury
/// via propose_coin_type / accept_coin_type (requires a 48-hour delay).
public fun recharge_credit<DappKey: copy + drop, CoinType>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    payment:      Coin<CoinType>,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    // recharge_credit only makes sense in DAPP_SUBSIDIZES mode; in USER_PAYS mode
    // the credit_pool is not consumed by settlement, so depositing would be misleading.
    error::wrong_settlement_mode(
        dapp_service::settlement_mode(dapp_storage) == SETTLEMENT_DAPP
    );

    // Verify the caller is paying with the currently accepted coin type.
    // type_name::with_defining_ids<CoinType>() is VM-generated from the actual type parameter and
    // includes the full package ID, so it cannot be spoofed via string manipulation.
    let cfg = dapp_service::get_fee_config(dh);
    let accepted = dapp_service::accepted_coin_type(cfg);
    error::wrong_payment_coin_type(
        option::is_some(accepted) && *option::borrow(accepted) == type_name::with_defining_ids<CoinType>()
    );

    let amount = coin::value(&payment) as u256;
    error::insufficient_credit(amount > 0);
    let treasury = dapp_service::treasury(cfg);
    transfer::public_transfer(payment, treasury);

    dapp_service::add_credit(dapp_storage, amount);

    dubhe_events::emit_credit_recharged(
        dapp_key_str,
        ctx.sender(),
        type_name::with_defining_ids<CoinType>().into_string(),
        amount,
    );
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

// ─── USER_PAYS mode — settlement with payment and DApp revenue withdrawal ────────

/// Settle accumulated write debt in USER_PAYS mode by providing a Coin payment.
///
/// The caller passes a coin (may be larger than needed — excess is returned as change).
/// The exact cost is computed on-chain, split between framework treasury and DApp revenue,
/// and writes are marked as fully settled.
///
/// Aborts if:
///   - DApp is not in USER_PAYS mode            (wrong_settlement_mode)
///   - CoinType does not match accepted type    (wrong_payment_coin_type)
///   - payment.value < total_cost              (insufficient_credit)
///
/// When there is nothing to settle, the payment is returned to the sender unchanged.
/// When fee rates are zero, settlement is free and payment is returned unchanged.
public fun settle_writes_user_pays<DappKey: copy + drop, CoinType>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    user_storage: &mut UserStorage,
    mut payment:  Coin<CoinType>,
    ctx:          &mut TxContext,
): Coin<CoinType> {
    assert_framework_version(dh);

    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Must be in USER_PAYS mode.
    error::wrong_settlement_mode(dapp_service::settlement_mode(dapp_storage) == SETTLEMENT_USER);

    // Validate coin type.
    let cfg = dapp_service::get_fee_config(dh);
    let accepted = dapp_service::accepted_coin_type(cfg);
    error::wrong_payment_coin_type(
        option::is_some(accepted) && *option::borrow(accepted) == type_name::with_defining_ids<CoinType>()
    );

    let unsettled_writes = dapp_service::unsettled_count(user_storage);
    let unsettled_bytes  = dapp_service::unsettled_bytes(user_storage);
    let account          = dapp_service::canonical_owner(user_storage);

    // Nothing to settle — return payment unchanged to the caller.
    if (unsettled_writes == 0 && unsettled_bytes == 0) {
        return payment
    };

    let base_fee  = dapp_service::dapp_base_fee_per_write(dapp_storage);
    let bytes_fee = dapp_service::dapp_bytes_fee_per_byte(dapp_storage);

    // Free-tier — settle at no cost, return payment unchanged.
    if (base_fee == 0 && bytes_fee == 0) {
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, 0);
        return payment
    };

    let total_cost = base_fee * (unsettled_writes as u256) + bytes_fee * unsettled_bytes;

    // Guard: total_cost must fit in u64.
    // Coin<T>.value() is bounded by u64::MAX, so if total_cost exceeds it
    // no payment can ever satisfy the debt — abort with a clear error rather
    // than letting the as u64 cast silently truncate.
    error::insufficient_credit(total_cost <= 18_446_744_073_709_551_615u256);

    // Abort if payment is insufficient.
    error::insufficient_credit((coin::value(&payment) as u256) >= total_cost);

    // Split exact cost out of payment; `payment` now holds the change to return.
    let mut exact_coin = coin::split(&mut payment, total_cost as u64, ctx);

    // Split between framework treasury and DApp revenue.
    let share_bps   = dapp_service::dapp_revenue_share_bps(dapp_storage) as u256;
    let dapp_amount = (total_cost * share_bps / 10000) as u64;
    let fw_amount   = total_cost as u64 - dapp_amount;
    let treasury    = dapp_service::treasury(cfg);

    // Only transfer to treasury when fw_amount > 0 (share_bps == 10000 means
    // 100% goes to the DApp; no zero-value Coin should be sent to treasury).
    if (fw_amount > 0) {
        let fw_coin = coin::split(&mut exact_coin, fw_amount, ctx);
        transfer::public_transfer(fw_coin, treasury);
    };

    let dapp_bal = coin::into_balance(exact_coin);
    if (balance::value(&dapp_bal) > 0) {
        dapp_service::add_dapp_revenue<CoinType>(dapp_storage, dapp_bal);
    } else {
        balance::destroy_zero(dapp_bal);
    };

    // Mark all writes as settled and update DApp-level accounting.
    dapp_service::set_settled_to_write(user_storage);
    dapp_service::add_total_settled(dapp_storage, total_cost);

    dubhe_events::emit_writes_settled(
        dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, total_cost,
    );
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);

    // Return the change coin to the caller (the PTB decides where it goes).
    payment
}

/// DApp admin: withdraw all accumulated DApp revenue to their wallet.
/// Only callable by the DApp admin. Aborts if there is no revenue to withdraw.
///
/// Version-gated: after a framework upgrade the DApp admin must call the
/// corresponding function in the new package version.  This prevents stale
/// package code from touching DappStorage state after the framework has moved on.
public fun withdraw_dapp_revenue<DappKey: copy + drop, CoinType>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
): Coin<CoinType> {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());

    let bal = dapp_service::take_dapp_revenue<CoinType>(dapp_storage);
    let amount = balance::value(&bal);
    error::no_revenue_to_withdraw(amount > 0);

    dubhe_events::emit_dapp_revenue_withdrawn(
        dapp_key_str,
        ctx.sender(),
        type_name::with_defining_ids<CoinType>().into_string(),
        amount,
    );

    coin::from_balance(bal, ctx)
}

/// DApp admin: configure settlement mode and revenue share.
///
/// DApp admin: switch settlement mode.
///
/// Both directions are allowed:
///   DAPP_SUBSIDIZES(0) → USER_PAYS(1): credit_pool is kept but becomes inactive —
///     it cannot be consumed for settlement after the switch.
///     Any unsettled user debt that existed before the switch must be paid by users
///     via settle_writes_user_pays; the remaining credit_pool is NOT automatically
///     refunded. DApp admin can withdraw any remaining balance manually if desired.
///   USER_PAYS(1) → DAPP_SUBSIDIZES(0): DappStorage Revenue Balance is kept (withdrawable).
/// Revenue share (dapp_revenue_share_bps) is set exclusively by the framework admin
/// via set_dapp_revenue_share; DApp admin only controls the mode.
public fun set_dapp_settlement_config<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    mode:         u8,
    ctx:          &TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());
    error::wrong_settlement_mode(mode == SETTLEMENT_DAPP || mode == SETTLEMENT_USER);

    let old_mode = dapp_service::settlement_mode(dapp_storage);
    if (old_mode == mode) { return };
    dapp_service::set_settlement_mode(dapp_storage, mode);

    dubhe_events::emit_settlement_mode_changed(dapp_key_str, old_mode, mode);
}

/// Framework admin: set the revenue share for a specific DApp (immediate effect).
///
/// `new_bps` is the percentage of USER_PAYS settlement revenue allocated to the
/// DApp developer. e.g. 3000 = 30% to DApp; 70% to framework treasury.
/// Valid range: 0 – 10000 (0% – 100%).
/// Takes effect on the next settle_writes_user_pays call for this DApp.
public fun set_dapp_revenue_share<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    new_bps:      u64,
    ctx:          &TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    error::revenue_share_exceeds_max(new_bps <= 10_000);

    dapp_service::set_dapp_revenue_share_bps(dapp_storage, new_bps);
    dubhe_events::emit_dapp_revenue_share_set(dapp_key_str, new_bps);
}

/// Framework admin: update the default revenue share for future newly created DApps.
///
/// This does NOT retroactively affect existing DApps. Use set_dapp_revenue_share
/// to update individual DApps.
/// Valid range: 0 – 10000.
public fun update_default_revenue_share(
    dh:      &mut DappHub,
    new_bps: u64,
    ctx:     &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    error::revenue_share_exceeds_max(new_bps <= 10_000);

    dapp_service::set_default_dapp_revenue_share_bps(dapp_service::get_config_mut(dh), new_bps);
    dubhe_events::emit_default_revenue_share_updated(new_bps);
}

// ─── Write limit management ───────────────────────────────────────────────────

/// Sync the framework's current write limit into a UserStorage.
///
/// Call this after `set_framework_max_write_limit` to propagate the new limit
/// to specific users. The client can compare `user_write_limit(us)` with
/// `framework_max_write_limit(get_config(dh))` to detect whether a sync is
/// needed before the user starts playing.
///
/// Requirements:
///   - DappKey type must match the UserStorage's dapp_key.
public fun sync_user_write_limit<DappKey: copy + drop>(
    dapp_hub:     &DappHub,
    user_storage: &mut UserStorage,
) {
    assert_framework_version(dapp_hub);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    let new_limit = dapp_service::framework_max_write_limit(dapp_service::get_config(dapp_hub));
    dapp_service::set_user_write_limit(user_storage, new_limit);
    let owner = dapp_service::canonical_owner(user_storage);
    dubhe_events::emit_user_write_limit_synced(dapp_key_str, owner, new_limit);
}

/// Framework admin: set the absolute ceiling on per-user unsettled writes.
///
/// This is the single source of truth for write limits. New UserStorage objects
/// snapshot this value at creation time. Existing UserStorage objects update via
/// sync_user_write_limit. Constraint: max >= 1.
public fun set_framework_max_write_limit(
    dh:  &mut DappHub,
    max: u64,
    ctx: &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    error::write_limit_out_of_range(max >= 1);
    dapp_service::set_framework_max_write_limit_cfg(dapp_service::get_config_mut(dh), max);
    dubhe_events::emit_framework_max_write_limit_updated(max, ctx.sender());
}

// ─── Free credit management ───────────────────────────────────────────────────
//
// Framework admin controls the virtual free credit pool for each DApp.
// Free credit has no SUI backing — it is a promotional subsidy paid by the
// framework operator. It is consumed before the DApp's paid credit_pool.

/// Framework admin: grant (or override) virtual free credit to a DApp.
///
/// This is an override operation: the existing free_credit balance and expiry
/// are completely replaced. To extend time only, use extend_free_credit.
///
/// - `amount`:     new free credit in MIST (25 SUI = 25_000_000_000).
/// - `expires_at`: epoch ms after which this credit is void; 0 = never expires.
public fun grant_free_credit<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    amount:       u256,
    expires_at:   u64,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender());

    dapp_service::set_free_credit(dapp_storage, amount, expires_at);
    dubhe_events::emit_free_credit_granted(dapp_key_str, amount, expires_at, ctx.sender());
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

/// Framework admin: revoke all remaining free credit from a DApp immediately.
public fun revoke_free_credit<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender());

    let remaining = dapp_service::free_credit(dapp_storage);
    if (remaining == 0) { return };
    dapp_service::set_free_credit(dapp_storage, 0, 0);
    dubhe_events::emit_free_credit_revoked(dapp_key_str, remaining, ctx.sender());
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

/// Framework admin: extend (or shorten) the expiry of a DApp's free credit.
/// Does not change the amount. Use grant_free_credit to change the amount.
///
/// - `new_expires_at`: new expiry in epoch ms; 0 = never expires.
public fun extend_free_credit<DappKey: copy + drop>(
    dh:             &DappHub,
    dapp_storage:   &mut DappStorage,
    new_expires_at: u64,
    ctx:            &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender());

    let current_amount = dapp_service::free_credit(dapp_storage);
    dapp_service::set_free_credit(dapp_storage, current_amount, new_expires_at);
    dubhe_events::emit_free_credit_extended(dapp_key_str, new_expires_at, ctx.sender());
}

/// Framework admin: update the default free credit granted to future new DApps.
///
/// - `new_amount`:      MIST to grant; 0 disables auto-grant.
/// - `new_duration_ms`: validity window in ms; 0 = never expires.
///                      6 months ≈ 15_778_800_000 ms.
public fun update_default_free_credit(
    dh:             &mut DappHub,
    new_amount:     u256,
    new_duration_ms: u64,
    ctx:            &mut TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender());
    dapp_service::set_default_free_credit(dapp_service::get_config_mut(dh), new_amount, new_duration_ms);
    dubhe_events::emit_default_free_credit_updated(new_amount, new_duration_ms, ctx.sender());
}

// ─── Framework config management ─────────────────────────────────────────────
//
// The framework admin manages operational parameters stored in DappHub.config.
// This is separate from the treasury which manages financial operations.

/// Step 1: Current framework admin proposes a new admin address.
/// Only the current framework admin can call this.
/// Propose @0x0 to cancel a pending proposal.
public fun propose_framework_admin(
    dh:        &mut DappHub,
    new_admin: address,
    ctx:       &TxContext,
) {
    assert_framework_version(dh);
    let cfg = dapp_service::get_config_mut(dh);
    error::no_permission(dapp_service::framework_admin(cfg) == ctx.sender());
    dapp_service::set_pending_framework_admin(cfg, new_admin);
}

/// Step 2: Pending framework admin accepts, completing the rotation.
/// Only the pending framework admin can call this.
public fun accept_framework_admin(
    dh:  &mut DappHub,
    ctx: &TxContext,
) {
    assert_framework_version(dh);
    let cfg = dapp_service::get_config_mut(dh);
    let pending = dapp_service::pending_framework_admin(cfg);
    error::no_pending_ownership_transfer(pending != @0x0);
    error::no_permission(pending == ctx.sender());
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
public(package) fun initialize_framework_fee<CoinType>(
    dh:                &mut DappHub,
    base_fee:          u256,
    bytes_fee:         u256,
    treasury:          address,
    revenue_share_bps: u64,
    _ctx:              &mut TxContext,
) {
    if (dapp_service::is_fee_config_initialized(dh)) { return };

    let cfg = dapp_service::get_fee_config_mut(dh);
    dapp_service::set_base_fee_per_write(cfg, base_fee);
    dapp_service::set_bytes_fee_per_byte(cfg, bytes_fee);
    dapp_service::set_treasury(cfg, treasury);
    dapp_service::set_accepted_coin_type(cfg, type_name::with_defining_ids<CoinType>());

    // Also initialise the settlement defaults — both are one-shot and share
    // the same idempotency guard (is_fee_config_initialized).
    let scfg = dapp_service::get_config_mut(dh);
    dapp_service::set_default_dapp_revenue_share_bps(scfg, revenue_share_bps);
}

/// Update both fee components atomically.
///
/// All fee changes (increases and decreases) are scheduled with a 48-hour
/// delay before taking effect. This gives DApps and users consistent advance
/// notice regardless of direction.
///
/// No-op if the requested fees are identical to the current committed fees.
/// Calling again before the delay has elapsed replaces the pending change
/// and resets the 48-hour timer.
/// Caller must be the framework admin address.
public fun update_framework_fee(
    dh:            &mut DappHub,
    new_base_fee:  u256,
    new_bytes_fee: u256,
    clock:         &Clock,
    ctx:           &mut TxContext,
) {
    assert_framework_version(dh);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    error::no_permission(admin == ctx.sender());

    let now = clock::timestamp_ms(clock);
    let cfg = dapp_service::get_fee_config_mut(dh);

    // Commit any matured pending fees first.
    let effective_at = dapp_service::fee_effective_at_ms(cfg);
    if (effective_at > 0 && now >= effective_at) {
        let pb = dapp_service::pending_base_fee(cfg);
        let py = dapp_service::pending_bytes_fee(cfg);
        dapp_service::set_base_fee_per_write(cfg, pb);
        dapp_service::set_bytes_fee_per_byte(cfg, py);
        dapp_service::push_fee_history(cfg, pb, py, effective_at);
        dapp_service::set_pending_base_fee(cfg, 0);
        dapp_service::set_pending_bytes_fee(cfg, 0);
        dapp_service::set_fee_effective_at_ms(cfg, 0);
        dubhe_events::emit_fee_updated(pb, py, effective_at);
    };

    // No-op if the committed fees are already at the requested values.
    let cur_base  = dapp_service::base_fee_per_write(cfg);
    let cur_bytes = dapp_service::bytes_fee_per_byte(cfg);
    if (new_base_fee == cur_base && new_bytes_fee == cur_bytes) { return };

    // Schedule with a 48-hour delay regardless of direction.
    let effective_at_ms = now + MIN_FEE_INCREASE_DELAY_MS;
    dapp_service::set_pending_base_fee(cfg, new_base_fee);
    dapp_service::set_pending_bytes_fee(cfg, new_bytes_fee);
    dapp_service::set_fee_effective_at_ms(cfg, effective_at_ms);
    dubhe_events::emit_fee_update_scheduled(new_base_fee, new_bytes_fee, effective_at_ms);
}

/// Return the currently effective (base_fee, bytes_fee) pair at `now_ms`.
///
/// If the pending fees have matured (now_ms >= fee_effective_at_ms), the
/// pending values are returned. The pending fees are NOT committed to storage
/// here; that happens on the next call to update_framework_fee.
///
/// Used internally by settle_writes and the debt-limit guard.
public fun get_effective_fees_at(dh: &DappHub, now_ms: u64): (u256, u256) {
    let cfg          = dapp_service::get_fee_config(dh);
    let effective_at = dapp_service::fee_effective_at_ms(cfg);
    let pb           = dapp_service::pending_base_fee(cfg);
    let py           = dapp_service::pending_bytes_fee(cfg);
    if (effective_at > 0 && now_ms >= effective_at) {
        (pb, py)
    } else {
        (
            dapp_service::base_fee_per_write(cfg),
            dapp_service::bytes_fee_per_byte(cfg),
        )
    }
}

// ─── Revenue-share cap helpers ────────────────────────────────────────────────

/// Return the current base-fee and bytes-fee without accounting for pending increases.
public fun get_effective_fees(dh: &DappHub): (u256, u256) {
    let cfg = dapp_service::get_fee_config(dh);
    (
        dapp_service::base_fee_per_write(cfg),
        dapp_service::bytes_fee_per_byte(cfg),
    )
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
    assert_framework_version(dh);
    let cfg = dapp_service::get_fee_config_mut(dh);
    error::no_permission(dapp_service::treasury(cfg) == ctx.sender());
    dapp_service::set_pending_treasury(cfg, new_treasury);
}

/// Step 2: New treasury accepts, completing the rotation.
/// Only the pending treasury can call this.
public fun accept_treasury(
    dh:  &mut DappHub,
    ctx: &TxContext,
) {
    assert_framework_version(dh);
    let cfg = dapp_service::get_fee_config_mut(dh);
    let pending = dapp_service::pending_treasury(cfg);
    error::no_pending_ownership_transfer(pending != @0x0);
    error::no_permission(pending == ctx.sender());
    dapp_service::set_treasury(cfg, pending);
    dapp_service::set_pending_treasury(cfg, @0x0);
}

// ─── Payment coin type management (framework admin) ──────────────────────────
//
// The accepted payment coin type (CoinType) can be changed by the framework admin
// with a mandatory 48-hour notice period, giving DApp operators time to update
// their recharge flows before the old coin type stops being accepted.
//
// Step 1  framework admin calls propose_coin_type<NewCoinType> — schedules the change.
// Step 2  framework admin calls accept_coin_type after the delay — commits the change.
//
// Coin-type management belongs to the framework admin because it is a
// protocol-level decision (what token the entire platform accepts), not a
// treasury wallet concern.

/// Step 1: Framework admin schedules a payment coin type change with a 48-hour delay.
/// Emits CoinTypeChangeProposed so off-chain systems can prepare.
/// Calling again before the delay has elapsed replaces the pending change.
public fun propose_coin_type<NewCoinType>(
    dh:    &mut DappHub,
    clock: &Clock,
    ctx:   &TxContext,
) {
    assert_framework_version(dh);

    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );

    let cfg = dapp_service::get_fee_config_mut(dh);
    let effective_at_ms = clock::timestamp_ms(clock) + MIN_FEE_INCREASE_DELAY_MS;
    dapp_service::set_pending_coin_type(cfg, option::some(type_name::with_defining_ids<NewCoinType>()));
    dapp_service::set_coin_type_effective_at_ms(cfg, effective_at_ms);

    dubhe_events::emit_coin_type_change_proposed(
        type_name::with_defining_ids<NewCoinType>().into_string(),
        effective_at_ms,
    );
}

/// Step 2: Framework admin commits the pending coin type change after the delay.
/// Aborts if there is no pending change or the delay has not elapsed yet.
public fun accept_coin_type(
    dh:    &mut DappHub,
    clock: &Clock,
    ctx:   &TxContext,
) {
    assert_framework_version(dh);

    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );

    let cfg = dapp_service::get_fee_config_mut(dh);
    let pending = dapp_service::pending_coin_type(cfg);
    error::no_pending_coin_type_change(option::is_some(pending));

    let effective_at = dapp_service::coin_type_effective_at_ms(cfg);
    error::coin_type_change_not_ready(clock::timestamp_ms(clock) >= effective_at);

    let new_type = *option::borrow(pending);
    dapp_service::set_accepted_coin_type(cfg, new_type);
    dapp_service::set_pending_coin_type(cfg, option::none());
    dapp_service::set_coin_type_effective_at_ms(cfg, 0);

    dubhe_events::emit_coin_type_changed(new_type.into_string());
}

// ─── DApp metadata management ────────────────────────────────────────────────

// ─── Per-DApp fee rate management ────────────────────────────────────────────

/// Pull the current DappHub effective fee rates into a DappStorage.
/// Permissionless: any caller may trigger a sync to keep a DApp's rates
/// aligned with the latest framework defaults after update_framework_fee.
///
/// Because update_framework_fee schedules all changes with a 48-hour delay,
/// the typical flow is:
///   1. update_framework_fee(dh, new_fees, clock, ctx)  — schedules the pending change.
///   2. Wait 48 hours.
///   3. update_framework_fee(dh, new_fees, clock, ctx)  — triggers commit of the matured pending.
///   4. sync_dapp_fee(dh, ds)  — propagates the newly committed rates to each DApp.
///
/// sync_dapp_fee reads the committed (base_fee_per_write / bytes_fee_per_byte) fields,
/// not the pending values. Committed rates are updated only by step 3 above.
public fun sync_dapp_fee<DappKey: copy + drop>(
    dh: &DappHub,
    ds: &mut DappStorage,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(ds) == dapp_key_str);
    let (base_fee, bytes_fee) = get_effective_fees(dh);
    dapp_service::set_dapp_base_fee_per_write(ds, base_fee);
    dapp_service::set_dapp_bytes_fee_per_byte(ds, bytes_fee);
    dapp_service::emit_fee_state_record<DappKey>(ds);
}


/// Update the DApp's display metadata.
/// Only the current DApp admin may call this.
public fun set_metadata<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    name:         String,
    description:  String,
    website_url:  String,
    cover_url:    vector<String>,
    partners:     vector<String>,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());

    dapp_service::set_dapp_name(dapp_storage, name);
    dapp_service::set_dapp_description(dapp_storage, description);
    dapp_service::set_dapp_website_url(dapp_storage, website_url);
    dapp_service::set_dapp_cover_url(dapp_storage, cover_url);
    dapp_service::set_dapp_partners(dapp_storage, partners);
}

/// Step 1 of the two-step DApp admin transfer.
public fun propose_ownership<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    new_admin:    address,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());
    dapp_service::set_dapp_pending_admin(dapp_storage, new_admin);
}

/// Step 2 of the two-step DApp admin transfer.
public fun accept_ownership<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    let pending = dapp_service::dapp_pending_admin(dapp_storage);
    error::no_pending_ownership_transfer(pending != @0x0);
    error::no_permission(pending == ctx.sender());
    dapp_service::set_dapp_admin(dapp_storage, pending);
    dapp_service::set_dapp_pending_admin(dapp_storage, @0x0);
}

/// DApp admin: update the registered package IDs and version (called during upgrade).
///
/// DappKey must come from a package already registered in this DApp's package_ids list,
/// OR from the new package being registered (caller_pkg == new_package_id). This allows
/// migrate_to_vN in the newly upgraded package to call upgrade_dapp without the type-name
/// mismatch that would occur if we compared the full type string (which embeds the package
/// address and changes on every upgrade).
public fun upgrade_dapp<DappKey: copy + drop>(
    dh:             &DappHub,
    dapp_storage:   &mut DappStorage,
    new_package_id: address,
    new_version:    u32,
    ctx:            &mut TxContext,
) {
    assert_framework_version(dh);
    let caller_pkg  = type_info::get_package_id<DappKey>();
    let existing    = dapp_service::dapp_package_ids(dapp_storage);
    error::dapp_key_mismatch(existing.contains(&caller_pkg) || caller_pkg == new_package_id);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());
    let mut package_ids = dapp_service::dapp_package_ids(dapp_storage);
    error::invalid_package_id(!package_ids.contains(&new_package_id));
    package_ids.push_back(new_package_id);
    error::invalid_version(new_version > dapp_service::dapp_version(dapp_storage));
    dapp_service::set_dapp_package_ids(dapp_storage, package_ids);
    dapp_service::set_dapp_version(dapp_storage, new_version);
    let dapp_key_str = dapp_service::dapp_storage_dapp_key(dapp_storage);
    dubhe_events::emit_dapp_upgraded(dapp_key_str, new_package_id, new_version, ctx.sender());
}

/// DApp admin: toggle the paused flag.
/// When paused == true, ensure_not_paused aborts and the DApp is effectively halted.
public fun set_paused<DappKey: copy + drop>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    paused:       bool,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());
    dapp_service::set_dapp_paused(dapp_storage, paused);
}

// ─── Guards ───────────────────────────────────────────────────────────────────

public fun ensure_dapp_admin<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    admin:        address,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == admin);
}

public fun ensure_latest_version<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
    version:      u32,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::not_latest_version(dapp_service::dapp_version(dapp_storage) == version);
}

public fun ensure_not_paused<DappKey: copy + drop>(
    dapp_storage: &DappStorage,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));
}

// ─── Utility ─────────────────────────────────────────────────────────────────

public fun dapp_key<DappKey: copy + drop>(): String {
    type_name::with_defining_ids<DappKey>().into_string()
}

/// Returns the current framework version constant.
public fun framework_version(): u64 { FRAMEWORK_VERSION }

// ─── Internal fee helpers ──────────────────────────────────────────────────────

/// Sum all value byte lengths. Used to compute the bytes portion of write charges.
fun compute_values_bytes(values: &vector<vector<u8>>): u256 {
    let len = values.length();
    let mut i = 0u64;
    let mut total = 0u256;
    while (i < len) {
        total = total + (values[i].length() as u256);
        i = i + 1;
    };
    total
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

#[test_only]
public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
    dapp_service::create_dapp_hub_for_testing(ctx)
}

#[test_only]
public fun create_dapp_storage_for_testing<DappKey: copy + drop>(ctx: &mut TxContext): DappStorage {
    // free_credit=0, expires_at=0, base_fee=0, bytes_fee=0 so tests are not affected
    // by free-credit or fee logic unless explicitly set.
    dapp_service::new_dapp_storage<DappKey>(
        string(b"Test DApp"),
        string(b""),
        vector[type_info::get_package_id<DappKey>()],
        0,
        ctx.sender(),
        0,
        0,
        0,
        0,
        0,
        0,
        ctx,
    )
}

#[test_only]
public fun create_user_storage_for_testing<DappKey: copy + drop>(
    owner: address,
    ctx:   &mut TxContext,
): UserStorage {
    dapp_service::new_user_storage<DappKey>(owner, 1_000, ctx)
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
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    error::no_active_session(dapp_service::session_key(user_storage) != @0x0);

    let canonical = dapp_service::canonical_owner(user_storage);
    let sk        = dapp_service::session_key(user_storage);
    let expires   = dapp_service::session_expires_at(user_storage);
    let expired   = expires > 0 && now_ms >= expires;

    error::no_permission(sender == canonical || sender == sk || expired);
    dapp_service::clear_session(user_storage);
}
