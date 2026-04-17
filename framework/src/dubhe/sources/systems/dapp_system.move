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
use std::option;

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

/// Maximum unsettled write count per user before settlement is required.
/// Prevents unbounded debt accumulation without needing fee rate lookups at write time.
/// To change this limit, update this constant and perform a package upgrade.
const MAX_UNSETTLED_WRITES: u64 = 1_000;

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
    error::dapp_already_initialized(!dapp_service::is_dapp_genesis_done<DappKey>(dapp_hub));

    let dapp_key_str = type_info::get_type_name_string<DappKey>();

    // Read default free credit from framework config and apply to the new DApp.
    let cfg         = dapp_service::get_config(dapp_hub);
    let free_amount = dapp_service::default_free_credit(cfg);
    let duration_ms = dapp_service::default_free_credit_duration_ms(cfg);
    let created_at  = clock::timestamp_ms(clock);
    let expires_at  = if (duration_ms > 0) { created_at + duration_ms } else { 0 };
    let default_mode = dapp_service::default_settlement_mode(cfg);

    let admin       = ctx.sender();
    let package_ids = vector[type_info::get_package_id<DappKey>()];

    // Copy the current effective fee rates from DappHub into the new DappStorage.
    // These become the per-DApp rates used by settle_writes and charge_global_write.
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
        default_mode,
        0,
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
    error::dapp_suspended(!dapp_service::is_suspended(dapp_storage));
    let sender = ctx.sender();
    error::user_storage_already_exists(!dapp_service::has_registered_user_storage(dapp_storage, sender));
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
/// - `user_storage` must belong to the correct DApp (dapp_key must match).
/// - Caller must be the current owner (canonical_owner or active session key).
/// - Unsettled write count must be below MAX_UNSETTLED_WRITES (updatable via package upgrade).
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
    // unsettled write count reaches MAX_UNSETTLED_WRITES. Using a pure count
    // avoids reading fee rates at write time.
    error::user_debt_limit_exceeded(dapp_service::unsettled_count(user_storage) < MAX_UNSETTLED_WRITES);

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
/// Unsettled write count must be below MAX_UNSETTLED_WRITES (updatable via package upgrade).
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

    error::user_debt_limit_exceeded(dapp_service::unsettled_count(user_storage) < MAX_UNSETTLED_WRITES);

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
/// The write charge is computed from hardcoded fee constants and immediately
/// deducted from the DApp credit pool.
/// Aborts with `insufficient_credit_error` when credit is 0 and fee > 0.
/// (When fee == 0 the call is free and the credit check is skipped.)
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    // Immediate credit deduction — global writes are synchronous.
    let data_bytes = if (offchain) { 0u256 } else { compute_values_bytes(&values) };
    charge_global_write(dapp_storage, data_bytes, dapp_key_str, ctx);

    dapp_service::set_global_record<DappKey>(dapp_storage, key, field_names, values, offchain, ctx);
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

