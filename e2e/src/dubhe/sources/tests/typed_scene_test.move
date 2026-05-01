/// Unit tests — Typed SceneStorage and reactive writes
///
/// Covers:
///   - SceneMetadata construction and participant management (O(1) dynamic fields)
///   - is_scene_active / is_scene_participant
///   - set_record_reactive: four-layer security checks
///   - set_field_reactive: same security model
///   - Invitation flow: create_with_invitations + accept
#[test_only]
module dubhe::typed_scene_test;

use dubhe::dapp_service::{Self, UserStorage, DappStorage, SceneMetadata};
use dubhe::dapp_system;
use sui::bcs::to_bytes;
use sui::object::UID;

public struct SceneKey has copy, drop {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_ds(ctx: &mut TxContext): DappStorage {
    dapp_service::create_dapp_storage_for_testing<SceneKey>(ctx)
}

fun make_us(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<SceneKey>(owner, ctx)
}

/// Create a (UID, SceneMetadata) pair with given participants and expiry.
/// Caller must call sui::object::delete(id) at end of non-expected_failure tests.
fun make_scene(
    participants: vector<address>,
    expires_at:   std::option::Option<u64>,
    ctx:          &mut TxContext,
): (UID, SceneMetadata) {
    let mut id = sui::object::new(ctx);
    let meta = dapp_system::init_scene_meta(&mut id, participants, expires_at, std::option::none());
    (id, meta)
}

fun make_permanent_scene(
    participants: vector<address>,
    ctx:          &mut TxContext,
): (UID, SceneMetadata) {
    make_scene(participants, std::option::none(), ctx)
}

fun key_for(name: vector<u8>): vector<vector<u8>> { vector[name] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u64_val(v: u64): vector<vector<u8>> { vector[to_bytes(&v)] }

// ─── add/remove scene participants (dynamic fields) ───────────────────────────

#[test]
fun test_add_remove_scene_participant() {
    let mut ctx = sui::tx_context::dummy();
    let (mut id, mut meta) = make_permanent_scene(vector[@0xAAAA], &mut ctx);

    // @0xBBBB is not yet a participant.
    assert!(!dapp_service::is_scene_participant(&id, @0xBBBB), 0);
    assert!(dapp_service::scene_participant_count(&meta) == 1, 1);

    dapp_service::add_scene_participant(&mut id, &mut meta, @0xBBBB);
    assert!(dapp_service::is_scene_participant(&id, @0xBBBB), 2);
    assert!(dapp_service::scene_participant_count(&meta) == 2, 3);

    dapp_service::remove_scene_participant(&mut id, &mut meta, @0xBBBB);
    assert!(!dapp_service::is_scene_participant(&id, @0xBBBB), 4);
    assert!(dapp_service::scene_participant_count(&meta) == 1, 5);

    sui::object::delete(id);
}

#[test]
fun test_add_participant_idempotent() {
    let mut ctx = sui::tx_context::dummy();
    let (mut id, mut meta) = make_permanent_scene(vector[@0xA], &mut ctx);

    // Adding the same address twice should not double-count.
    dapp_service::add_scene_participant(&mut id, &mut meta, @0xA);
    assert!(dapp_service::scene_participant_count(&meta) == 1, 0);

    sui::object::delete(id);
}

#[test]
fun test_remove_nonexistent_participant_noop() {
    let mut ctx = sui::tx_context::dummy();
    let (mut id, mut meta) = make_permanent_scene(vector[@0xA], &mut ctx);

    // Removing a non-participant is a no-op.
    dapp_service::remove_scene_participant(&mut id, &mut meta, @0xB);
    assert!(dapp_service::scene_participant_count(&meta) == 1, 0);

    sui::object::delete(id);
}

// ─── max_participants enforcement ─────────────────────────────────────────────

#[test]
#[expected_failure]
fun test_max_participants_cap_enforced() {
    let mut ctx = sui::tx_context::dummy();
    let mut id = sui::object::new(&mut ctx);
    // cap = 1 participant
    let mut meta = dapp_system::init_scene_meta(&mut id, vector[@0xA], std::option::none(), std::option::some(1u64));

    // Adding a second participant should abort.
    dapp_service::add_scene_participant(&mut id, &mut meta, @0xB);

    sui::object::delete(id);
}

// ─── SceneMetadata basics ─────────────────────────────────────────────────────

#[test]
fun test_scene_expires_at_accessor() {
    let mut ctx = sui::tx_context::dummy();
    let (id_perm, meta_perm) = make_permanent_scene(vector[@0xA], &mut ctx);
    assert!(dapp_service::scene_expires_at(&meta_perm).is_none(), 0);
    sui::object::delete(id_perm);

    let (id_exp, meta_exp) = make_scene(vector[@0xA], std::option::some(9_999), &mut ctx);
    let opt = dapp_service::scene_expires_at(&meta_exp);
    assert!(opt.is_some(), 1);
    assert!(*opt.borrow() == 9_999, 2);
    sui::object::delete(id_exp);
}

#[test]
fun test_scene_meta_active_with_none_expiry() {
    let mut ctx = sui::tx_context::dummy();
    let (id, meta) = make_permanent_scene(vector[@0xA, @0xB], &mut ctx);
    assert!(dapp_service::is_scene_active(&meta, 0), 0);
    assert!(dapp_service::is_scene_active(&meta, 999_999_999_999), 1);
    sui::object::delete(id);
}

#[test]
fun test_scene_meta_active_before_expiry() {
    let mut ctx = sui::tx_context::dummy();
    let (id, meta) = make_scene(vector[@0xA], std::option::some(1_000_000), &mut ctx);
    assert!(dapp_service::is_scene_active(&meta, 999_999), 0);
    sui::object::delete(id);
}

#[test]
fun test_scene_meta_expired_at_deadline() {
    let mut ctx = sui::tx_context::dummy();
    let (id, meta) = make_scene(vector[@0xA], std::option::some(1_000_000), &mut ctx);
    // At exactly expires_at the scene is considered expired.
    assert!(!dapp_service::is_scene_active(&meta, 1_000_000), 0);
    sui::object::delete(id);
}

#[test]
fun test_scene_meta_participant_check() {
    let mut ctx = sui::tx_context::dummy();
    let (id, _meta) = make_permanent_scene(vector[@0xA, @0xB], &mut ctx);
    assert!(dapp_service::is_scene_participant(&id, @0xA), 0);
    assert!(dapp_service::is_scene_participant(&id, @0xB), 1);
    assert!(!dapp_service::is_scene_participant(&id, @0xC), 2);
    sui::object::delete(id);
}

// ─── set_record_reactive: happy path ─────────────────────────────────────────

#[test]
fun test_set_record_reactive_ok() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let (id, meta) = make_permanent_scene(vector[sender, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(100), &mut ctx,
    );

    assert!(dapp_service::has_user_record<SceneKey>(&target, key_for(b"hp")), 0);
    assert!(dapp_service::write_count(&from) == 1, 1);
    assert!(dapp_service::write_count(&target) == 0, 2);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    sui::object::delete(id);
}

// ─── set_record_reactive: initiator not in scene ─────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_initiator_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // sender is NOT in participants.
    let (id, meta) = make_permanent_scene(vector[@0xAAAA, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    sui::object::delete(id);
}

// ─── set_record_reactive: target not in scene ────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_target_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // Target (@0xCCCC) is not in participants.
    let (id, meta) = make_permanent_scene(vector[sender, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xCCCC, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    sui::object::delete(id);
}

// ─── set_record_reactive: expired scene ──────────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_expired_scene_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    // expires_at = 0 → already expired (dummy epoch_timestamp_ms = 0 means expired AT 0).
    let (id, meta) = make_scene(vector[sender, @0xBBBB], std::option::some(0), &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    sui::object::delete(id);
}

// ─── set_field_reactive: happy path ──────────────────────────────────────────

#[test]
fun test_set_field_reactive_ok() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let (id, meta) = make_permanent_scene(vector[sender, @0xDDDD], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xDDDD, &mut ctx);

    // First create the record in target.
    dapp_system::set_record_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"stats"), vector[b"hp", b"mp"], vector[to_bytes(&100u64), to_bytes(&50u64)], &mut ctx,
    );

    // Now update just one field reactively.
    dapp_system::set_field_reactive<SceneKey>(
        SceneKey {}, &id, &meta, &mut from, &mut target,
        key_for(b"stats"), b"hp", to_bytes(&80u64), &mut ctx,
    );

    assert!(dapp_service::write_count(&from) == 2, 0);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    sui::object::delete(id);
}

// ─── Invitation flow tests ─────────────────────────────────────────────────

#[test]
fun test_accept_invitation_moves_invitee_to_participants() {
    let alice = @0xA;
    let bob   = @0xB;
    let ctx   = &mut tx_context::new_from_hint(alice, 0, 10, 0, 0);

    let mut id = sui::object::new(ctx);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[alice, bob],
        std::option::none(),
        std::option::none(),
        std::option::none(),
    );

