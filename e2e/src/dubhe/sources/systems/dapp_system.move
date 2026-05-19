#[allow(unused_use)]
module dubhe::dapp_system;

use dubhe::dapp_service::{
    Self,
    DappHub,
    DappStorage,
    UserStorage,
    PermitMetadata,
    ObjectStorage,
    ScenePermit,
    SceneStorage,
};
use dubhe::dubhe_events;
use dubhe::type_info;
use dubhe::error;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::balance;
use sui::bcs;
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
    let default_revenue_share = dapp_service::default_write_fee_dapp_share_bps(cfg);

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

    dubhe_events::emit_dapp_created(
        dapp_key_str,
        admin,
        created_at,
        sui::object::uid_to_address(dapp_service::dapp_storage_id(&ds)),
    );
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
    _auth:        DappKey,
    dapp_hub:     &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dapp_hub);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));
    let sender = ctx.sender();
    error::user_storage_already_exists(!dapp_service::has_registered_user_storage(dapp_storage, sender));
    dapp_service::register_user_storage(dapp_storage, sender);
    let write_limit = dapp_service::framework_max_write_limit(dapp_service::get_config(dapp_hub));
    let us = dapp_service::new_user_storage<DappKey>(sender, write_limit, ctx);
    dubhe_events::emit_user_storage_created(
        dapp_key_str,
        sender,
        sui::object::uid_to_address(dapp_service::user_storage_id(&us)),
    );
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

// ─── Reactive writes (cross-user writes via PermitMetadata) ────────────────────
//
// Reactive writes allow one participant to modify another participant's UserStorage
// within a shared scene context.  Four-layer security:
//   1. ctx.sender() must be from.canonical_owner  (only owner can initiate)
//   2. from must be a registered scene participant
//   3. target must be a registered scene participant
//   4. scene must be active (not expired)
//
// Write fees are charged to the initiator (`from`) under the initiator-pays model.

/// Write a full record to another user's UserStorage, authorized by a ScenePermit.
public fun set_record_reactive<DappKey: copy + drop, PermType>(
    _auth:        DappKey,
    permit:       &ScenePermit<PermType>,
    from:         &mut UserStorage,
    target:       &mut UserStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(from) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(target) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);

    let scene_id = dapp_service::scene_permit_id(permit);
    let meta     = dapp_service::scene_permit_meta(permit);

    // 1. Sender must be the initiator's canonical owner.
    error::not_canonical_owner(ctx.sender() == dapp_service::canonical_owner(from));
    // 2. Initiator must be a scene participant (O(1) DF lookup).
    error::not_scene_participant(dapp_service::is_scene_participant(scene_id, dapp_service::canonical_owner(from)));
    // 3. Target must be a scene participant (O(1) DF lookup).
    error::not_scene_participant(dapp_service::is_scene_participant(scene_id, dapp_service::canonical_owner(target)));
    // 4. Scene must not have expired.
    error::scene_expired(dapp_service::is_scene_active(meta, ctx.epoch_timestamp_ms()));

    error::user_debt_limit_exceeded(dapp_service::unsettled_count(from) < dapp_service::user_write_limit(from));

    dapp_service::increment_write_count(from);
    if (!values.is_empty()) {
        let data_bytes = compute_values_bytes(&values);
        dapp_service::add_write_bytes(from, data_bytes);
    };

    dapp_service::set_user_record<DappKey>(target, key, field_names, values, false);
}

/// Update a single named field in another user's UserStorage, authorized by a ScenePermit.
public fun set_field_reactive<DappKey: copy + drop, PermType>(
    _auth:       DappKey,
    permit:      &ScenePermit<PermType>,
    from:        &mut UserStorage,
    target:      &mut UserStorage,
    key:         vector<vector<u8>>,
    field_name:  vector<u8>,
    field_value: vector<u8>,
    ctx:         &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(from) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(target) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);

    let scene_id = dapp_service::scene_permit_id(permit);
    let meta     = dapp_service::scene_permit_meta(permit);

    error::not_canonical_owner(ctx.sender() == dapp_service::canonical_owner(from));
    error::not_scene_participant(dapp_service::is_scene_participant(scene_id, dapp_service::canonical_owner(from)));
    error::not_scene_participant(dapp_service::is_scene_participant(scene_id, dapp_service::canonical_owner(target)));
    error::scene_expired(dapp_service::is_scene_active(meta, ctx.epoch_timestamp_ms()));

    error::user_debt_limit_exceeded(dapp_service::unsettled_count(from) < dapp_service::user_write_limit(from));

    dapp_service::set_user_field<DappKey>(target, key, field_name, field_value);
    dapp_service::increment_write_count(from);
    dapp_service::add_write_bytes(from, (field_value.length() as u256));
}

// ─── Typed Object management primitives ──────────────────────────────────────
//
// Production path: create_and_share_typed_object / destroy_typed_object (used by codegen).
// entity_id uniqueness is scoped per (DApp, type_tag) — a guild and a boss
// can share the same entity_id bytes without collision.

/// Low-level UID primitive — test-only. Production code uses create_and_share_typed_object.
#[test_only]
public fun create_object<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    type_tag:     vector<u8>,
    entity_id:    vector<u8>,
    ctx:          &mut TxContext,
): sui::object::UID {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let uid = sui::object::new(ctx);
    let object_id = sui::object::uid_to_address(&uid);
    dapp_service::register_object_entity_id(dapp_storage, type_tag, entity_id, object_id);
    uid
}

/// Unregister a typed object's entity_id from DappStorage and delete its UID.
#[test_only]
public fun destroy_object<DappKey: copy + drop>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    type_tag:     vector<u8>,
    entity_id:    vector<u8>,
    uid:          sui::object::UID,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    dapp_service::unregister_object_entity_id(dapp_storage, type_tag, entity_id);
    sui::object::delete(uid);
}

// ─── Framework-controlled ObjectStorage CRUD ─────────────────────────────────
//
// These functions replace the old DApp-side Bag manipulation pattern.
// The phantom ObjType parameter (a DApp-package-local struct, e.g. `Guild`)
// distinguishes GuildStorage from BossStorage at the Move compiler level.
//
// All writes:
//   1. Verify that the caller's DappKey matches the storage's recorded dapp_key.
//   2. Write the field as BCS bytes into the Bag.
//   3. Emit a Dubhe_Object_SetField event for off-chain indexing.
//
// Reads are unauthenticated — any caller can inspect ObjectStorage fields.

/// Create a new Framework-owned ObjectStorage<ObjType>, register entity_id uniqueness,
/// and share the object.  Called from DApp-generated create_<obj> entry functions.
/// Because transfer::share_object must be called from the defining package (dubhe),
/// the framework handles the share here instead of returning the object to the caller.
public fun create_and_share_typed_object<DappKey: copy + drop, ObjType>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    object_type:  vector<u8>,
    entity_id:    vector<u8>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    let storage = dapp_service::new_object_storage<ObjType>(
        dapp_key_str,
        object_type,
        entity_id,
        ctx,
    );
    let object_id = sui::object::uid_to_address(dapp_service::object_storage_id(&storage));
    dapp_service::register_object_entity_id(
        dapp_storage,
        *dapp_service::object_storage_type(&storage),
        *dapp_service::object_storage_entity_id(&storage),
        object_id,
    );
    dapp_service::share_object_storage(storage);
}

