module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;

// ─── Storage events ───────────────────────────────────────────────────────────

public struct Dubhe_Store_SetRecord has copy, drop {
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
    value:    vector<vector<u8>>,
}

public(package) fun new_store_set_record(
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
    value:    vector<vector<u8>>,
): Dubhe_Store_SetRecord {
    Dubhe_Store_SetRecord { dapp_key, account, key, value }
}

/// Only dapp_service (same package) may emit storage events.
/// Making this package-internal prevents any external module from forging
/// arbitrary SetRecord events to poison the off-chain indexer.
public(package) fun emit_store_set_record(
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
    value:    vector<vector<u8>>,
) {
    event::emit(new_store_set_record(dapp_key, account, key, value));
}

public struct Dubhe_Store_SetField has copy, drop {
    dapp_key:    String,
    account:     String,
    key:         vector<vector<u8>>,
    field_name:  vector<u8>,
    field_value: vector<u8>,
}

public(package) fun emit_store_set_field(
    dapp_key:    String,
    account:     String,
    key:         vector<vector<u8>>,
    field_name:  vector<u8>,
    field_value: vector<u8>,
) {
    event::emit(Dubhe_Store_SetField { dapp_key, account, key, field_name, field_value });
}

public struct Dubhe_Store_DeleteRecord has copy, drop {
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
}

public(package) fun new_store_delete_record(
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
): Dubhe_Store_DeleteRecord {
    Dubhe_Store_DeleteRecord { dapp_key, account, key }
}

/// Only dapp_service (same package) may emit storage events.
public(package) fun emit_store_delete_record(
    dapp_key: String,
    account:  String,
    key:      vector<vector<u8>>,
) {
    event::emit(new_store_delete_record(dapp_key, account, key));
}

// ─── DApp lifecycle events ────────────────────────────────────────────────────

public struct DappCreated has copy, drop {
    dapp_key:   String,
    admin:      address,
    created_at: u64,
}

public(package) fun emit_dapp_created(dapp_key: String, admin: address, created_at: u64) {
    event::emit(DappCreated { dapp_key, admin, created_at });
}

// ─── Settlement events ────────────────────────────────────────────────────────

public struct WritesSettled has copy, drop {
    dapp_key:  String,
    account:   address,
    writes:    u64,
    bytes:     u256,
    /// Amount deducted from the DApp's virtual free_credit pool.
    free_cost: u256,
    /// Amount deducted from the DApp's paid credit_pool (real SUI).
    paid_cost: u256,
}

public(package) fun emit_writes_settled(
    dapp_key:  String,
    account:   address,
    writes:    u64,
    bytes:     u256,
    free_cost: u256,
    paid_cost: u256,
) {
    event::emit(WritesSettled { dapp_key, account, writes, bytes, free_cost, paid_cost });
}

public struct SettlementSkipped has copy, drop {
    dapp_key:         String,
    account:          address,
    unsettled_writes: u64,
    unsettled_bytes:  u256,
}

public(package) fun emit_settlement_skipped(
    dapp_key:         String,
    account:          address,
    unsettled_writes: u64,
    unsettled_bytes:  u256,
) {
    event::emit(SettlementSkipped { dapp_key, account, unsettled_writes, unsettled_bytes });
}

public struct SettlementPartial has copy, drop {
    dapp_key:         String,
    account:          address,
    settled_writes:   u64,
    settled_bytes:    u256,
    remaining_writes: u64,
    remaining_bytes:  u256,
    /// Amount deducted from free_credit for the settled portion.
    free_cost:        u256,
    /// Amount deducted from credit_pool for the settled portion.
    paid_cost:        u256,
}

public(package) fun emit_settlement_partial(
    dapp_key:         String,
    account:          address,
    settled_writes:   u64,
    settled_bytes:    u256,
    remaining_writes: u64,
    remaining_bytes:  u256,
    free_cost:        u256,
    paid_cost:        u256,
) {
    event::emit(SettlementPartial {
        dapp_key, account,
        settled_writes, settled_bytes,
        remaining_writes, remaining_bytes,
        free_cost, paid_cost,
    });
}

// ─── Free credit events ───────────────────────────────────────────────────────

public struct FreeCreditGranted has copy, drop {
    dapp_key:   String,
    amount:     u256,
    expires_at: u64,
    granted_by: address,
}

public(package) fun emit_free_credit_granted(
    dapp_key:   String,
    amount:     u256,
    expires_at: u64,
    granted_by: address,
) {
    event::emit(FreeCreditGranted { dapp_key, amount, expires_at, granted_by });
}

public struct FreeCreditRevoked has copy, drop {
    dapp_key:         String,
    amount_remaining: u256,
    revoked_by:       address,
}

public(package) fun emit_free_credit_revoked(
    dapp_key:         String,
    amount_remaining: u256,
    revoked_by:       address,
) {
    event::emit(FreeCreditRevoked { dapp_key, amount_remaining, revoked_by });
}

public struct FreeCreditExtended has copy, drop {
    dapp_key:       String,
    new_expires_at: u64,
    extended_by:    address,
}

public(package) fun emit_free_credit_extended(
    dapp_key:       String,
    new_expires_at: u64,
    extended_by:    address,
) {
    event::emit(FreeCreditExtended { dapp_key, new_expires_at, extended_by });
}

// ─── Session key events ───────────────────────────────────────────────────────

public struct SessionActivated has copy, drop {
    dapp_key:       String,
    canonical:      address,
    session_wallet: address,
    expires_at:     u64,
}