/// Update a single named field within a DappStorage global record.
/// `_auth` enforces that only the DApp's own package code can invoke this function.
/// Charges are deducted immediately from the DApp credit pool using hardcoded fee constants.
public fun set_global_field<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    key:          vector<vector<u8>>,
    field_name:   vector<u8>,
    field_value:  vector<u8>,
    ctx:          &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let data_bytes = (field_value.length() as u256);
    charge_global_write(dapp_storage, data_bytes, dapp_key_str, ctx);

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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    let unsettled_writes = dapp_service::unsettled_count(user_storage);
    let unsettled_bytes  = dapp_service::unsettled_bytes(user_storage);
    if (unsettled_writes == 0 && unsettled_bytes == 0) { return };

    // Branch on settlement mode — USER_PAYS uses user_credit_pool accounting.
    let mode = dapp_service::settlement_mode(dapp_storage);
    if (mode == SETTLEMENT_USER) {
        settle_writes_user_pays<DappKey>(dapp_storage, user_storage, dapp_key_str, unsettled_writes, unsettled_bytes);
        return
    };
    // else: fall through to existing DAPP_SUBSIDIZES logic (unchanged).

    let now_ms    = ctx.epoch_timestamp_ms();
    // Read per-DApp fee rates from DappStorage (set by framework admin via
    // set_dapp_fee or synced via sync_dapp_fee from DappHub defaults).
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
    // Effective free credit (0 if expired).
    let eff_free       = dapp_service::effective_free_credit(dapp_storage, now_ms);
    // Total budget: free credit consumed first, then paid credit.
    let total_available = eff_free + dapp_service::credit_pool(dapp_storage);

    if (total_available == 0) {
        dubhe_events::emit_settlement_skipped(
            dapp_key_str, account, unsettled_writes, unsettled_bytes,
        );
        return
    };

    // How much of total_cost can we cover?
    let cost_to_cover = if (total_available >= total_cost) { total_cost } else { total_available };

    // Split cost_to_cover between free credit (first) and paid credit (remainder).
    let free_used = if (eff_free >= cost_to_cover) { cost_to_cover } else { eff_free };
    let paid_used = cost_to_cover - free_used;

    if (free_used > 0) { dapp_service::deduct_free_credit(dapp_storage, free_used); };
    if (paid_used > 0) {
        dapp_service::deduct_credit(dapp_storage, paid_used);
        dapp_service::add_total_settled(dapp_storage, paid_used);
    };

    if (total_available >= total_cost) {
        // Full settlement.
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(
            dapp_key_str, account, unsettled_writes, unsettled_bytes, free_used, paid_used,
        );
        dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
    } else {
        // Partial settlement: advance settled counters proportionally.
        //
        // settled_writes = floor(total_available × unsettled_writes / total_cost)
        // settled_bytes  = floor(total_available × unsettled_bytes  / total_cost)
        //
        // Using integer arithmetic; small rounding loss is acceptable and does not leak credit.
        let settled_writes = ((total_available * (unsettled_writes as u256)) / total_cost) as u64;
        let settled_bytes  = (total_available * unsettled_bytes) / total_cost;

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

/// Internal: settle write debt from the user's pre-deposited credit pool (USER_PAYS mode).
/// Coins were already distributed at deposit time; this function adjusts accounting only.
/// Mirrors the full/partial/skip logic of the DAPP_SUBSIDIZES path but draws from
/// user_credit_pool instead of credit_pool.
fun settle_writes_user_pays<DappKey: copy + drop>(
    dapp_storage:    &mut DappStorage,
    user_storage:    &mut UserStorage,
    dapp_key_str:    std::ascii::String,
    unsettled_writes: u64,
    unsettled_bytes:  u256,
) {
    let base_fee  = dapp_service::dapp_base_fee_per_write(dapp_storage);
    let bytes_fee = dapp_service::dapp_bytes_fee_per_byte(dapp_storage);
    let account   = dapp_service::canonical_owner(user_storage);

    // Free-tier: mark settled at no cost.
    if (base_fee == 0 && bytes_fee == 0) {
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, 0);
        return
    };

    let total_cost      = base_fee * (unsettled_writes as u256) + bytes_fee * unsettled_bytes;
    let total_available = dapp_service::user_credit_pool(user_storage);

    if (total_available == 0) {
        dubhe_events::emit_settlement_skipped(
            dapp_key_str, account, unsettled_writes, unsettled_bytes,
        );
        return
    };

    let cost_to_cover = if (total_available >= total_cost) { total_cost } else { total_available };
    dapp_service::deduct_user_credit_pool(user_storage, cost_to_cover);
    dapp_service::add_total_settled(dapp_storage, cost_to_cover);

    if (total_available >= total_cost) {
        dapp_service::set_settled_to_write(user_storage);
        dubhe_events::emit_writes_settled(dapp_key_str, account, unsettled_writes, unsettled_bytes, 0, cost_to_cover);
        dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
    } else {
        let settled_writes = ((total_available * (unsettled_writes as u256)) / total_cost) as u64;
        let settled_bytes  = (total_available * unsettled_bytes) / total_cost;
        dapp_service::add_settled_count(user_storage, settled_writes);
        dapp_service::add_settled_bytes(user_storage, settled_bytes);
        dubhe_events::emit_settlement_partial(
            dapp_key_str, account,
            settled_writes, settled_bytes,
            unsettled_writes - settled_writes,
            unsettled_bytes  - settled_bytes,
            0, cost_to_cover,
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
    user_storage:  &mut UserStorage,
    session_wallet: address,
    duration_ms:    u64,
    clock:          &Clock,
    ctx:            &mut TxContext,
) {
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
    user_storage: &mut UserStorage,
    ctx:          &mut TxContext,
) {
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
    dubhe_events::emit_session_deactivated(dapp_key_str, canonical);
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
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    // Verify the caller is paying with the currently accepted coin type.
    // type_name::get<CoinType>() is VM-generated from the actual type parameter and
    // includes the full package ID, so it cannot be spoofed via string manipulation.
    let cfg = dapp_service::get_fee_config(dh);
    let accepted = dapp_service::accepted_coin_type(cfg);
    error::wrong_payment_coin_type(
        option::is_some(accepted) && *option::borrow(accepted) == type_name::get<CoinType>()
    );

    let amount = coin::value(&payment) as u256;
    let treasury = dapp_service::treasury(cfg);
    transfer::public_transfer(payment, treasury);

    dapp_service::add_credit(dapp_storage, amount);

    dubhe_events::emit_credit_recharged(
        dapp_key_str,
        ctx.sender(),
        type_name::get<CoinType>().into_string(),
        amount,
    );
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

// ─── USER_PAYS mode — user deposit and DApp revenue withdrawal ────────────────

/// Deposit coins as user credit for a DApp operating in USER_PAYS mode.
/// The payment is split immediately at deposit time:
///   - framework_share = total × (10000 - dapp_revenue_share_bps) / 10000 → treasury
///   - dapp_share      = total × dapp_revenue_share_bps / 10000            → DappStorage Balance
///   - user_credit_pool += total (accounting only; coins already distributed)
///
/// Only callable when the DApp's settlement_mode == SETTLEMENT_USER.
/// The accepted coin type is validated the same way as recharge_credit.
public fun deposit_user_credit<DappKey: copy + drop, CoinType>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    user_storage: &mut UserStorage,
    mut payment:  Coin<CoinType>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Must be in USER_PAYS mode.
    error::wrong_settlement_mode(dapp_service::settlement_mode(dapp_storage) == SETTLEMENT_USER);

    // Validate coin type.
    let cfg = dapp_service::get_fee_config(dh);
    let accepted = dapp_service::accepted_coin_type(cfg);
    error::wrong_payment_coin_type(
        option::is_some(accepted) && *option::borrow(accepted) == type_name::get<CoinType>()
    );

    let total         = coin::value(&payment) as u256;
    let share_bps     = dapp_service::dapp_revenue_share_bps(dapp_storage) as u256;
    let dapp_amount   = (total * share_bps / 10000) as u64;
    let fw_amount     = coin::value(&payment) - dapp_amount;
    let treasury      = dapp_service::treasury(cfg);

    // Transfer framework share to treasury.
    let fw_coin = coin::split(&mut payment, fw_amount, ctx);
    transfer::public_transfer(fw_coin, treasury);

    // Store dapp share as Balance<CoinType> on DappStorage.
    let dapp_bal = coin::into_balance(payment);
    dapp_service::add_dapp_revenue<CoinType>(dapp_storage, dapp_bal);

    // Credit user's accounting pool.
    dapp_service::add_user_credit_pool(user_storage, total);

    dubhe_events::emit_user_credit_deposited(
        dapp_key_str,
        ctx.sender(),
        type_name::get<CoinType>().into_string(),
        total,
        fw_amount as u256,
        dapp_amount as u256,
    );
}

/// DApp admin: withdraw all accumulated DApp revenue to their wallet.
/// Only callable by the DApp admin. Aborts if there is no revenue to withdraw.
public fun withdraw_dapp_revenue<DappKey: copy + drop, CoinType>(
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());

    let bal = dapp_service::take_dapp_revenue<CoinType>(dapp_storage);
    let amount = balance::value(&bal);
    error::no_revenue_to_withdraw(amount > 0);

    let admin = ctx.sender();
    transfer::public_transfer(coin::from_balance(bal, ctx), admin);

    dubhe_events::emit_dapp_revenue_withdrawn(
        dapp_key_str,
        admin,
        type_name::get<CoinType>().into_string(),
        amount,
    );
}

/// DApp admin: configure settlement mode and revenue share.
///
/// Switching rules:
///   DAPP_SUBSIDIZES(0) → USER_PAYS(1): allowed; credit_pool is kept (no refund).
///   USER_PAYS(1) → DAPP_SUBSIDIZES(0): aborts with cannot_downgrade_settlement_mode.
///   USER_PAYS(1) → USER_PAYS(1): only updates dapp_revenue_share_bps.
///
/// `dapp_revenue_share_bps` is validated against framework max_dapp_revenue_share_bps.
public fun set_dapp_settlement_config<DappKey: copy + drop>(
    dh:                     &DappHub,
    dapp_storage:           &mut DappStorage,
    mode:                   u8,
    dapp_revenue_share_bps: u64,
    ctx:                    &TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());

    // Validate revenue share against framework maximum.
    let max_bps = dapp_service::max_dapp_revenue_share_bps(dapp_service::get_config(dh));
    error::revenue_share_exceeds_max(dapp_revenue_share_bps <= max_bps);

    let old_mode = dapp_service::settlement_mode(dapp_storage);

    // Downgrade is forbidden.
    error::cannot_downgrade_settlement_mode(!(old_mode == SETTLEMENT_USER && mode == SETTLEMENT_DAPP));

    dapp_service::set_settlement_mode(dapp_storage, mode);
    dapp_service::set_dapp_revenue_share_bps(dapp_storage, dapp_revenue_share_bps);

    dubhe_events::emit_settlement_mode_changed(dapp_key_str, old_mode, mode, dapp_revenue_share_bps);
}