/// Write a native-typed field into an ObjectStorage Bag and emit an indexing event.
/// The field value is stored as its native Move type in the Bag; BCS bytes are
/// computed only for the event payload (no serialization overhead for reads).
public fun set_object_field<DappKey: copy + drop, ObjType, T: store + copy + drop>(
    _auth:      DappKey,
    storage:    &mut ObjectStorage<ObjType>,
    field_name: vector<u8>,
    value:      T,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::object_storage_dapp_key(storage) == dapp_key_str);

    let event_bytes = sui::bcs::to_bytes(&value);
    dapp_service::set_object_field(storage, field_name, value);

    let object_id = sui::object::uid_to_address(dapp_service::object_storage_id(storage));
    dubhe_events::emit_object_set_field(
        dapp_key_str,
        *dapp_service::object_storage_type(storage),  // copies &vector<u8> → vector<u8>
        object_id,
        field_name,
        event_bytes,
    );
}

/// Read a native-typed field from an ObjectStorage Bag. Aborts if field not present.
public fun get_object_field<ObjType, T: store + copy + drop>(
    storage:    &ObjectStorage<ObjType>,
    field_name: vector<u8>,
): T {
    dapp_service::get_object_field<ObjType, T>(storage, field_name)
}

/// Returns true if the typed field exists in the ObjectStorage Bag.
public fun has_object_field<ObjType, T: store + copy + drop>(
    storage:    &ObjectStorage<ObjType>,
    field_name: vector<u8>,
): bool {
    dapp_service::has_object_field<ObjType, T>(storage, field_name)
}

/// Remove and return a native-typed field from an ObjectStorage Bag.
/// Requires DappKey auth to prevent unauthorized field removal.
/// Emits a Dubhe_Object_DeleteField event so off-chain indexers stay in sync.
public fun remove_object_field<DappKey: copy + drop, ObjType, T: store + copy + drop>(
    _auth:      DappKey,
    storage:    &mut ObjectStorage<ObjType>,
    field_name: vector<u8>,
): T {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::object_storage_dapp_key(storage) == dapp_key_str);

    // Capture identifiers before removal (the borrow ends when these copies are taken).
    let object_type = *dapp_service::object_storage_type(storage);
    let object_id   = sui::object::uid_to_address(dapp_service::object_storage_id(storage));

    let value = dapp_service::remove_object_field<ObjType, T>(storage, field_name);

    dubhe_events::emit_object_delete_field(dapp_key_str, object_type, object_id, field_name);

    value
}

/// Remove and return a native-typed field from a permit-bound SceneStorage Bag.
/// Emits a Dubhe_Scene_DeleteField event so off-chain indexers stay in sync.
public fun remove_scene_field<DappKey: copy + drop, PermType, SceneType, T: store + copy + drop>(
    _auth:      DappKey,
    permit:     &ScenePermit<PermType>,
    storage:    &mut SceneStorage<SceneType>,
    field_name: vector<u8>,
    ctx:        &TxContext,
): T {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);
    assert_scene_storage_bound_to_permit(permit, storage);
    error::scene_expired(dapp_service::is_scene_active(dapp_service::scene_permit_meta(permit), ctx.epoch_timestamp_ms()));
    error::not_scene_participant(dapp_service::is_participant_in_scene_permit(permit, ctx.sender()));

    let scene_type = *dapp_service::scene_storage_type(storage);
    let scene_id   = sui::object::uid_to_address(dapp_service::scene_storage_id(storage));
    let value = dapp_service::remove_scene_field<SceneType, T>(storage, field_name);
    dubhe_events::emit_scene_delete_field(dapp_key_str, scene_type, scene_id, field_name);

    value
}

/// System maintenance remove for cleanup/migration. DApp system modules must wrap
/// this with their own operator/admin checks before exposing it publicly.
public fun remove_scene_field_system_maintenance<DappKey: copy + drop, SceneType, T: store + copy + drop>(
    _auth:      DappKey,
    storage:    &mut SceneStorage<SceneType>,
    field_name: vector<u8>,
): T {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(storage) == dapp_key_str);

    let scene_type = *dapp_service::scene_storage_type(storage);
    let scene_id   = sui::object::uid_to_address(dapp_service::scene_storage_id(storage));
    let value = dapp_service::remove_scene_field<SceneType, T>(storage, field_name);
    dubhe_events::emit_scene_delete_field(dapp_key_str, scene_type, scene_id, field_name);

    value
}

/// Unregister entity_id from DappStorage and consume the ObjectStorage object.
/// The Bag must be empty before calling this; use remove_object_field first.
public fun destroy_typed_object<DappKey: copy + drop, ObjType>(
    _auth:        DappKey,
    dapp_storage: &mut DappStorage,
    storage:      ObjectStorage<ObjType>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    let type_tag  = *dapp_service::object_storage_type(&storage);   // &vector<u8> → copy
    let entity_id = *dapp_service::object_storage_entity_id(&storage); // same
    let object_id = sui::object::uid_to_address(dapp_service::object_storage_id(&storage));
    dapp_service::unregister_object_entity_id(dapp_storage, type_tag, entity_id);
    dubhe_events::emit_object_destroyed(dapp_key_str, type_tag, object_id, entity_id);
    dapp_service::destroy_object_storage(storage);
}

// ─── Framework-controlled ScenePermit / SceneStorage CRUD ────────────────────

fun assert_scene_storage_bound_to_permit<PermType, SceneType>(
    permit:  &ScenePermit<PermType>,
    storage: &SceneStorage<SceneType>,
) {
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_service::scene_storage_dapp_key(storage));

    let auth_id = *dapp_service::scene_storage_authorized_permit_id(storage);
    error::invalid_key(option::is_some(&auth_id));
    error::invalid_key(*option::borrow(&auth_id) == sui::object::uid_to_address(dapp_service::scene_permit_id(permit)));
}

/// Create an owned ScenePermit<PermType> with participants. The caller may create
/// multiple SceneStorage objects from it before sharing the whole session.
public fun new_scene_permit<DappKey: copy + drop, PermType>(
    _auth:            DappKey,
    dapp_storage:     &DappStorage,
    permit_type:      vector<u8>,
    participants:     vector<address>,
    expires_at:       std::option::Option<u64>,
    max_participants: std::option::Option<u64>,
    ctx:              &mut TxContext,
): ScenePermit<PermType> {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    dapp_service::new_scene_permit_with_participants<PermType>(
        dapp_key_str, permit_type, participants, expires_at, max_participants, ctx
    )
}

