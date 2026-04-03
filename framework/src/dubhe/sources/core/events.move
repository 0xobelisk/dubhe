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

public struct DappSuspended has copy, drop {
    dapp_key: String,
}

public(package) fun emit_dapp_suspended(dapp_key: String) {
    event::emit(DappSuspended { dapp_key });
}

public struct DappUnsuspended has copy, drop {
    dapp_key: String,
}

public(package) fun emit_dapp_unsuspended(dapp_key: String) {
    event::emit(DappUnsuspended { dapp_key });
}

// ─── Settlement events ────────────────────────────────────────────────────────

public struct WritesSettled has copy, drop {
    dapp_key:        String,
    account:         address,
    writes:          u64,
    bytes:           u256,
    cost:            u256,
}

public(package) fun emit_writes_settled(
    dapp_key: String,
    account:  address,
    writes:   u64,
    bytes:    u256,
    cost:     u256,
) {
    event::emit(WritesSettled { dapp_key, account, writes, bytes, cost });
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
    dapp_key:          String,
    account:           address,
    settled_writes:    u64,
    settled_bytes:     u256,
    remaining_writes:  u64,
    remaining_bytes:   u256,
    cost:              u256,
}

public(package) fun emit_settlement_partial(
    dapp_key:         String,
    account:          address,
    settled_writes:   u64,
    settled_bytes:    u256,
    remaining_writes: u64,
    remaining_bytes:  u256,
    cost:             u256,
) {
    event::emit(SettlementPartial {
        dapp_key, account,
        settled_writes, settled_bytes,
        remaining_writes, remaining_bytes,
        cost,
    });
}

/// Emitted when a global write (set_global_record / set_global_field) is
/// charged immediately against the DApp credit pool.
public struct GlobalWriteCharged has copy, drop {
    dapp_key: String,
    bytes:    u256,
    cost:     u256,
}

public(package) fun emit_global_write_charged(dapp_key: String, bytes: u256, cost: u256) {
    event::emit(GlobalWriteCharged { dapp_key, bytes, cost });
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
    dapp_key:  String,
    canonical: address,
}

public(package) fun emit_session_deactivated(dapp_key: String, canonical: address) {
    event::emit(SessionDeactivated { dapp_key, canonical });
}

// ─── Credit events ────────────────────────────────────────────────────────────

public struct CreditRecharged has copy, drop {
    dapp_key: String,
    from:     address,
    amount:   u256,
}

public(package) fun emit_credit_recharged(dapp_key: String, from: address, amount: u256) {
    event::emit(CreditRecharged { dapp_key, from, amount });
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
