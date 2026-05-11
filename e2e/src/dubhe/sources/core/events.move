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

public struct Dubhe_Store_DeleteField has copy, drop {
    dapp_key:   String,
    account:    String,
    key:        vector<vector<u8>>,
    field_name: vector<u8>,
}

public(package) fun emit_store_delete_field(
    dapp_key:   String,
    account:    String,
    key:        vector<vector<u8>>,
    field_name: vector<u8>,
) {
    event::emit(Dubhe_Store_DeleteField { dapp_key, account, key, field_name });
}

// ─── DApp lifecycle events ────────────────────────────────────────────────────

public struct DappCreated has copy, drop {
    dapp_key:        String,
    admin:           address,
    created_at:      u64,
    dapp_storage_id: address,
}

public(package) fun emit_dapp_created(
    dapp_key:        String,
    admin:           address,
    created_at:      u64,
    dapp_storage_id: address,
) {
    event::emit(DappCreated { dapp_key, admin, created_at, dapp_storage_id });
}

public struct DappPausedChanged has copy, drop {
    dapp_key:   String,
    paused:     bool,
    updated_by: address,
}

public(package) fun emit_dapp_paused_changed(
    dapp_key:   String,
    paused:     bool,
    updated_by: address,
) {
    event::emit(DappPausedChanged { dapp_key, paused, updated_by });
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

// ─── Marketplace events ───────────────────────────────────────────────────────

/// Emitted when any item is placed into a Listing (unique or fungible).
public struct ItemListed has copy, drop {
    dapp_key:     String,
    listing_id:   address,
    seller:       address,
    record_type:  vector<u8>,
    record_key:   vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    /// Field values stored in the listing (one inner vector per field, each BCS-encoded).
    record_data:  vector<vector<u8>>,
    price:        u64,
    coin_type:    String,
    is_fungible:  bool,
    listed_until: Option<u64>,
}

public(package) fun emit_item_listed(
    dapp_key:     String,
    listing_id:   address,
    seller:       address,
    record_type:  vector<u8>,
    record_key:   vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    record_data:  vector<vector<u8>>,
    price:        u64,
    coin_type:    String,
    is_fungible:  bool,
    listed_until: Option<u64>,
) {
    event::emit(ItemListed {
        dapp_key,
        listing_id,
        seller,
        record_type,
        record_key,
        field_names,
        record_data,
        price,
        coin_type,
        is_fungible,
        listed_until,
    });
}

/// Emitted by settle_marketplace_fee after each successful purchase.
/// Captures the exact fee split between the framework treasury and the DApp revenue pool,
/// providing a complete on-chain audit trail for marketplace income.
public struct MarketplaceFeeSettled has copy, drop {
    dapp_key:        String,
    listing_id:      address,
    coin_type:       String,
    total_fee:       u64,
    treasury_amount: u64,
    dapp_amount:     u64,
}

public(package) fun emit_marketplace_fee_settled(
    dapp_key:        String,
    listing_id:      address,
    coin_type:       String,
    total_fee:       u64,
    treasury_amount: u64,
    dapp_amount:     u64,
) {
    event::emit(MarketplaceFeeSettled {
        dapp_key, listing_id, coin_type,
        total_fee, treasury_amount, dapp_amount,
    });
}

/// Emitted when a Listing is successfully purchased.
public struct ItemSold has copy, drop {
    dapp_key:    String,
    listing_id:  address,
    buyer:       address,
    seller:      address,
    record_type: vector<u8>,
    price:       u64,
    coin_type:   String,
    is_fungible: bool,
}

public(package) fun emit_item_sold(
    dapp_key:    String,
    listing_id:  address,
    buyer:       address,
    seller:      address,
    record_type: vector<u8>,
    price:       u64,
    coin_type:   String,
    is_fungible: bool,
) {
    event::emit(ItemSold { dapp_key, listing_id, buyer, seller, record_type, price, coin_type, is_fungible });
}

/// Emitted when the seller cancels their own Listing before it expires.
public struct ListingCancelled has copy, drop {
    dapp_key:    String,
    listing_id:  address,
    seller:      address,
    is_fungible: bool,
}

public(package) fun emit_listing_cancelled(
    dapp_key:    String,
    listing_id:  address,
    seller:      address,
    is_fungible: bool,
) {
    event::emit(ListingCancelled { dapp_key, listing_id, seller, is_fungible });
}

/// Emitted when anyone triggers expiry of a past-deadline Listing.
public struct ListingExpired has copy, drop {
    dapp_key:    String,
    listing_id:  address,
    seller:      address,
    is_fungible: bool,
}

public(package) fun emit_listing_expired(
    dapp_key:    String,
    listing_id:  address,
    seller:      address,
    is_fungible: bool,
) {
    event::emit(ListingExpired { dapp_key, listing_id, seller, is_fungible });
}

// ─── ObjectStorage / SceneStorage field events ────────────────────────────────
//
// These events are public (not package-internal) because the emit functions must
// be callable from DApp packages via dapp_system public API.  They use distinct
// event types (not Dubhe_Store_*) so the indexer can route them to separate tables
// without risk of cross-contamination with UserStorage records.

public struct Dubhe_UserStorage_Created has copy, drop {
    dapp_key:        String,
    canonical_owner: address,
    user_storage_id: address,
}

public(package) fun emit_user_storage_created(
    dapp_key:        String,
    canonical_owner: address,
    user_storage_id: address,
) {
    event::emit(Dubhe_UserStorage_Created { dapp_key, canonical_owner, user_storage_id });
}

public struct Dubhe_Object_Created has copy, drop {
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    entity_id:   vector<u8>,
}

public(package) fun emit_object_created(
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    entity_id:   vector<u8>,
) {
    event::emit(Dubhe_Object_Created { dapp_key, object_type, object_id, entity_id });
}

public struct Dubhe_Object_Destroyed has copy, drop {
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    entity_id:   vector<u8>,
}

public(package) fun emit_object_destroyed(
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    entity_id:   vector<u8>,
) {
    event::emit(Dubhe_Object_Destroyed { dapp_key, object_type, object_id, entity_id });
}

/// Emitted whenever a field is set (inserted or updated) in an ObjectStorage Bag.
public struct Dubhe_Object_SetField has copy, drop {
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    field_name:  vector<u8>,
    field_value: vector<u8>,
}

public(package) fun emit_object_set_field(
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    field_name:  vector<u8>,
    field_value: vector<u8>,
) {
    event::emit(Dubhe_Object_SetField { dapp_key, object_type, object_id, field_name, field_value });
}

/// Emitted whenever a field is removed from an ObjectStorage Bag.
public struct Dubhe_Object_DeleteField has copy, drop {
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    field_name:  vector<u8>,
}

public(package) fun emit_object_delete_field(
    dapp_key:    String,
    object_type: vector<u8>,
    object_id:   address,
    field_name:  vector<u8>,
) {
    event::emit(Dubhe_Object_DeleteField { dapp_key, object_type, object_id, field_name });
}

public struct Dubhe_Scene_Created has copy, drop {
    dapp_key:             String,
    scene_type:           vector<u8>,
    scene_id:             address,
    authorization_kind:   vector<u8>,
    authorized_permit_id: Option<address>,
}

public(package) fun emit_scene_created(
    dapp_key:             String,
    scene_type:           vector<u8>,
    scene_id:             address,
    authorization_kind:   vector<u8>,
    authorized_permit_id: Option<address>,
) {
    event::emit(Dubhe_Scene_Created {
        dapp_key,
        scene_type,
        scene_id,
        authorization_kind,
        authorized_permit_id,
    });
}

public struct Dubhe_Scene_Destroyed has copy, drop {
    dapp_key:             String,
    scene_type:           vector<u8>,
    scene_id:             address,
    authorized_permit_id: Option<address>,
}

public(package) fun emit_scene_destroyed(
    dapp_key:             String,
    scene_type:           vector<u8>,
    scene_id:             address,
    authorized_permit_id: Option<address>,
) {
    event::emit(Dubhe_Scene_Destroyed { dapp_key, scene_type, scene_id, authorized_permit_id });
}

/// Emitted whenever a field is set (inserted or updated) in a SceneStorage Bag.
public struct Dubhe_Scene_SetField has copy, drop {
    dapp_key:   String,
    scene_type: vector<u8>,
    scene_id:   address,
    field_name: vector<u8>,
    field_value: vector<u8>,
}

public(package) fun emit_scene_set_field(
    dapp_key:   String,
    scene_type: vector<u8>,
    scene_id:   address,
    field_name: vector<u8>,
    field_value: vector<u8>,
) {
    event::emit(Dubhe_Scene_SetField { dapp_key, scene_type, scene_id, field_name, field_value });
}

/// Emitted whenever a field is removed from a SceneStorage Bag.
public struct Dubhe_Scene_DeleteField has copy, drop {
    dapp_key:   String,
    scene_type: vector<u8>,
    scene_id:   address,
    field_name: vector<u8>,
}

public(package) fun emit_scene_delete_field(
    dapp_key:   String,
    scene_type: vector<u8>,
    scene_id:   address,
    field_name: vector<u8>,
) {
    event::emit(Dubhe_Scene_DeleteField { dapp_key, scene_type, scene_id, field_name });
}

// ─── ScenePermit lifecycle / participant events ───────────────────────────────

public struct Dubhe_ScenePermit_Created has copy, drop {
    dapp_key:          String,
    permit_type:       vector<u8>,
    permit_id:         address,
    expires_at:        Option<u64>,
    invites_expire_at: Option<u64>,
    max_participants:  Option<u64>,
    participant_count: u64,
}

public(package) fun emit_scene_permit_created(
    dapp_key:          String,
    permit_type:       vector<u8>,
    permit_id:         address,
    expires_at:        Option<u64>,
    invites_expire_at: Option<u64>,
    max_participants:  Option<u64>,
    participant_count: u64,
) {
    event::emit(Dubhe_ScenePermit_Created {
        dapp_key,
        permit_type,
        permit_id,
        expires_at,
        invites_expire_at,
        max_participants,
        participant_count,
    });
}

public struct Dubhe_ScenePermit_Accept has copy, drop {
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
}

public(package) fun emit_scene_permit_accept(
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
) {
    event::emit(Dubhe_ScenePermit_Accept { dapp_key, permit_type, permit_id, participant });
}

public struct Dubhe_ScenePermit_Join has copy, drop {
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
}

public(package) fun emit_scene_permit_join(
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
) {
    event::emit(Dubhe_ScenePermit_Join { dapp_key, permit_type, permit_id, participant });
}

public struct Dubhe_ScenePermit_Leave has copy, drop {
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
}

public(package) fun emit_scene_permit_leave(
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
    participant: address,
) {
    event::emit(Dubhe_ScenePermit_Leave { dapp_key, permit_type, permit_id, participant });
}

public struct Dubhe_ScenePermit_Expire has copy, drop {
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
}

public(package) fun emit_scene_permit_expire(
    dapp_key:    String,
    permit_type: vector<u8>,
    permit_id:   address,
) {
    event::emit(Dubhe_ScenePermit_Expire { dapp_key, permit_type, permit_id });
}

/// Emitted when the framework admin calls update_marketplace_fee.
public struct Dubhe_Marketplace_FeeUpdated has copy, drop {
    fee_bps: u64,
}

public(package) fun emit_marketplace_fee_updated(fee_bps: u64) {
    event::emit(Dubhe_Marketplace_FeeUpdated { fee_bps });
}

// ─── Framework fee/revenue state snapshots ────────────────────────────────────
// These are dedicated (non-Store-backed) events so the indexer can handle them
// with hardcoded Rust logic — identical to the marketplace / session event path.

/// Emitted after every operation that mutates the credit pool or fee rates of a DApp.
/// Snapshots the full fee-state so the indexer can maintain store_dapp_fee_state.
public struct DappFeeStateUpdated has copy, drop {
    dapp_key:            String,
    base_fee_per_write:  u256,
    bytes_fee_per_byte:  u256,
    free_credit:         u256,
    credit_pool:         u256,
    total_settled:       u256,
}

public(package) fun emit_dapp_fee_state_updated(
    dapp_key:            String,
    base_fee_per_write:  u256,
    bytes_fee_per_byte:  u256,
    free_credit:         u256,
    credit_pool:         u256,
    total_settled:       u256,
) {
    event::emit(DappFeeStateUpdated {
        dapp_key,
        base_fee_per_write,
        bytes_fee_per_byte,
        free_credit,
        credit_pool,
        total_settled,
    });
}

/// Emitted after every operation that changes the pending DApp revenue balance
/// (settle_writes_user_pays, settle_marketplace_fee).
/// Snapshots dapp_revenue so the indexer can maintain store_dapp_revenue_state.
public struct DappRevenueStateUpdated has copy, drop {
    dapp_key:     String,
    dapp_revenue: u64,
    coin_type:    String,
}

public(package) fun emit_dapp_revenue_state_updated(
    dapp_key:     String,
    dapp_revenue: u64,
    coin_type:    String,
) {
    event::emit(DappRevenueStateUpdated { dapp_key, dapp_revenue, coin_type });
}