/// Create an owned ScenePermit<PermType> with invitees.
public fun new_scene_permit_with_invitations<DappKey: copy + drop, PermType>(
    _auth:             DappKey,
    dapp_storage:      &DappStorage,
    permit_type:       vector<u8>,
    invitees:          vector<address>,
    invites_expire_at: std::option::Option<u64>,
    scene_expires_at:  std::option::Option<u64>,
    max_participants:  std::option::Option<u64>,
    ctx:               &mut TxContext,
): ScenePermit<PermType> {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    dapp_service::new_scene_permit_with_invitations<PermType>(
        dapp_key_str, permit_type, invitees, invites_expire_at, scene_expires_at, max_participants, ctx
    )
}

/// Create and share a ScenePermit<PermType> with participants.
public fun create_and_share_scene_permit<DappKey: copy + drop, PermType>(
    _auth:            DappKey,
    dapp_storage:     &DappStorage,
    permit_type:      vector<u8>,
    participants:     vector<address>,
    expires_at:       std::option::Option<u64>,
    max_participants: std::option::Option<u64>,
    ctx:              &mut TxContext,
) {
    let permit = new_scene_permit<DappKey, PermType>(
        _auth, dapp_storage, permit_type, participants, expires_at, max_participants, ctx
    );
    dapp_service::share_scene_permit(permit);
}

/// Create and share a ScenePermit<PermType> with invitees.
public fun create_and_share_scene_permit_with_invitations<DappKey: copy + drop, PermType>(
    _auth:             DappKey,
    dapp_storage:      &DappStorage,
    permit_type:       vector<u8>,
    invitees:          vector<address>,
    invites_expire_at: std::option::Option<u64>,
    scene_expires_at:  std::option::Option<u64>,
    max_participants:  std::option::Option<u64>,
    ctx:               &mut TxContext,
) {
    let permit = new_scene_permit_with_invitations<DappKey, PermType>(
        _auth, dapp_storage, permit_type, invitees, invites_expire_at, scene_expires_at, max_participants, ctx
    );
    dapp_service::share_scene_permit(permit);
}

/// Share an owned ScenePermit created by new_scene_permit*.
public fun share_scene_permit<DappKey: copy + drop, PermType>(
    _auth:  DappKey,
    permit: ScenePermit<PermType>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(&permit) == dapp_key_str);
    dapp_service::share_scene_permit(permit);
}

/// Create an owned system SceneStorage with no permit binding.
public fun new_typed_scene_system<DappKey: copy + drop, SceneType>(
    _auth:        DappKey,
    dapp_storage: &DappStorage,
    scene_type:   vector<u8>,
    ctx:          &mut TxContext,
): SceneStorage<SceneType> {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    dapp_service::new_scene_storage_system<SceneType>(dapp_key_str, scene_type, ctx)
}

/// Create an owned SceneStorage bound to a concrete ScenePermit object.
public fun new_typed_scene_with_permit<DappKey: copy + drop, PermType, SceneType>(
    _auth:        DappKey,
    dapp_storage: &DappStorage,
    permit:       &ScenePermit<PermType>,
    scene_type:   vector<u8>,
    ctx:          &mut TxContext,
): SceneStorage<SceneType> {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    dapp_service::new_scene_storage_with_permit<PermType, SceneType>(
        dapp_key_str, scene_type, permit, ctx
    )
}

/// Create and share a system SceneStorage.
public fun create_and_share_typed_scene_system<DappKey: copy + drop, SceneType>(
    _auth:        DappKey,
    dapp_storage: &DappStorage,
    scene_type:   vector<u8>,
    ctx:          &mut TxContext,
) {
    let storage = new_typed_scene_system<DappKey, SceneType>(
        _auth, dapp_storage, scene_type, ctx
    );
    dapp_service::share_scene_storage(storage);
}

/// Create and share a SceneStorage bound to a concrete ScenePermit.
public fun create_and_share_typed_scene_with_permit<DappKey: copy + drop, PermType, SceneType>(
    _auth:        DappKey,
    dapp_storage: &DappStorage,
    permit:       &ScenePermit<PermType>,
    scene_type:   vector<u8>,
    ctx:          &mut TxContext,
) {
    let storage = new_typed_scene_with_permit<DappKey, PermType, SceneType>(
        _auth, dapp_storage, permit, scene_type, ctx
    );
    dapp_service::share_scene_storage(storage);
}

/// Share an owned SceneStorage created by new_typed_scene_*.
public fun share_scene_storage<DappKey: copy + drop, SceneType>(
    _auth:   DappKey,
    storage: SceneStorage<SceneType>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(&storage) == dapp_key_str);
    dapp_service::share_scene_storage(storage);
}

/// Write a native-typed field into a permit-bound SceneStorage Bag and emit an event.
public fun set_scene_field<DappKey: copy + drop, PermType, SceneType, T: store + copy + drop>(
    _auth:      DappKey,
    permit:     &ScenePermit<PermType>,
    storage:    &mut SceneStorage<SceneType>,
    field_name: vector<u8>,
    value:      T,
    ctx:        &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);
    assert_scene_storage_bound_to_permit(permit, storage);
    error::scene_expired(dapp_service::is_scene_active(dapp_service::scene_permit_meta(permit), ctx.epoch_timestamp_ms()));
    error::not_scene_participant(dapp_service::is_participant_in_scene_permit(permit, ctx.sender()));

    let event_bytes = sui::bcs::to_bytes(&value);
    dapp_service::set_scene_field(storage, field_name, value);

    let scene_id = sui::object::uid_to_address(dapp_service::scene_storage_id(storage));
    dubhe_events::emit_scene_set_field(
        dapp_key_str,
        *dapp_service::scene_storage_type(storage),
        scene_id,
        field_name,
        event_bytes,
    );
}

/// Write a native-typed field into a system SceneStorage Bag and emit an event.
public fun set_scene_field_system<DappKey: copy + drop, SceneType, T: store + copy + drop>(
    _auth:      DappKey,
    storage:    &mut SceneStorage<SceneType>,
    field_name: vector<u8>,
    value:      T,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(storage) == dapp_key_str);
    error::invalid_key(option::is_none(dapp_service::scene_storage_authorized_permit_id(storage)));

    let event_bytes = sui::bcs::to_bytes(&value);
    dapp_service::set_scene_field(storage, field_name, value);

    let scene_id = sui::object::uid_to_address(dapp_service::scene_storage_id(storage));
    dubhe_events::emit_scene_set_field(
        dapp_key_str,
        *dapp_service::scene_storage_type(storage),
        scene_id,
        field_name,
        event_bytes,
    );
}

/// Read a native-typed field from a SceneStorage Bag. Aborts if field not present.
public fun get_scene_field<SceneType, T: store + copy + drop>(
    storage:    &SceneStorage<SceneType>,
    field_name: vector<u8>,
): T {
    dapp_service::get_scene_field<SceneType, T>(storage, field_name)
}