    // Alice has not yet accepted — not a participant yet.
    assert!(!dapp_service::is_scene_participant(&id, alice), 0);
    assert!(dapp_service::is_scene_invitee(&meta, alice), 1);

    // Alice accepts.
    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);

    assert!(dapp_service::is_scene_participant(&id, alice), 2);
    assert!(!dapp_service::is_scene_invitee(&meta, alice), 3);
    // Bob is still pending.
    assert!(dapp_service::is_scene_invitee(&meta, bob), 4);
    assert!(!dapp_service::is_scene_participant(&id, bob), 5);

    sui::object::delete(id);
}

#[test]
fun test_accept_invitation_with_expiry_in_window() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);

    let mut id = sui::object::new(ctx);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[alice],
        std::option::some(1_000),
        std::option::none(),
        std::option::none(),
    );

    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    assert!(dapp_service::is_scene_participant(&id, alice), 0);

    sui::object::delete(id);
}

#[test]
#[expected_failure]
fun test_accept_invitation_expired_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 2_000, 0);

    let mut id = sui::object::new(ctx);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[alice],
        std::option::some(1_000),
        std::option::none(),
        std::option::none(),
    );

    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    sui::object::delete(id);
}

#[test]
#[expected_failure]
fun test_accept_invitation_not_invited_aborts() {
    let charlie = @0xC;
    let ctx = &mut tx_context::new_from_hint(charlie, 0, 0, 0, 0);

    let mut id = sui::object::new(ctx);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[@0xA],
        std::option::none(),
        std::option::none(),
        std::option::none(),
    );

    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    sui::object::delete(id);
}

