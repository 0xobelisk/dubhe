/// Unit tests — Session keys acting in scenes
///
/// Sessions are delegated proxies: a transaction signed by an active session
/// key must be able to perform in-scene actions on behalf of its canonical
/// owner, while the on-chain identity (permit participants, scene events)
/// always resolves to the canonical owner address.
///
/// Covers:
///   reactive writes:
///     session key may initiate set_record_reactive / set_field_reactive
///     expired session is rejected
///     stranger (neither owner nor session) is rejected
///   permit participation:
///     join_scene_permit registers the canonical owner, not the session address
///     accept_scene_permit_invitation moves the canonical owner to participants
///     leave_scene_permit removes the canonical owner
///     unauthorized sender cannot join on someone else's behalf
///   scene field writes:
///     session key may set_scene_field / remove_scene_field
///     non-participant canonical owner is rejected
#[test_only]
module dubhe::scene_session_test;

use dubhe::dapp_service::{Self, UserStorage, ScenePermit};
use dubhe::dapp_system;
use sui::bcs::to_bytes;
use sui::tx_context;

public struct SceneSessionKey has copy, drop {}

const OWNER:   address = @0xA1;
const SESSION: address = @0xA2;
const PEER:    address = @0xB1;
const OTHER:   address = @0xC1;

const NOW:             u64 = 1_000;
const SESSION_EXPIRES: u64 = 10_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_us(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<SceneSessionKey>(owner, ctx)
}

/// UserStorage owned by `owner` with an active session key bound to SESSION.
fun make_us_with_session(owner: address, ctx: &mut TxContext): UserStorage {
    let mut us = make_us(owner, ctx);
    dapp_service::set_session_key_for_testing(&mut us, SESSION, SESSION_EXPIRES);
    us
}

fun make_permit(
    participants: vector<address>,
    ctx:          &mut TxContext,
): ScenePermit<SceneSessionKey> {
    dapp_service::create_scene_permit_for_testing<SceneSessionKey, SceneSessionKey>(
        participants, std::option::none(), std::option::none(), ctx,
    )
}

/// Transaction context whose sender is `sender` at epoch time NOW.
fun ctx_for(sender: address): TxContext {
    tx_context::new_from_hint(sender, 0, 0, NOW, 0)
}

fun key_for(name: vector<u8>): vector<vector<u8>> { vector[name] }

// ═══════════════════════════════════════════════════════════════════════════════
// Reactive writes initiated by a session key
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_session_can_initiate_reactive_write() {
    let mut ctx = ctx_for(SESSION);

    let permit     = make_permit(vector[OWNER, PEER], &mut ctx);
    let mut from   = make_us_with_session(OWNER, &mut ctx);
    let mut target = make_us(PEER, &mut ctx);

    dapp_system::set_record_reactive<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), vector[b"v"], vector[to_bytes(&100u64)], &mut ctx,
    );
    dapp_system::set_field_reactive<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), b"v", to_bytes(&80u64), &mut ctx,
    );

    assert!(dapp_service::has_user_record<SceneSessionKey>(&target, key_for(b"hp")), 0);
    // Fees are charged to the initiator's storage, not the target's.
    assert!(dapp_service::write_count(&from) == 2, 1);
    assert!(dapp_service::write_count(&target) == 0, 2);

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_expired_session_reactive_aborts() {
    // Session expires exactly at SESSION_EXPIRES — a transaction at that time is rejected.
    let mut ctx = tx_context::new_from_hint(SESSION, 0, 0, SESSION_EXPIRES, 0);

    let permit     = make_permit(vector[OWNER, PEER], &mut ctx);
    let mut from   = make_us_with_session(OWNER, &mut ctx);
    let mut target = make_us(PEER, &mut ctx);

    dapp_system::set_record_reactive<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), vector[b"v"], vector[to_bytes(&100u64)], &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_stranger_reactive_aborts() {
    let mut ctx = ctx_for(OTHER);

    let permit     = make_permit(vector[OWNER, PEER], &mut ctx);
    let mut from   = make_us_with_session(OWNER, &mut ctx);
    let mut target = make_us(PEER, &mut ctx);

    dapp_system::set_record_reactive<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &permit, &mut from, &mut target,
        key_for(b"hp"), vector[b"v"], vector[to_bytes(&100u64)], &mut ctx,
    );

    dapp_service::destroy_user_storage(from);
    dapp_service::destroy_user_storage(target);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Permit participation through a session key registers the canonical owner
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_session_join_registers_canonical_owner() {
    let mut ctx = ctx_for(SESSION);

    let mut permit = make_permit(vector[], &mut ctx);
    let us = make_us_with_session(OWNER, &mut ctx);

    dapp_system::join_scene_permit<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &mut permit, &us, &ctx,
    );

    assert!(dapp_service::is_participant_in_scene_permit(&permit, OWNER), 0);
    assert!(!dapp_service::is_participant_in_scene_permit(&permit, SESSION), 1);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_session_accept_invitation_registers_canonical_owner() {
    let mut ctx = ctx_for(SESSION);

    let mut permit = dapp_service::create_scene_permit_with_invitations_for_testing<
        SceneSessionKey, SceneSessionKey
    >(vector[OWNER], std::option::none(), std::option::none(), &mut ctx);
    let us = make_us_with_session(OWNER, &mut ctx);

    dapp_system::accept_scene_permit_invitation<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &mut permit, &us, &ctx,
    );

    assert!(dapp_service::is_participant_in_scene_permit(&permit, OWNER), 0);
    assert!(!dapp_service::is_participant_in_scene_permit(&permit, SESSION), 1);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