/// Framework admin: update the maximum DApp revenue share (basis points).
///
/// - `new_max > current`  → immediate (framework gets less protection, DApps benefit).
/// - `new_max == current` → no-op but still emits event.
/// - `new_max < current`  → scheduled with 48h delay (reducing DApp share hurts DApps).
public fun update_max_revenue_share(
    dh:      &mut DappHub,
    new_max: u64,
    clock:   &Clock,
    ctx:     &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );

    let now = clock::timestamp_ms(clock);

    // Commit any matured pending max share first.
    {
        let cfg = dapp_service::get_config_mut(dh);
        let effective_at = dapp_service::max_share_effective_at_ms(cfg);
        if (effective_at > 0 && now >= effective_at) {
            let pending = dapp_service::pending_max_dapp_revenue_share_bps(cfg);
            dapp_service::set_max_dapp_revenue_share_bps(cfg, pending);
            dapp_service::set_pending_max_dapp_revenue_share_bps(cfg, 0);
            dapp_service::set_max_share_effective_at_ms(cfg, 0);
        };
    };

    let cfg = dapp_service::get_config_mut(dh);
    let current = dapp_service::max_dapp_revenue_share_bps(cfg);

    if (new_max >= current) {
        // Increase or no-change: apply immediately.
        dapp_service::set_max_dapp_revenue_share_bps(cfg, new_max);
        dapp_service::set_pending_max_dapp_revenue_share_bps(cfg, 0);
        dapp_service::set_max_share_effective_at_ms(cfg, 0);
        dubhe_events::emit_max_revenue_share_changed(new_max);
    } else {
        // Decrease: schedule with 48h delay.
        let effective_at_ms = now + MIN_FEE_INCREASE_DELAY_MS;
        dapp_service::set_pending_max_dapp_revenue_share_bps(cfg, new_max);
        dapp_service::set_max_share_effective_at_ms(cfg, effective_at_ms);
        dubhe_events::emit_max_revenue_share_update_scheduled(new_max, effective_at_ms);
    };
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    error::no_permission(admin == ctx.sender());

    dapp_service::set_suspended(dapp_storage, true);
    dubhe_events::emit_dapp_suspended(dapp_key_str);
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
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
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let admin = dapp_service::framework_admin(dapp_service::get_config(dh));
    error::no_permission(admin == ctx.sender());

    // Effective credit = non-expired free credit + paid credit_pool.
    // A DApp with valid free credit may be unsuspended even with zero credit_pool.
    let now_ms   = ctx.epoch_timestamp_ms();
    let eff_total = dapp_service::effective_total_credit(dapp_storage, now_ms);
    let min_req  = dapp_service::min_credit_to_unsuspend(dapp_storage);
    if (min_req > 0) {
        error::insufficient_credit_to_unsuspend(eff_total >= min_req);
    } else {
        error::insufficient_credit_to_unsuspend(eff_total > 0);
    };

    dapp_service::set_suspended(dapp_storage, false);
    dubhe_events::emit_dapp_unsuspended(dapp_key_str);
    dapp_service::emit_fee_state_record<DappKey>(dapp_storage);
}