/// Returns true if the typed field exists in the SceneStorage Bag.
public fun has_scene_field<SceneType, T: store + copy + drop>(
    storage:    &SceneStorage<SceneType>,
    field_name: vector<u8>,
): bool {
    dapp_service::has_scene_field<SceneType, T>(storage, field_name)
}

/// Consume the SceneStorage object. The Bag must be empty.
/// Scenes are not registered in the entity_id registry, so no unregistration needed.
public fun destroy_typed_scene<DappKey: copy + drop, SceneType>(
    _auth:   DappKey,
    storage: SceneStorage<SceneType>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_storage_dapp_key(&storage) == dapp_key_str);
    let scene_type = *dapp_service::scene_storage_type(&storage);
    let scene_id = sui::object::uid_to_address(dapp_service::scene_storage_id(&storage));
    let authorized_permit_id = *dapp_service::scene_storage_authorized_permit_id(&storage);
    dubhe_events::emit_scene_destroyed(dapp_key_str, scene_type, scene_id, authorized_permit_id);
    dapp_service::destroy_scene_storage(storage);
}

/// Consume the ScenePermit object. All participant DFs must have been removed.
public fun destroy_scene_permit<DappKey: copy + drop, PermType>(
    _auth:  DappKey,
    permit: ScenePermit<PermType>,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(&permit) == dapp_key_str);

    let permit_type = *dapp_service::scene_permit_type(&permit);
    let permit_id = sui::object::uid_to_address(dapp_service::scene_permit_id(&permit));
    let participant_count = dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit));
    error::participants_still_present(participant_count == 0);
    dubhe_events::emit_scene_permit_expire(dapp_key_str, permit_type, permit_id);
    dapp_service::destroy_scene_permit(permit);
}

/// Helper: accept a scene invitation for a ScenePermit-backed scene.
/// Moves ctx.sender() from the invitees list to confirmed participants.
/// Guards: scene must be active AND the invitation window must not have expired.
public fun accept_scene_permit_invitation<DappKey: copy + drop, PermType>(
    _auth:   DappKey,
    permit:  &mut ScenePermit<PermType>,
    ctx:     &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);

    // Check both permit activity and invitation window before mutating.
    // The immutable borrow of `meta` is released at the end of this block.
    let now_ms = ctx.epoch_timestamp_ms();
    {
        let meta = dapp_service::scene_permit_meta(permit);
        error::scene_expired(dapp_service::is_scene_active(meta, now_ms));
        let expire_opt = dapp_service::scene_invites_expire_at(meta);
        if (option::is_some(&expire_opt)) {
            error::invitation_expired(now_ms <= *option::borrow(&expire_opt));
        };
    };

    dapp_service::accept_invitation_in_scene_permit(permit, ctx.sender());
    dubhe_events::emit_scene_permit_accept(
        dapp_key_str,
        *dapp_service::scene_permit_type(permit),
        sui::object::uid_to_address(dapp_service::scene_permit_id(permit)),
        ctx.sender(),
    );
}

/// Helper: add the caller as a confirmed participant in a ScenePermit.
/// The permit must still be active — joining an expired permit is meaningless and
/// wastes gas on a DF write that can never be used for reactive writes.
public fun join_scene_permit<DappKey: copy + drop, PermType>(
    _auth:  DappKey,
    permit: &mut ScenePermit<PermType>,
    ctx:    &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);
    error::scene_expired(dapp_service::is_scene_active(dapp_service::scene_permit_meta(permit), ctx.epoch_timestamp_ms()));
    let was_participant = dapp_service::is_participant_in_scene_permit(permit, ctx.sender());
    dapp_service::add_participant_in_scene_permit(permit, ctx.sender());
    if (!was_participant) {
        dubhe_events::emit_scene_permit_join(
            dapp_key_str,
            *dapp_service::scene_permit_type(permit),
            sui::object::uid_to_address(dapp_service::scene_permit_id(permit)),
            ctx.sender(),
        );
    };
}

/// Helper: remove the caller from participants in a SceneStorage scene.
public fun leave_scene_permit<DappKey: copy + drop, PermType>(
    _auth:  DappKey,
    permit: &mut ScenePermit<PermType>,
    ctx:    &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::scene_permit_dapp_key(permit) == dapp_key_str);
    let was_participant = dapp_service::is_participant_in_scene_permit(permit, ctx.sender());
    dapp_service::remove_participant_in_scene_permit(permit, ctx.sender());
    if (was_participant) {
        dubhe_events::emit_scene_permit_leave(
            dapp_key_str,
            *dapp_service::scene_permit_type(permit),
            sui::object::uid_to_address(dapp_service::scene_permit_id(permit)),
            ctx.sender(),
        );
    };
}

/// Helper: check if addr is a participant in a ScenePermit.
public fun is_scene_permit_participant<PermType>(
    permit: &ScenePermit<PermType>,
    addr:   address,
): bool {
    dapp_service::is_participant_in_scene_permit(permit, addr)
}

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

// ─── Listing market protocol ─────────────────────────────────────────────────
//
// `take_record` atomically removes an item record from a UserStorage and wraps
// it in a shared Listing object.  `restore_record` unwraps the Listing back
// into a UserStorage.  The take → share → restore/buy lifecycle guarantees
// single-source-of-truth with no data duplication (Move linear types).

use dubhe::dapp_service::Listing;

/// Take an item record out of UserStorage and create a shared Listing.
/// The item is removed from the seller's storage atomically.
///
/// Security:
///   - Only the CANONICAL OWNER of `user_storage` may create a listing.
///     Session keys are intentionally excluded: listing = asset ownership transfer,
///     which requires the wallet owner's direct authorization.
///   - Aborts if `listed_until` is in the past (already expired at list time).
public fun take_record<DappKey: copy + drop, CoinType>(
    _auth:        DappKey,
    user_storage: &mut UserStorage,
    record_type:  vector<u8>,
    record_key:   vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    price:        u64,
    listed_until: Option<u64>,
    ctx:          &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    // Listing creation requires the canonical owner — session keys are not permitted.
    error::no_permission(ctx.sender() == dapp_service::canonical_owner(user_storage));

    // Validate listed_until is in the future if provided.
    if (option::is_some(&listed_until)) {
        let expiry = *option::borrow(&listed_until);
        error::scene_expired(ctx.epoch_timestamp_ms() < expiry);
    };

    // Read current field values to embed in the Listing.
    let num_fields = field_names.length();
    let mut record_values: vector<vector<u8>> = vector::empty();
    let mut i = 0;
    while (i < num_fields) {
        let fname = *field_names.borrow(i);
        let val = dapp_service::get_user_field<DappKey>(user_storage, record_key, fname);
        record_values.push_back(val);
        i = i + 1;
    };

    // BCS-encode each field value individually; record_data is vector<vector<u8>>.
    // (No outer bcs::to_bytes wrapper needed — the type changed to vector<vector<u8>>.)

    // Remove the record from the user's storage.
    dapp_service::delete_user_record<DappKey>(user_storage, record_key, field_names);

    let seller = dapp_service::canonical_owner(user_storage);
    let listing = dapp_service::new_listing<CoinType>(
        record_values,
        record_type,
        record_key,
        field_names,
        seller,
        price,
        listed_until,
        dapp_key_str,
        false, // is_fungible = false for unique items
        ctx,
    );
    let listing_id     = sui::object::uid_to_address(dapp_service::listing_id(&listing));
    let coin_type_str  = type_info::get_type_name_string<CoinType>();
    let ev_rec_type    = *dapp_service::listing_record_type(&listing);
    let ev_record_key  = *dapp_service::listing_record_key(&listing);
    let ev_field_names = *dapp_service::listing_field_names(&listing);
    let ev_record_data = *dapp_service::listing_record_data(&listing);
    dapp_service::share_listing(listing);
    dubhe_events::emit_item_listed(
        dapp_key_str,
        listing_id,
        seller,
        ev_rec_type,
        ev_record_key,
        ev_field_names,
        ev_record_data,
        price,
        coin_type_str,
        false,
        listed_until,
    );
}

