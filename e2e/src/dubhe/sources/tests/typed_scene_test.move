/// Unit tests — Typed SceneStorage and reactive writes
///
/// Covers:
///   - SceneMetadata construction and participant management
///   - is_scene_active / is_scene_participant
///   - set_record_reactive: four-layer security checks
///   - set_field_reactive: same security model
///   - Nonce replay protection (consume_nonce)
#[test_only]
module dubhe::typed_scene_test;

use dubhe::dapp_service::{Self, UserStorage, DappStorage, SceneMetadata};
use dubhe::dapp_system;
use sui::bcs::to_bytes;

public struct SceneKey has copy, drop {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_ds(ctx: &mut TxContext): DappStorage {
    dapp_service::create_dapp_storage_for_testing<SceneKey>(ctx)
}

fun make_us(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<SceneKey>(owner, ctx)
}

fun make_meta(participants: vector<address>, expires_at: u64): SceneMetadata {
    dapp_system::new_scene_meta(participants, std::option::some(expires_at))
}

fun make_permanent_meta(participants: vector<address>): SceneMetadata {
    dapp_system::new_scene_meta(participants, std::option::none())
}

fun key_for(name: vector<u8>): vector<vector<u8>> { vector[name] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u64_val(v: u64): vector<vector<u8>> { vector[to_bytes(&v)] }

// ─── add/remove scene participants ───────────────────────────────────────────

#[test]
fun test_add_remove_scene_participant() {
    let mut meta = make_permanent_meta(vector[@0xAAAA]);

    // @0xBBBB is not yet a participant.
    assert!(!dapp_service::is_scene_participant(&meta, @0xBBBB), 0);

    dapp_service::add_scene_participant(&mut meta, @0xBBBB);
    assert!(dapp_service::is_scene_participant(&meta, @0xBBBB), 1);
    assert!(dapp_service::scene_participants(&meta).length() == 2, 2);

    dapp_service::remove_scene_participant(&mut meta, @0xBBBB);
    assert!(!dapp_service::is_scene_participant(&meta, @0xBBBB), 3);
    assert!(dapp_service::scene_participants(&meta).length() == 1, 4);
}

#[test]
fun test_scene_expires_at_accessor() {
    let meta_perm = make_permanent_meta(vector[@0xA]);
    assert!(dapp_service::scene_expires_at(&meta_perm).is_none(), 0);

    let meta_exp = make_meta(vector[@0xA], 9_999);
    let opt = dapp_service::scene_expires_at(&meta_exp);
    assert!(opt.is_some(), 1);
    assert!(*opt.borrow() == 9_999, 2);
}

// ─── SceneMetadata basics ─────────────────────────────────────────────────────

#[test]
fun test_scene_meta_active_with_none_expiry() {
    let meta = make_permanent_meta(vector[@0xA, @0xB]);
    // Permanent scene — always active regardless of now_ms.
    assert!(dapp_service::is_scene_active(&meta, 0), 0);
    assert!(dapp_service::is_scene_active(&meta, 999_999_999_999), 1);
}

#[test]
fun test_scene_meta_active_before_expiry() {
    let meta = make_meta(vector[@0xA], 1_000_000);
    assert!(dapp_service::is_scene_active(&meta, 999_999), 0);
}

#[test]
fun test_scene_meta_expired_at_deadline() {
    let meta = make_meta(vector[@0xA], 1_000_000);
    // At exactly expires_at the scene is considered expired.
    assert!(!dapp_service::is_scene_active(&meta, 1_000_000), 0);
}

#[test]
fun test_scene_meta_participant_check() {
    let meta = make_permanent_meta(vector[@0xA, @0xB]);
    assert!(dapp_service::is_scene_participant(&meta, @0xA), 0);
    assert!(dapp_service::is_scene_participant(&meta, @0xB), 1);
    assert!(!dapp_service::is_scene_participant(&meta, @0xC), 2);
}

// ─── set_record_reactive: happy path ─────────────────────────────────────────

#[test]
fun test_set_record_reactive_ok() {
    // ctx.sender() defaults to @0x0 in dummy().
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // Both Alice (sender) and Bob are in the scene.
    let meta = make_permanent_meta(vector[sender, @0xBBBB]);

    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(100), &mut ctx,
    );

    // Verify write was applied to target.
    assert!(dapp_service::has_user_record<SceneKey>(&target, key_for(b"hp")), 0);
    // Write count was charged to `from`.
    assert!(dapp_service::write_count(&from) == 1, 1);
    assert!(dapp_service::write_count(&target) == 0, 2);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
}

// ─── set_record_reactive: initiator not in scene ────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_initiator_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // sender is NOT in participants.
    let meta = make_permanent_meta(vector[@0xAAAA, @0xBBBB]);

    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
}

// ─── set_record_reactive: target not in scene ────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_target_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // Target (@0xCCCC) is not in participants.
    let meta = make_permanent_meta(vector[sender, @0xBBBB]);

    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xCCCC, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
}

// ─── set_record_reactive: expired scene ──────────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_expired_scene_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // expires_at = 1 ms — already expired relative to any real epoch.
    // dummy() returns epoch_timestamp_ms = 0; set expires_at = 0 to force expiry.
    let meta = make_meta(vector[sender, @0xBBBB], 0);

    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
}

// ─── set_field_reactive: happy path ──────────────────────────────────────────

#[test]
fun test_set_field_reactive_ok() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let meta = make_permanent_meta(vector[sender, @0xDDDD]);

    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xDDDD, &mut ctx);

    // First create the record in target.
    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"stats"), vector[b"hp", b"mp"], vector[to_bytes(&100u64), to_bytes(&50u64)], &mut ctx,
    );

    // Now update just one field reactively.
    dapp_system::set_field_reactive<SceneKey>(
        SceneKey {}, &meta, &mut from, &mut target,
        key_for(b"stats"), b"hp", to_bytes(&80u64), &mut ctx,
    );

    assert!(dapp_service::write_count(&from) == 2, 0);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
}

// ─── Nonce replay protection ──────────────────────────────────────────────────

#[test]
fun test_nonce_consumed_once_ok() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    assert!(!dapp_service::is_nonce_used(&ds, 42), 0);
    dapp_system::consume_nonce<SceneKey>(SceneKey {}, &mut ds, 42);
    assert!(dapp_service::is_nonce_used(&ds, 42), 1);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_nonce_replay_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    dapp_system::consume_nonce<SceneKey>(SceneKey {}, &mut ds, 99);
    // Second use must abort.
    dapp_system::consume_nonce<SceneKey>(SceneKey {}, &mut ds, 99);

    dapp_service::destroy_dapp_storage(ds);
}