// ─── DApp configuration ───────────────────────────────────────────────────────

/// DApp admin: configure the minimum credit required to unsuspend this DApp.
///
/// - `min_credit_to_unsuspend`: minimum credit required to unsuspend via
///   unsuspend_dapp. 0 means any credit > 0 is sufficient.
///
/// Note: The per-user unsettled write limit (max_unsettled_writes) is a
/// hardcoded package constant (MAX_UNSETTLED_WRITES) and can only be changed
/// via a package upgrade — it is not configurable per-DApp.
public fun set_dapp_config<DappKey: copy + drop>(
    _auth:                   DappKey,
    dapp_storage:            &mut DappStorage,
    min_credit_to_unsuspend: u256,
    ctx:                     &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());

    dapp_service::set_min_credit_to_unsuspend(dapp_storage, min_credit_to_unsuspend);
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
    dh:            &mut DappHub,
    base_fee:      u256,
    bytes_fee:     u256,
    treasury:      address,
    _ctx:          &mut TxContext,
) {
    if (dapp_service::is_fee_config_initialized(dh)) { return };

    let cfg = dapp_service::get_fee_config_mut(dh);
    dapp_service::set_base_fee_per_write(cfg, base_fee);
    dapp_service::set_bytes_fee_per_byte(cfg, bytes_fee);
    dapp_service::set_treasury(cfg, treasury);
    dapp_service::set_accepted_coin_type(cfg, type_name::get<CoinType>());
}