/// Restore a Listing's item record back into a UserStorage (cancel listing).
/// Only the original seller may cancel.
///
/// NOTE: This function is for unique (non-fungible) items only.  Calling it
/// on a fungible listing will abort.  Fungible listings must use
/// cancel_fungible_listing instead (which does additive-merge semantics).
public fun restore_record<DappKey: copy + drop, CoinType>(
    _auth:        DappKey,
    listing:      Listing<CoinType>,
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);

    // Fungible listings must go through cancel_fungible_listing (additive merge).
    error::no_permission(!dapp_service::listing_is_fungible(&listing));

    let seller = dapp_service::listing_seller(&listing);
    error::no_permission(ctx.sender() == seller);
    error::no_permission(seller == dapp_service::canonical_owner(user_storage));

    let record_key    = *dapp_service::listing_record_key(&listing);
    let field_names   = *dapp_service::listing_field_names(&listing);
    let record_values = *dapp_service::listing_record_data(&listing);

    // Capture event data before consuming the listing.
    let listing_id = sui::object::uid_to_address(dapp_service::listing_id(&listing));

    dapp_service::set_user_record<DappKey>(
        user_storage, record_key, field_names, record_values, false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_listing_cancelled(dapp_key_str, listing_id, seller, false);
}

/// Take a specific `amount` from a fungible record and create a shared Listing.
///
/// Unlike `take_record` (which removes the entire record), this function
/// subtracts `amount` from the caller's current balance, or deletes the record
/// entirely if the balance would reach zero.  A Listing is created that
/// contains only the listed amount.
///
/// Security:
///   - Only the CANONICAL OWNER may list. Session keys are intentionally excluded.
///   - `amount` must be > 0 and ≤ current balance (aborts with insufficient_balance).
///   - Aborts if `listed_until` is already in the past.
public fun take_fungible_record<DappKey: copy + drop, CoinType>(
    _auth:          DappKey,
    user_storage:   &mut UserStorage,
    record_type:    vector<u8>,
    record_key:     vector<vector<u8>>,
    field_name:     vector<u8>,
    amount:         u64,
    price:          u64,
    listed_until:   Option<u64>,
    ctx:            &mut TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(user_storage) == dapp_key_str);
    // Listing creation requires the canonical owner — session keys are not permitted.
    error::no_permission(ctx.sender() == dapp_service::canonical_owner(user_storage));
    if (option::is_some(&listed_until)) {
        let expiry = *option::borrow(&listed_until);
        error::scene_expired(ctx.epoch_timestamp_ms() < expiry);
    };

    // Read current balance (single BCS-encoded u64 field).
    let current_bytes = dapp_service::get_user_field<DappKey>(user_storage, record_key, field_name);
    let mut bcs_cur = sui::bcs::new(current_bytes);
    let current = bcs_cur.peel_u64();

    // amount must be positive and within the available balance.
    error::insufficient_balance(amount > 0 && amount <= current);

    let remaining = current - amount;
    if (remaining == 0) {
        dapp_service::delete_user_record<DappKey>(user_storage, record_key, vector[field_name]);
    } else {
        dapp_service::set_user_field<DappKey>(
            user_storage, record_key, field_name, sui::bcs::to_bytes(&remaining)
        );
    };

    // Build Listing with only the listed amount.
    // record_values is vector<vector<u8>>; each element is BCS-encoded field value.
    let record_values = vector[sui::bcs::to_bytes(&amount)];
    let seller = dapp_service::canonical_owner(user_storage);
    let listing = dapp_service::new_listing<CoinType>(
        record_values,
        record_type,
        record_key,
        vector[field_name],
        seller,
        price,
        listed_until,
        dapp_key_str,
        true, // is_fungible = true
        ctx,
    );
    let listing_id     = sui::object::uid_to_address(dapp_service::listing_id(&listing));
    let coin_type_str  = type_info::get_type_name_string<CoinType>();
    let ev_rec_type    = *dapp_service::listing_record_type(&listing);
    let ev_record_key  = *dapp_service::listing_record_key(&listing);
    let ev_field_names = *dapp_service::listing_field_names(&listing);
    let ev_record_data = *dapp_service::listing_record_data(&listing);
    dapp_service::share_listing(listing);
    dubhe_events::emit_item_listed(
        dapp_key_str,
        listing_id,
        seller,
        ev_rec_type,
        ev_record_key,
        ev_field_names,
        ev_record_data,
        price,
        coin_type_str,
        true,
        listed_until,
    );
}

