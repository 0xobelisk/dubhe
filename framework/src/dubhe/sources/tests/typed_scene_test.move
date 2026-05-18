/// Unit tests — Typed SceneStorage and reactive writes
///
/// Covers:
///   - ScenePermit participant management (O(1) dynamic fields)
///   - is_scene_active / is_participant_in_scene_permit
///   - set_record_reactive: four-layer security checks
///   - set_field_reactive: same security model
///   - Invitation flow: create_with_invitations + accept_scene_permit_invitation
#[test_only]
module dubhe::typed_scene_test;

use dubhe::dapp_service::{Self, UserStorage, ScenePermit};
use dubhe::dapp_system;
use sui::bcs::to_bytes;
use sui::tx_context;

public struct SceneKey has copy, drop {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_us(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<SceneKey>(owner, ctx)
}

/// Create a ScenePermit with confirmed participants.
fun make_permit(
    participants: vector<address>,
    expires_at:   std::option::Option<u64>,
    ctx:          &mut TxContext,
): ScenePermit<SceneKey> {
    dapp_service::create_scene_permit_for_testing<SceneKey, SceneKey>(
        participants, expires_at, std::option::none(), ctx,
    )
}

/// Create a ScenePermit with a participant cap.
fun make_permit_with_cap(
    participants:     vector<address>,
    max_participants: u64,
    ctx:              &mut TxContext,
): ScenePermit<SceneKey> {
    dapp_service::create_scene_permit_for_testing<SceneKey, SceneKey>(
        participants, std::option::none(), std::option::some(max_participants), ctx,
    )
}

/// Create a ScenePermit in invitation mode (no confirmed participants yet).
fun make_permit_with_invitations(
    invitees:          vector<address>,
    invites_expire_at: std::option::Option<u64>,
    expires_at:        std::option::Option<u64>,
    ctx:               &mut TxContext,
): ScenePermit<SceneKey> {
    dapp_service::create_scene_permit_with_invitations_for_testing<SceneKey, SceneKey>(
        invitees, invites_expire_at, expires_at, ctx,
    )
}

fun make_permanent_permit(
    participants: vector<address>,
    ctx:          &mut TxContext,
): ScenePermit<SceneKey> {
    make_permit(participants, std::option::none(), ctx)
}

fun key_for(name: vector<u8>): vector<vector<u8>> { vector[name] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u64_val(v: u64): vector<vector<u8>> { vector[to_bytes(&v)] }

// ─── ScenePermit participant management ───────────────────────────────────────

#[test]
fun test_add_remove_permit_participant() {
    let mut ctx = sui::tx_context::dummy();
    let mut permit = make_permanent_permit(vector[@0xAAAA], &mut ctx);

    assert!(!dapp_service::is_participant_in_scene_permit(&permit, @0xBBBB), 0);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 1, 1);

    dapp_service::add_participant_in_scene_permit(&mut permit, @0xBBBB);
    assert!(dapp_service::is_participant_in_scene_permit(&permit, @0xBBBB), 2);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 2, 3);