fun test_session_leave_removes_canonical_owner() {
    let mut ctx = ctx_for(SESSION);

    let mut permit = make_permit(vector[OWNER], &mut ctx);
    let us = make_us_with_session(OWNER, &mut ctx);

    dapp_system::leave_scene_permit<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &mut permit, &us, &ctx,
    );

    assert!(!dapp_service::is_participant_in_scene_permit(&permit, OWNER), 0);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

#[test]
#[expected_failure]
fun test_join_unauthorized_sender_aborts() {
    // OTHER is neither the canonical owner nor the session key of `us`.
    let mut ctx = ctx_for(OTHER);

    let mut permit = make_permit(vector[], &mut ctx);
    let us = make_us_with_session(OWNER, &mut ctx);

    dapp_system::join_scene_permit<SceneSessionKey, SceneSessionKey>(
        SceneSessionKey {}, &mut permit, &us, &ctx,
    );

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scene field writes through a session key
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_session_set_and_remove_scene_field() {
    let mut ctx = ctx_for(SESSION);

    let ds     = dapp_service::create_dapp_storage_for_testing<SceneSessionKey>(&mut ctx);
    let permit = make_permit(vector[OWNER], &mut ctx);
    let us     = make_us_with_session(OWNER, &mut ctx);

    let mut scene = dapp_system::new_typed_scene_with_permit<
        SceneSessionKey, SceneSessionKey, SceneSessionKey
    >(SceneSessionKey {}, &ds, &permit, b"battle", &mut ctx);

    dapp_system::set_scene_field<SceneSessionKey, SceneSessionKey, SceneSessionKey, u64>(
        SceneSessionKey {}, &permit, &mut scene, &us, b"hp", 100u64, &ctx,
    );
    assert!(dapp_system::get_scene_field<SceneSessionKey, u64>(&scene, b"hp") == 100, 0);

    let removed: u64 = dapp_system::remove_scene_field<
        SceneSessionKey, SceneSessionKey, SceneSessionKey, u64
    >(SceneSessionKey {}, &permit, &mut scene, &us, b"hp", &ctx);
    assert!(removed == 100, 1);

    dapp_system::destroy_typed_scene<SceneSessionKey, SceneSessionKey>(SceneSessionKey {}, scene);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
    dapp_system::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_scene_field_non_participant_aborts() {
    // `us` belongs to OTHER who never joined the permit — write must abort
    // even though OTHER signed the transaction themselves.
    let mut ctx = ctx_for(OTHER);

    let ds     = dapp_service::create_dapp_storage_for_testing<SceneSessionKey>(&mut ctx);
    let permit = make_permit(vector[OWNER], &mut ctx);
    let us     = make_us(OTHER, &mut ctx);

    let mut scene = dapp_system::new_typed_scene_with_permit<
        SceneSessionKey, SceneSessionKey, SceneSessionKey
    >(SceneSessionKey {}, &ds, &permit, b"battle", &mut ctx);

    dapp_system::set_scene_field<SceneSessionKey, SceneSessionKey, SceneSessionKey, u64>(
        SceneSessionKey {}, &permit, &mut scene, &us, b"hp", 100u64, &ctx,
    );

    dapp_system::destroy_typed_scene<SceneSessionKey, SceneSessionKey>(SceneSessionKey {}, scene);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_scene_permit_for_testing(permit);
    dapp_system::destroy_dapp_storage(ds);
}