/// Initialise settlement config defaults (called once from deploy_hook).
/// Silently skips if max_dapp_revenue_share_bps is already non-zero.
public(package) fun initialize_settlement_config(
    dh:                     &mut DappHub,
    max_dapp_revenue_share_bps: u64,
    default_settlement_mode:    u8,
    _ctx:                   &mut TxContext,
) {
    let cfg = dapp_service::get_config_mut(dh);
    // Idempotent: skip if already initialized (non-zero means it's been set).
    if (dapp_service::max_dapp_revenue_share_bps(cfg) > 0) { return };
    dapp_service::set_max_dapp_revenue_share_bps(cfg, max_dapp_revenue_share_bps);
    dapp_service::set_default_settlement_mode(cfg, default_settlement_mode);
}

/// Update both fee components atomically.
///
/// If EITHER new_base_fee > current_base_fee OR new_bytes_fee > current_bytes_fee,
/// the update is scheduled with a 48-hour delay (pending mechanism).
/// Pure decreases (both components ≤ current) are applied immediately.
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

    // Commit any matured pending fees first.
    {
        let cfg          = dapp_service::get_fee_config_mut(dh);
        let effective_at = dapp_service::fee_effective_at_ms(cfg);
        if (effective_at > 0 && now >= effective_at) {
            let pb = dapp_service::pending_base_fee(cfg);
            let py = dapp_service::pending_bytes_fee(cfg);
            if (pb > 0) { dapp_service::set_base_fee_per_write(cfg, pb) };
            if (py > 0) { dapp_service::set_bytes_fee_per_byte(cfg, py) };
            dapp_service::set_pending_base_fee(cfg, 0);
            dapp_service::set_pending_bytes_fee(cfg, 0);
            dapp_service::set_fee_effective_at_ms(cfg, 0);
        };
    };

    let cfg          = dapp_service::get_fee_config_mut(dh);
    let cur_base     = dapp_service::base_fee_per_write(cfg);
    let cur_bytes    = dapp_service::bytes_fee_per_byte(cfg);
    let any_increase = new_base_fee > cur_base || new_bytes_fee > cur_bytes;

    if (!any_increase) {
        // Both components are same or decreasing — apply immediately.
        dapp_service::set_base_fee_per_write(cfg, new_base_fee);
        dapp_service::set_bytes_fee_per_byte(cfg, new_bytes_fee);
        dapp_service::set_pending_base_fee(cfg, 0);
        dapp_service::set_pending_bytes_fee(cfg, 0);
        dapp_service::set_fee_effective_at_ms(cfg, 0);
        dapp_service::push_fee_history(cfg, new_base_fee, new_bytes_fee, now);
        dubhe_events::emit_fee_updated(new_base_fee, new_bytes_fee, now);
    } else {
        // At least one component is increasing — schedule with 48-hour delay.
        let effective_at_ms = now + MIN_FEE_INCREASE_DELAY_MS;
        dapp_service::set_pending_base_fee(cfg, new_base_fee);
        dapp_service::set_pending_bytes_fee(cfg, new_bytes_fee);
        dapp_service::set_fee_effective_at_ms(cfg, effective_at_ms);
        dubhe_events::emit_fee_update_scheduled(new_base_fee, new_bytes_fee, effective_at_ms);
    };
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
    if ((pb > 0 || py > 0) && effective_at > 0 && now_ms >= effective_at) {
        (pb, py)
    } else {
        (
            dapp_service::base_fee_per_write(cfg),
            dapp_service::bytes_fee_per_byte(cfg),
        )
    }
}

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
    let cfg = dapp_service::get_fee_config_mut(dh);
    let pending = dapp_service::pending_treasury(cfg);
    error::no_pending_ownership_transfer(pending != @0x0);
    error::no_permission(pending == ctx.sender());
    dapp_service::set_treasury(cfg, pending);
    dapp_service::set_pending_treasury(cfg, @0x0);
}