    dapp_service::remove_participant_in_scene_permit(&mut permit, @0xBBBB);
    assert!(!dapp_service::is_participant_in_scene_permit(&permit, @0xBBBB), 4);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 1, 5);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_add_participant_idempotent() {
    let mut ctx = sui::tx_context::dummy();
    let mut permit = make_permanent_permit(vector[@0xA], &mut ctx);

    dapp_service::add_participant_in_scene_permit(&mut permit, @0xA);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 1, 0);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_remove_nonexistent_participant_noop() {
    let mut ctx = sui::tx_context::dummy();
    let mut permit = make_permanent_permit(vector[@0xA], &mut ctx);

    dapp_service::remove_participant_in_scene_permit(&mut permit, @0xB);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 1, 0);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_max_participants_cap_enforced() {
    let mut ctx = sui::tx_context::dummy();
    let mut permit = make_permit_with_cap(vector[@0xA], 1, &mut ctx);

    dapp_service::add_participant_in_scene_permit(&mut permit, @0xB);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── PermitMetadata basics ─────────────────────────────────────────────────────

#[test]
fun test_scene_expires_at_accessor() {
    let mut ctx = sui::tx_context::dummy();

    let permit_perm = make_permanent_permit(vector[@0xA], &mut ctx);
    assert!(dapp_service::scene_expires_at(dapp_service::scene_permit_meta(&permit_perm)).is_none(), 0);
    dapp_service::destroy_scene_permit_for_testing(permit_perm);

    let permit_exp = make_permit(vector[@0xA], std::option::some(9_999), &mut ctx);
    let opt = dapp_service::scene_expires_at(dapp_service::scene_permit_meta(&permit_exp));
    assert!(opt.is_some(), 1);
    assert!(*opt.borrow() == 9_999, 2);
    dapp_service::destroy_scene_permit_for_testing(permit_exp);
}

#[test]
fun test_scene_meta_active_with_none_expiry() {
    let mut ctx = sui::tx_context::dummy();
    let permit = make_permanent_permit(vector[@0xA, @0xB], &mut ctx);
    assert!(dapp_service::is_scene_active(dapp_service::scene_permit_meta(&permit), 0), 0);
    assert!(dapp_service::is_scene_active(dapp_service::scene_permit_meta(&permit), 999_999_999_999), 1);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_scene_meta_active_before_expiry() {
    let mut ctx = sui::tx_context::dummy();
    let permit = make_permit(vector[@0xA], std::option::some(1_000_000), &mut ctx);
    assert!(dapp_service::is_scene_active(dapp_service::scene_permit_meta(&permit), 999_999), 0);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_scene_meta_expired_at_deadline() {
    let mut ctx = sui::tx_context::dummy();
    let permit = make_permit(vector[@0xA], std::option::some(1_000_000), &mut ctx);
    assert!(!dapp_service::is_scene_active(dapp_service::scene_permit_meta(&permit), 1_000_000), 0);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_scene_meta_participant_check() {
    let mut ctx = sui::tx_context::dummy();
    let permit = make_permanent_permit(vector[@0xA, @0xB], &mut ctx);
    assert!(dapp_service::is_participant_in_scene_permit(&permit, @0xA), 0);
    assert!(dapp_service::is_participant_in_scene_permit(&permit, @0xB), 1);
    assert!(!dapp_service::is_participant_in_scene_permit(&permit, @0xC), 2);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── set_record_reactive: happy path ─────────────────────────────────────────

#[test]
fun test_set_record_reactive_ok() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let permit  = make_permanent_permit(vector[sender, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(100), &mut ctx,
    );

    assert!(dapp_service::has_user_record<SceneKey>(&target, key_for(b"hp")), 0);
    assert!(dapp_service::write_count(&from) == 1, 1);
    assert!(dapp_service::write_count(&target) == 0, 2);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── set_record_reactive: initiator not in scene ─────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_initiator_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let permit  = make_permanent_permit(vector[@0xAAAA, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── set_record_reactive: target not in scene ────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_target_not_participant_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let permit  = make_permanent_permit(vector[sender, @0xBBBB], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xCCCC, &mut ctx);

    dapp_system::set_record_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── set_record_reactive: expired scene ──────────────────────────────────────

#[test]
#[expected_failure]
fun test_reactive_expired_scene_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let permit  = make_permit(vector[sender, @0xBBBB], std::option::some(0), &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xBBBB, &mut ctx);

    dapp_system::set_record_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), fns(), u64_val(50), &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── set_field_reactive: happy path ──────────────────────────────────────────

#[test]
fun test_set_field_reactive_ok() {
    let mut ctx = sui::tx_context::dummy();
    let sender = ctx.sender();

    let permit  = make_permanent_permit(vector[sender, @0xDDDD], &mut ctx);
    let mut from   = make_us(sender, &mut ctx);
    let mut target = make_us(@0xDDDD, &mut ctx);

    dapp_system::set_record_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"stats"), vector[b"hp", b"mp"], vector[to_bytes(&100u64), to_bytes(&50u64)], &mut ctx,
    );

    dapp_system::set_field_reactive<SceneKey, SceneKey>(
        SceneKey {}, &permit, &mut from, &mut target,
        key_for(b"stats"), b"hp", to_bytes(&80u64), &mut ctx,
    );

    assert!(dapp_service::write_count(&from) == 2, 0);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ─── Invitation flow tests ─────────────────────────────────────────────────────

#[test]
fun test_accept_invitation_moves_invitee_to_participants() {
    let alice = @0xA;
    let bob   = @0xB;
    let ctx   = &mut tx_context::new_from_hint(alice, 0, 10, 0, 0);

    let mut permit = make_permit_with_invitations(
        vector[alice, bob],
        std::option::none(),
        std::option::none(),
        ctx,
    );

    assert!(!dapp_service::is_participant_in_scene_permit(&permit, alice), 0);
    assert!(dapp_service::is_scene_invitee(dapp_service::scene_permit_meta(&permit), alice), 1);

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);

    assert!(dapp_service::is_participant_in_scene_permit(&permit, alice), 2);
    assert!(!dapp_service::is_scene_invitee(dapp_service::scene_permit_meta(&permit), alice), 3);
    assert!(dapp_service::is_scene_invitee(dapp_service::scene_permit_meta(&permit), bob), 4);
    assert!(!dapp_service::is_participant_in_scene_permit(&permit, bob), 5);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_accept_invitation_with_expiry_in_window() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);

    let mut permit = make_permit_with_invitations(
        vector[alice],
        std::option::some(1_000),
        std::option::none(),
        ctx,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    assert!(dapp_service::is_participant_in_scene_permit(&permit, alice), 0);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_accept_invitation_expired_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 2_000, 0);

    let mut permit = make_permit_with_invitations(
        vector[alice],
        std::option::some(1_000),
        std::option::none(),
        ctx,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_accept_invitation_not_invited_aborts() {
    let charlie = @0xC;
    let ctx = &mut tx_context::new_from_hint(charlie, 0, 0, 0, 0);

    let mut permit = make_permit_with_invitations(
        vector[@0xA],
        std::option::none(),
        std::option::none(),
        ctx,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_all_invitees_accept_flow() {
    let alice = @0xA;
    let bob   = @0xB;

    let ctx_a = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);
    let mut permit = make_permit_with_invitations(
        vector[alice, bob],
        std::option::none(),
        std::option::none(),
        ctx_a,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx_a);

    let ctx_b = &mut tx_context::new_from_hint(bob, 0, 0, 0, 0);
    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx_b);

    assert!(dapp_service::is_participant_in_scene_permit(&permit, alice), 0);
    assert!(dapp_service::is_participant_in_scene_permit(&permit, bob), 1);
    assert!(dapp_service::scene_invitees(dapp_service::scene_permit_meta(&permit)).is_empty(), 2);
    assert!(dapp_service::scene_participant_count(dapp_service::scene_permit_meta(&permit)) == 2, 3);

    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_accept_invitation_twice_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);

    let mut permit = make_permit_with_invitations(
        vector[alice],
        std::option::none(),
        std::option::none(),
        ctx,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_accept_invitation_on_expired_scene_aborts() {
    let alice = @0xA;
    let ctx = &mut tx_context::new_from_hint(alice, 0, 0, 0, 0);

    // scene expires_at = 0 → already expired at epoch_timestamp_ms = 0
    let mut permit = make_permit_with_invitations(
        vector[alice],
        std::option::none(),
        std::option::some(0u64),
        ctx,
    );

    dapp_system::accept_scene_permit_invitation<SceneKey, SceneKey>(SceneKey {}, &mut permit, ctx);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