/// Purchase a unique-item Listing and write the item into the buyer's UserStorage.
///
/// Payment is enforced at the framework level — callers MUST supply at least
/// `listing.price` in `payment`.  The function:
///   1. Transfers `price - fee` to the seller immediately.
///   2. Calls `settle_marketplace_fee` to split the fee between framework and DApp.
///   3. Writes the item data into `buyer_storage`.
///   4. Returns any change (payment surplus) to the caller.
///
/// Security:
///   - ctx.sender() must be canonical_owner(buyer_storage).
///   - listing and buyer_storage must belong to the same DApp.
///   - Buyer must not be the seller (prevents self-trade).
///   - Listing must not have expired.
///   - payment must cover the full listing price (EInsufficientPayment).
public fun buy_record<DappKey: copy + drop, CoinType>(
    _auth:         DappKey,
    dh:            &DappHub,
    dapp_storage:  &mut DappStorage,
    listing:       Listing<CoinType>,
    buyer_storage: &mut UserStorage,
    mut payment:   Coin<CoinType>,
    ctx:           &mut TxContext,
): Coin<CoinType> {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(buyer_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    // Buyer must own buyer_storage.
    error::no_permission(ctx.sender() == dapp_service::canonical_owner(buyer_storage));
    // Buyer must not be the seller (prevents self-trade exploits).
    error::no_permission(dapp_service::canonical_owner(buyer_storage) != dapp_service::listing_seller(&listing));
    // Listing must not have expired.
    error::scene_expired(!dapp_service::is_listing_expired(&listing, ctx.epoch_timestamp_ms()));

    let price    = dapp_service::listing_price(&listing);
    let seller   = dapp_service::listing_seller(&listing);
    let fee_bps  = dapp_service::marketplace_fee_bps(dapp_service::get_config(dh));
    let fee_amount    = ((price as u256) * (fee_bps as u256) / 10_000u256) as u64;
    let seller_amount = price - fee_amount;

    // Payment must cover the full listing price — enforced at the framework level.
    error::insufficient_payment(coin::value(&payment) >= price);

    // Extract listing data before any mutations so existence check can run first.
    let listing_id    = sui::object::uid_to_address(dapp_service::listing_id(&listing));
    let record_key    = *dapp_service::listing_record_key(&listing);
    let field_names   = *dapp_service::listing_field_names(&listing);
    let record_values = *dapp_service::listing_record_data(&listing);
    let ev_rec_type   = *dapp_service::listing_record_type(&listing);
    let coin_type_str = type_info::get_type_name_string<CoinType>();

    // ── All checks must pass before any payment mutations ────────────────────
    // Prevent silent overwrite: buyer must not already own a record with this key.
    error::item_already_owned(!dapp_service::has_user_record<DappKey>(buyer_storage, record_key));

    if (seller_amount > 0) {
        let seller_coin = coin::split(&mut payment, seller_amount, ctx);
        transfer::public_transfer(seller_coin, seller);
    };
    if (fee_amount > 0) {
        let fee_coin = coin::split(&mut payment, fee_amount, ctx);
        settle_marketplace_fee<DappKey, CoinType>(
            _auth, dh, dapp_storage, fee_coin, listing_id, ctx
        );
    };

    dapp_service::set_user_record<DappKey>(
        buyer_storage, record_key, field_names, record_values, false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_item_sold(dapp_key_str, listing_id, ctx.sender(), seller, ev_rec_type, price, coin_type_str, false);

    payment // return change
}

/// Purchase a fungible Listing and ADD the listed amount to the buyer's existing balance.
///
/// Payment is enforced at the framework level — callers MUST supply at least
/// `listing.price` in `payment`.  Identical payment split logic to `buy_record`.
/// If the buyer already holds some of this resource the amounts are merged; if not,
/// a new record is created.
///
/// Security:
///   - ctx.sender() must be canonical_owner(buyer_storage).
///   - listing and buyer_storage must belong to the same DApp.
///   - Buyer must not be the original seller (no self-trade).
///   - Listing must not have expired.
///   - payment must cover the full listing price (EInsufficientPayment).
///   - field_name is read from the listing itself (not caller-supplied) to prevent mismatch.
public fun buy_fungible_record<DappKey: copy + drop, CoinType>(
    _auth:         DappKey,
    dh:            &DappHub,
    dapp_storage:  &mut DappStorage,
    listing:       Listing<CoinType>,
    buyer_storage: &mut UserStorage,
    mut payment:   Coin<CoinType>,
    ctx:           &mut TxContext,
): Coin<CoinType> {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(buyer_storage) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    error::no_permission(ctx.sender() == dapp_service::canonical_owner(buyer_storage));
    // Buyer must not be the seller (prevents self-trade exploits).
    error::no_permission(dapp_service::canonical_owner(buyer_storage) != dapp_service::listing_seller(&listing));
    error::scene_expired(!dapp_service::is_listing_expired(&listing, ctx.epoch_timestamp_ms()));

    let price    = dapp_service::listing_price(&listing);
    let seller   = dapp_service::listing_seller(&listing);
    let fee_bps  = dapp_service::marketplace_fee_bps(dapp_service::get_config(dh));
    let fee_amount    = ((price as u256) * (fee_bps as u256) / 10_000u256) as u64;
    let seller_amount = price - fee_amount;

    // Payment must cover the full listing price — enforced at the framework level.
    error::insufficient_payment(coin::value(&payment) >= price);

    // Extract listing_id early so it can be forwarded to settle_marketplace_fee
    // for the MarketplaceFeeSettled event.
    let listing_id    = sui::object::uid_to_address(dapp_service::listing_id(&listing));
    let ev_rec_type   = *dapp_service::listing_record_type(&listing);
    let coin_type_str = type_info::get_type_name_string<CoinType>();

    if (seller_amount > 0) {
        let seller_coin = coin::split(&mut payment, seller_amount, ctx);
        transfer::public_transfer(seller_coin, seller);
    };
    if (fee_amount > 0) {
        let fee_coin = coin::split(&mut payment, fee_amount, ctx);
        settle_marketplace_fee<DappKey, CoinType>(
            _auth, dh, dapp_storage, fee_coin, listing_id, ctx
        );
    };

    // Read listed amount directly from record_data (now vector<vector<u8>>).
    let record_values = *dapp_service::listing_record_data(&listing);
    let listed_amount_bytes = *record_values.borrow(0);
    let mut bcs2 = sui::bcs::new(listed_amount_bytes);
    let listed_amount = bcs2.peel_u64();

    let record_key = *dapp_service::listing_record_key(&listing);
    // Use the field name stored in the listing (set at listing creation time) to prevent
    // caller-supplied field_name mismatch attacks.
    let field_name = *dapp_service::listing_field_names(&listing).borrow(0);
    let field_names = vector[field_name];

    // Read buyer's current balance (0 if no record exists yet).
    let buyer_current = if (dapp_service::has_user_record<DappKey>(buyer_storage, record_key)) {
        let current_bytes = dapp_service::get_user_field<DappKey>(buyer_storage, record_key, field_name);
        let mut bcs3 = sui::bcs::new(current_bytes);
        bcs3.peel_u64()
    } else {
        0u64
    };

    // Use u256 arithmetic to detect u64 overflow before casting back.
    let new_amount_u256 = (buyer_current as u256) + (listed_amount as u256);
    error::math_overflow(new_amount_u256 <= 18_446_744_073_709_551_615u256);
    let new_amount = new_amount_u256 as u64;
    let new_bytes = sui::bcs::to_bytes(&new_amount);

    dapp_service::set_user_record<DappKey>(
        buyer_storage, record_key, field_names, vector[new_bytes], false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_item_sold(dapp_key_str, listing_id, ctx.sender(), seller, ev_rec_type, price, coin_type_str, true);

    payment // return change
}

/// Expire a Listing that has passed its `listed_until` deadline (unique item).
/// The item is restored to the original seller's storage.
public fun expire_listing<DappKey: copy + drop, CoinType>(
    _auth:        DappKey,
    listing:      Listing<CoinType>,
    seller_storage: &mut UserStorage,
    ctx:          &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    // seller_storage must belong to the same DApp as the listing (prevents cross-DApp writes).
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(seller_storage) == dapp_key_str);

    // Must actually be expired.
    error::scene_expired(dapp_service::is_listing_expired(&listing, ctx.epoch_timestamp_ms()));

    let seller = dapp_service::listing_seller(&listing);
    error::no_permission(seller == dapp_service::canonical_owner(seller_storage));

    let record_key    = *dapp_service::listing_record_key(&listing);
    let field_names   = *dapp_service::listing_field_names(&listing);
    let record_values = *dapp_service::listing_record_data(&listing);

    // Capture event data before consuming the listing.
    let listing_id = sui::object::uid_to_address(dapp_service::listing_id(&listing));

    dapp_service::set_user_record<DappKey>(
        seller_storage, record_key, field_names, record_values, false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_listing_expired(dapp_key_str, listing_id, seller, false);
}

/// Cancel a fungible Listing — ADDS the listed amount back to the seller's balance.
///
/// Unlike `restore_record` (which overwrites), this function reads the seller's
/// current balance and merges the listed amount on top, preventing the overwrite
/// bug when the seller has accumulated more of the same resource since listing.
///
/// Security:
///   - Only the original seller may cancel.
///   - listing and seller_storage must belong to the same DApp.
///   - field_name is read from the listing itself (not caller-supplied) to prevent mismatch.
public fun cancel_fungible_listing<DappKey: copy + drop, CoinType>(
    _auth:          DappKey,
    listing:        Listing<CoinType>,
    seller_storage: &mut UserStorage,
    ctx:            &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(seller_storage) == dapp_key_str);

    let seller = dapp_service::listing_seller(&listing);
    error::no_permission(ctx.sender() == seller);
    error::no_permission(seller == dapp_service::canonical_owner(seller_storage));

    let record_key = *dapp_service::listing_record_key(&listing);
    // Use the field name stored in the listing to prevent caller-supplied field_name mismatch.
    let field_name = *dapp_service::listing_field_names(&listing).borrow(0);
    let field_names = vector[field_name];

    // Capture event data before consuming the listing.
    let listing_id = sui::object::uid_to_address(dapp_service::listing_id(&listing));

    // Read listed amount directly from record_data (now vector<vector<u8>>).
    let record_values = *dapp_service::listing_record_data(&listing);
    let listed_amount_bytes = *record_values.borrow(0);
    let mut bcs2 = sui::bcs::new(listed_amount_bytes);
    let listed_amount = bcs2.peel_u64();

    // Read seller's current balance (0 if record deleted while listing was live).
    let current = if (dapp_service::has_user_record<DappKey>(seller_storage, record_key)) {
        let current_bytes = dapp_service::get_user_field<DappKey>(seller_storage, record_key, field_name);
        let mut bcs3 = sui::bcs::new(current_bytes);
        bcs3.peel_u64()
    } else {
        0u64
    };

    // Use u256 arithmetic to detect u64 overflow before casting back.
    let new_amount_u256 = (current as u256) + (listed_amount as u256);
    error::math_overflow(new_amount_u256 <= 18_446_744_073_709_551_615u256);
    let new_amount = new_amount_u256 as u64;
    dapp_service::set_user_record<DappKey>(
        seller_storage, record_key, field_names, vector[sui::bcs::to_bytes(&new_amount)], false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_listing_cancelled(dapp_key_str, listing_id, seller, true);
}

/// Expire a fungible Listing — ADDS the listed amount back to the seller's balance.
///
/// Anyone may call this for a listing that has passed its `listed_until` deadline.
/// Uses additive merge (not overwrite) to prevent balance corruption when the seller
/// has acquired more of the same resource since the listing was created.
///
/// Security:
///   - Listing must have actually expired.
///   - seller_storage must belong to the same DApp as the listing (prevents cross-DApp writes).
///   - seller_storage must belong to the original seller.
///   - field_name is read from the listing itself (not caller-supplied) to prevent mismatch.
public fun expire_fungible_listing<DappKey: copy + drop, CoinType>(
    _auth:          DappKey,
    listing:        Listing<CoinType>,
    seller_storage: &mut UserStorage,
    ctx:            &TxContext,
) {
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::listing_dapp_key(&listing) == dapp_key_str);
    // seller_storage must belong to the same DApp as the listing (prevents cross-DApp writes).
    error::dapp_key_mismatch(dapp_service::user_storage_dapp_key(seller_storage) == dapp_key_str);

    // Must actually be expired.
    error::scene_expired(dapp_service::is_listing_expired(&listing, ctx.epoch_timestamp_ms()));

    let seller = dapp_service::listing_seller(&listing);
    error::no_permission(seller == dapp_service::canonical_owner(seller_storage));

    let record_key = *dapp_service::listing_record_key(&listing);
    // Use the field name stored in the listing to prevent caller-supplied field_name mismatch.
    let field_name = *dapp_service::listing_field_names(&listing).borrow(0);
    let field_names = vector[field_name];

    // Capture event data before consuming the listing.
    let listing_id = sui::object::uid_to_address(dapp_service::listing_id(&listing));

    // Read listed amount directly from record_data (now vector<vector<u8>>).
    let record_values = *dapp_service::listing_record_data(&listing);
    let listed_amount_bytes = *record_values.borrow(0);
    let mut bcs2 = sui::bcs::new(listed_amount_bytes);
    let listed_amount = bcs2.peel_u64();

    // Read seller's current balance (0 if record deleted while listing was live).
    let current = if (dapp_service::has_user_record<DappKey>(seller_storage, record_key)) {
        let current_bytes = dapp_service::get_user_field<DappKey>(seller_storage, record_key, field_name);
        let mut bcs3 = sui::bcs::new(current_bytes);
        bcs3.peel_u64()
    } else {
        0u64
    };

    // Use u256 arithmetic to detect u64 overflow before casting back.
    let new_amount_u256 = (current as u256) + (listed_amount as u256);
    error::math_overflow(new_amount_u256 <= 18_446_744_073_709_551_615u256);
    let new_amount = new_amount_u256 as u64;
    dapp_service::set_user_record<DappKey>(
        seller_storage, record_key, field_names, vector[sui::bcs::to_bytes(&new_amount)], false
    );

    let (_, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dubhe_events::emit_listing_expired(dapp_key_str, listing_id, seller, true);
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
    // DApp only owes the framework's write-fee share; the DApp-developer portion is not charged here.
    // This aligns DAPP_SUBSIDIZES with USER_PAYS: in both modes the framework collects only its cut.
    let share_bps      = dapp_service::dapp_write_fee_share_bps(dapp_storage) as u256;
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
    let share_bps   = dapp_service::dapp_write_fee_share_bps(dapp_storage) as u256;
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
    dapp_service::emit_revenue_state_record<DappKey, CoinType>(dapp_storage);

    // Return the change coin to the caller (the PTB decides where it goes).
    payment
}

/// Anyone can call this to flush accumulated DApp revenue to the DApp admin wallet.
/// The coin is always sent to the stored `dapp_admin` address — the caller only
/// pays gas and cannot redirect funds anywhere else.
/// Aborts if there is no revenue to withdraw.
///
/// Version-gated: after a framework upgrade this function must be called via the
/// new package version to prevent stale code from touching DappStorage state.
public fun withdraw_dapp_revenue<DappKey: copy + drop, CoinType>(
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);

    let bal = dapp_service::take_dapp_revenue<CoinType>(dapp_storage);
    let amount = balance::value(&bal);
    error::no_revenue_to_withdraw(amount > 0);

    let admin = dapp_service::dapp_admin(dapp_storage);

    dubhe_events::emit_dapp_revenue_withdrawn(
        dapp_key_str,
        admin,
        type_name::with_defining_ids<CoinType>().into_string(),
        amount,
    );

    transfer::public_transfer(coin::from_balance(bal, ctx), admin);
}

/// DApp admin: switch settlement mode.
///
/// Both directions are allowed:
///   DAPP_SUBSIDIZES(0) → USER_PAYS(1): credit_pool is kept but becomes inactive —
///     it cannot be consumed for settlement after the switch.
///     Any unsettled user debt that existed before the switch must be paid by users
///     via settle_writes_user_pays; the remaining credit_pool is NOT automatically
///     refunded. DApp admin can withdraw any remaining balance manually if desired.
///   USER_PAYS(1) → DAPP_SUBSIDIZES(0): DappStorage Revenue Balance is kept (withdrawable).
/// Write-fee DApp share (write_fee_dapp_share_bps) is set exclusively by the framework admin
/// via set_dapp_write_fee_share; DApp admin only controls the mode.
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

/// Framework admin: set the write-fee DApp share for a specific DApp (immediate effect).
///
/// `new_bps` is the percentage of write-fee settlement revenue allocated to the
/// DApp developer. e.g. 3000 = 30% to DApp; 70% to framework treasury.
/// Valid range: 0 – 10000 (0% – 100%).
/// Takes effect on the next settle_writes / settle_writes_user_pays call for this DApp.
public fun set_dapp_write_fee_share<DappKey: copy + drop>(
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

    dapp_service::set_write_fee_dapp_share_bps(dapp_storage, new_bps);
    dubhe_events::emit_dapp_revenue_share_set(dapp_key_str, new_bps);
}

/// Framework admin: update the default write-fee DApp share for future newly created DApps.
///
/// This does NOT retroactively affect existing DApps. Use set_dapp_write_fee_share
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

    dapp_service::set_default_write_fee_dapp_share_bps(dapp_service::get_config_mut(dh), new_bps);
    dubhe_events::emit_default_revenue_share_updated(new_bps);
}

// ─── Marketplace fee management ───────────────────────────────────────────────

/// Framework admin: update the global marketplace fee rate.
/// Maximum allowed value is 10000 (100%).
public fun update_marketplace_fee(
    dh:      &mut DappHub,
    fee_bps: u64,
    ctx:     &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    error::marketplace_fee_exceeds_max(fee_bps <= 10_000);
    dapp_service::set_marketplace_fee_bps(dapp_service::get_config_mut(dh), fee_bps);
    dubhe_events::emit_marketplace_fee_updated(fee_bps);
}

/// Return the current global marketplace fee rate (basis points).
///
/// Used by generated DApp buy functions to compute the fee to charge buyers.
/// All DApps share the same global rate; there is no per-DApp override.
public fun marketplace_fee_bps(dh: &DappHub): u64 {
    assert_framework_version(dh);
    dapp_service::marketplace_fee_bps(dapp_service::get_config(dh))
}

/// Framework admin: update the DApp's share of the marketplace fee (basis points).
///
/// e.g. 5000 = 50% of total fee goes to the DApp; remainder to framework treasury.
/// Maximum allowed value is 10000 (100% to DApp, 0% to framework).
public fun update_marketplace_dapp_share(
    dh:        &mut DappHub,
    share_bps: u64,
    ctx:       &TxContext,
) {
    assert_framework_version(dh);
    error::no_permission(
        dapp_service::framework_admin(dapp_service::get_config(dh)) == ctx.sender()
    );
    error::marketplace_fee_exceeds_max(share_bps <= 10_000);
    dapp_service::set_marketplace_dapp_share_bps(dapp_service::get_config_mut(dh), share_bps);
}

/// Settle a marketplace fee coin: split into framework and DApp portions.
///
/// Called from generated DApp `buy` functions after the seller has received their
/// exact listing price.  The fee coin is consumed entirely — no value is returned.
///   - Framework portion is transferred to the framework treasury.
///   - DApp portion is credited to DappStorage's revenue balance.
public fun settle_marketplace_fee<DappKey: copy + drop, CoinType>(
    _auth:        DappKey,
    dh:           &DappHub,
    dapp_storage: &mut DappStorage,
    mut fee_coin: Coin<CoinType>,
    listing_id:   address,
    ctx:          &mut TxContext,
) {
    assert_framework_version(dh);
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    error::dapp_key_mismatch(dapp_service::dapp_storage_dapp_key(dapp_storage) == dapp_key_str);
    error::dapp_paused(!dapp_service::dapp_paused(dapp_storage));

    let total_fee = coin::value(&fee_coin);
    if (total_fee == 0) {
        coin::destroy_zero(fee_coin);
        return
    };

    let share_bps   = dapp_service::marketplace_dapp_share_bps(dapp_service::get_config(dh)) as u256;
    let dapp_amount = ((total_fee as u256) * share_bps / 10_000) as u64;
    let fw_amount   = total_fee - dapp_amount;
    let cfg         = dapp_service::get_fee_config(dh);
    let treasury    = dapp_service::treasury(cfg);

    if (fw_amount > 0) {
        let fw_coin = coin::split(&mut fee_coin, fw_amount, ctx);
        transfer::public_transfer(fw_coin, treasury);
    };

    if (dapp_amount > 0) {
        let dapp_bal = coin::into_balance(fee_coin);
        dapp_service::add_dapp_revenue<CoinType>(dapp_storage, dapp_bal);
    } else {
        coin::destroy_zero(fee_coin);
    };

    let coin_type_str = type_info::get_type_name_string<CoinType>();
    dubhe_events::emit_marketplace_fee_settled(
        dapp_key_str, listing_id, coin_type_str,
        total_fee, fw_amount, dapp_amount,
    );
    dapp_service::emit_revenue_state_record<DappKey, CoinType>(dapp_storage);
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
    dapp_service::set_default_write_fee_dapp_share_bps(scfg, revenue_share_bps);
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
/// Note: settle_writes reads per-DApp snapshot rates from DappStorage (set via
/// sync_dapp_fee), not from this function. Use sync_dapp_fee after a pending fee
/// change has been committed to propagate the new rates to each DApp.
public fun get_effective_fees_at(dh: &DappHub, now_ms: u64): (u256, u256) {
    assert_framework_version(dh);
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
    assert_framework_version(dh);
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
    dubhe_events::emit_dapp_paused_changed(dapp_key_str, paused, ctx.sender());
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

/// Returns the canonical dapp key string for a given DappKey type.
/// Convenience helper for DApp developers who need to reference their key string
/// (e.g. for off-chain indexing or event filtering).
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