// ─── Payment coin type management ────────────────────────────────────────────
//
// The accepted coin type for credit recharges can be changed by the treasury
// using a two-step process with a 48-hour mandatory delay.  This prevents
// surprise migrations and gives DApp operators time to update their recharge
// flows before the old coin type stops being accepted.
//
// Step 1  treasury calls propose_coin_type<NewCoinType> — schedules the change.
// Step 2  treasury calls accept_coin_type after the delay — commits the change.
//
// The treasury (rather than the admin) controls this because it directly
// determines what token flows into the treasury wallet.

/// Step 1: Treasury schedules a payment coin type change with a 48-hour delay.
/// Emits CoinTypeChangeProposed so off-chain systems can prepare.
/// Calling again before the delay has elapsed replaces the pending change.
public fun propose_coin_type<NewCoinType>(
    dh:    &mut DappHub,
    clock: &Clock,
    ctx:   &TxContext,
) {
    assert_framework_version(dh);

    let cfg = dapp_service::get_fee_config_mut(dh);
    error::no_permission(dapp_service::treasury(cfg) == ctx.sender());

    let effective_at_ms = clock::timestamp_ms(clock) + MIN_FEE_INCREASE_DELAY_MS;
    dapp_service::set_pending_coin_type(cfg, option::some(type_name::get<NewCoinType>()));
    dapp_service::set_coin_type_effective_at_ms(cfg, effective_at_ms);

    dubhe_events::emit_coin_type_change_proposed(
        type_name::get<NewCoinType>().into_string(),
        effective_at_ms,
    );
}

/// Step 2: Treasury commits the pending coin type change after the delay.
/// Aborts if there is no pending change or the delay has not elapsed yet.
public fun accept_coin_type(
    dh:    &mut DappHub,
    clock: &Clock,
    ctx:   &TxContext,
) {
    assert_framework_version(dh);

    let cfg = dapp_service::get_fee_config_mut(dh);
    error::no_permission(dapp_service::treasury(cfg) == ctx.sender());

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

/// Set the per-write and per-byte fee rates for a specific DApp.
/// Only the framework admin (stored in DappHub.config.admin) may call this.
/// Use this for precise per-DApp control that differs from the DappHub default.
/// To apply the current DappHub default to a DApp, use sync_dapp_fee instead.
public fun set_dapp_fee<DappKey: copy + drop>(
    dh:        &DappHub,
    ds:        &mut DappStorage,
    base_fee:  u256,
    bytes_fee: u256,
    ctx:       &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(ds) == dapp_key_str);
    dapp_service::set_dapp_base_fee_per_write(ds, base_fee);
    dapp_service::set_dapp_bytes_fee_per_byte(ds, bytes_fee);
    dapp_service::emit_fee_state_record<DappKey>(ds);
}