#[test]
fun test_all_invitees_accept_flow() {
    let alice = @0xA;
    let bob   = @0xB;

    let ctx_a = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);
    let mut id = sui::object::new(ctx_a);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[alice, bob],
        std::option::none(),
        std::option::none(),
        std::option::none(),
    );

    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx_a);

    let ctx_b = &mut tx_context::new_from_hint(bob, 0, 0, 0, 0);
    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx_b);

    assert!(dapp_service::is_scene_participant(&id, alice), 0);
    assert!(dapp_service::is_scene_participant(&id, bob), 1);
    assert!(dapp_service::scene_invitees(&meta).is_empty(), 2);
    assert!(dapp_service::scene_participant_count(&meta) == 2, 3);

    sui::object::delete(id);
}

#[test]
#[expected_failure]
fun test_accept_invitation_twice_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);

    let mut id = sui::object::new(ctx);
    let mut meta = dapp_system::new_scene_meta_with_invitations(
        vector[alice],
        std::option::none(),
        std::option::none(),
        std::option::none(),
    );

    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    // Second accept must abort (alice no longer in invitees).
    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    sui::object::delete(id);
}

// ─── accept on expired scene aborts ──────────────────────────────────────────

#[test]
#[expected_failure]
fun test_accept_invitation_on_expired_scene_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);
    let mut id = sui::object::new(ctx);
    // scene expires_at = 0, epoch_timestamp = 0 → is_scene_active returns false.
    let mut meta = dapp_service::new_scene_meta_with_invitations(
        vector[alice],
        std::option::none(),      // invites_expire_at: open
        std::option::some(0u64), // scene_expires_at = 0 → already expired
        std::option::none(),
    );
    // Must abort with ESceneExpired before checking invitees.
    dapp_system::accept_scene_invitation<SceneKey>(SceneKey {}, &mut id, &mut meta, ctx);
    sui::object::delete(id);
}