public(package) fun emit_session_activated(
    dapp_key:       String,
    canonical:      address,
    session_wallet: address,
    expires_at:     u64,
) {
    event::emit(SessionActivated { dapp_key, canonical, session_wallet, expires_at });
}

public struct SessionDeactivated has copy, drop {
    dapp_key:    String,
    canonical:   address,
    session_key: address,
}

public(package) fun emit_session_deactivated(
    dapp_key:    String,
    canonical:   address,
    session_key: address,
) {
    event::emit(SessionDeactivated { dapp_key, canonical, session_key });
}

// ─── Credit events ────────────────────────────────────────────────────────────

public struct CreditRecharged has copy, drop {
    dapp_key:  String,
    from:      address,
    coin_type: String,
    amount:    u256,
}

public(package) fun emit_credit_recharged(
    dapp_key:  String,
    from:      address,
    coin_type: String,
    amount:    u256,
) {
    event::emit(CreditRecharged { dapp_key, from, coin_type, amount });
}

// ─── Fee events ───────────────────────────────────────────────────────────────

public struct FeeUpdated has copy, drop {
    new_base_fee:  u256,
    new_bytes_fee: u256,
    at_ms:         u64,
}

public(package) fun emit_fee_updated(new_base_fee: u256, new_bytes_fee: u256, at_ms: u64) {
    event::emit(FeeUpdated { new_base_fee, new_bytes_fee, at_ms });
}

public struct FeeUpdateScheduled has copy, drop {
    pending_base_fee:  u256,
    pending_bytes_fee: u256,
    effective_at_ms:   u64,
}

public(package) fun emit_fee_update_scheduled(
    pending_base_fee:  u256,
    pending_bytes_fee: u256,
    effective_at_ms:   u64,
) {
    event::emit(FeeUpdateScheduled { pending_base_fee, pending_bytes_fee, effective_at_ms });
}

// ─── Coin type events ─────────────────────────────────────────────────────────

public struct CoinTypeChangeProposed has copy, drop {
    new_coin_type:   String,
    effective_at_ms: u64,
}

public(package) fun emit_coin_type_change_proposed(new_coin_type: String, effective_at_ms: u64) {
    event::emit(CoinTypeChangeProposed { new_coin_type, effective_at_ms });
}

public struct CoinTypeChanged has copy, drop {
    new_coin_type: String,
}

public(package) fun emit_coin_type_changed(new_coin_type: String) {
    event::emit(CoinTypeChanged { new_coin_type });
}

// ─── Settlement mode events ───────────────────────────────────────────────────

public struct DappRevenueWithdrawn has copy, drop {
    dapp_key:  String,
    admin:     address,
    coin_type: String,
    amount:    u64,
}

public(package) fun emit_dapp_revenue_withdrawn(
    dapp_key:  String,
    admin:     address,
    coin_type: String,
    amount:    u64,
) {
    event::emit(DappRevenueWithdrawn { dapp_key, admin, coin_type, amount });
}

public struct SettlementModeChanged has copy, drop {
    dapp_key: String,
    old_mode: u8,
    new_mode: u8,
}

public(package) fun emit_settlement_mode_changed(dapp_key: String, old_mode: u8, new_mode: u8) {
    event::emit(SettlementModeChanged { dapp_key, old_mode, new_mode });
}

/// Emitted when framework admin sets the revenue share for a specific DApp.
public struct DappRevenueShareSet has copy, drop {
    dapp_key: String,
    new_bps:  u64,
}

public(package) fun emit_dapp_revenue_share_set(dapp_key: String, new_bps: u64) {
    event::emit(DappRevenueShareSet { dapp_key, new_bps });
}

/// Emitted when framework admin updates the global default DApp revenue share.
public struct DefaultRevenueShareUpdated has copy, drop {
    new_bps: u64,
}

public(package) fun emit_default_revenue_share_updated(new_bps: u64) {
    event::emit(DefaultRevenueShareUpdated { new_bps });
}

/// Emitted when a DApp's package list and version are updated via upgrade_dapp.
public struct DappUpgraded has copy, drop {
    dapp_key:       String,
    new_package_id: address,
    new_version:    u32,
    admin:          address,
}

public(package) fun emit_dapp_upgraded(
    dapp_key:       String,
    new_package_id: address,
    new_version:    u32,
    admin:          address,
) {
    event::emit(DappUpgraded { dapp_key, new_package_id, new_version, admin });
}

/// Emitted when the framework admin changes the global max write limit.
public struct FrameworkMaxWriteLimitUpdated has copy, drop {
    new_limit: u64,
    admin:     address,
}

public(package) fun emit_framework_max_write_limit_updated(new_limit: u64, admin: address) {
    event::emit(FrameworkMaxWriteLimitUpdated { new_limit, admin });
}

/// Emitted when the framework admin updates the default free credit for future new DApps.
public struct DefaultFreeCreditUpdated has copy, drop {
    new_amount:      u256,
    new_duration_ms: u64,
    updated_by:      address,
}

public(package) fun emit_default_free_credit_updated(
    new_amount:      u256,
    new_duration_ms: u64,
    updated_by:      address,
) {
    event::emit(DefaultFreeCreditUpdated { new_amount, new_duration_ms, updated_by });
}
public struct UserWriteLimitSynced has copy, drop {
    dapp_key:  String,
    owner:     address,
    new_limit: u64,
}

public(package) fun emit_user_write_limit_synced(dapp_key: String, owner: address, new_limit: u64) {
    event::emit(UserWriteLimitSynced { dapp_key, owner, new_limit });
}