/// Pull the current DappHub effective fee rates into a DappStorage.
/// Permissionless: any caller may trigger a sync to keep a DApp's rates
/// aligned with the latest framework defaults after update_framework_fee.
/// Typical usage: call update_framework_fee(dh, ...) once, then call
/// sync_dapp_fee(dh, ds) for each DApp to propagate the new rates.
public fun sync_dapp_fee<DappKey: copy + drop>(
    dh: &DappHub,
    ds: &mut DappStorage,
) {
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
    dapp_storage: &mut DappStorage,
    name:         String,
    description:  String,
    website_url:  String,
    cover_url:    vector<String>,
    partners:     vector<String>,
    ctx:          &mut TxContext,
) {
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
    dapp_storage: &mut DappStorage,
    new_admin:    address,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::no_permission(dapp_service::dapp_admin(dapp_storage) == ctx.sender());
    dapp_service::set_dapp_pending_admin(dapp_storage, new_admin);
}

/// Step 2 of the two-step DApp admin transfer.
public fun accept_ownership<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
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
    dapp_storage:   &mut DappStorage,
    new_package_id: address,
    new_version:    u32,
    ctx:            &mut TxContext,
) {
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
}

/// DApp admin: toggle the paused flag.
/// When paused == true, ensure_not_paused aborts and the DApp is effectively halted.
public fun set_paused<DappKey: copy + drop>(
    dapp_storage: &mut DappStorage,
    paused:       bool,
    ctx:          &mut TxContext,
) {
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
    type_name::get<DappKey>().into_string()
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

/// Immediate global-write charge deduction (for set_global_record / set_global_field).
/// Uses per-DApp fee rates stored in DappStorage (set by framework admin via
/// set_dapp_fee or synced via sync_dapp_fee).
/// Consumes free_credit first, then credit_pool.
/// Aborts with insufficient_credit_error if combined effective credit < charge.
fun charge_global_write(
    ds:           &mut DappStorage,
    data_bytes:   u256,
    dapp_key_str: std::ascii::String,
    ctx:          &TxContext,
) {
    let now_ms    = ctx.epoch_timestamp_ms();
    let base_fee  = dapp_service::dapp_base_fee_per_write(ds);
    let bytes_fee = dapp_service::dapp_bytes_fee_per_byte(ds);
    let charge = base_fee + bytes_fee * data_bytes;
    if (charge == 0) { return };

    let eff_free = dapp_service::effective_free_credit(ds, now_ms);
    error::insufficient_credit(eff_free + dapp_service::credit_pool(ds) >= charge);

    let free_used = if (eff_free >= charge) { charge } else { eff_free };
    let paid_used = charge - free_used;
    if (free_used > 0) { dapp_service::deduct_free_credit(ds, free_used); };
    if (paid_used > 0) {
        dapp_service::deduct_credit(ds, paid_used);
        dapp_service::add_total_settled(ds, paid_used);
    };
    dubhe_events::emit_global_write_charged(dapp_key_str, data_bytes, free_used, paid_used);
}


// ─── Test helpers ─────────────────────────────────────────────────────────────

#[test_only]
public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
    dapp_service::create_dapp_hub_for_testing(ctx)
}

#[test_only]
public fun create_dapp_storage_for_testing<DappKey: copy + drop>(ctx: &mut TxContext): DappStorage {
    // free_credit=0, expires_at=0, base_fee=0, bytes_fee=0 so tests are not affected
    // by free-credit or fee logic unless explicitly set via set_dapp_fee.
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
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    error::no_active_session(dapp_service::session_key(user_storage) != @0x0);

    let canonical = dapp_service::canonical_owner(user_storage);
    let sk        = dapp_service::session_key(user_storage);
    let expires   = dapp_service::session_expires_at(user_storage);
    let expired   = expires > 0 && now_ms >= expires;

    error::no_permission(sender == canonical || sender == sk || expired);
    dapp_service::clear_session(user_storage);
}
