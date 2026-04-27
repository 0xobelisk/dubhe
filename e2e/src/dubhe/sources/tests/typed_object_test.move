/// Unit tests — Typed ObjectStorage (entity_id uniqueness + adminOnly guard)
///
/// Covers:
///   - create_object / destroy_object framework primitives
///   - entity_id uniqueness enforcement within a type_tag
///   - Different type_tags can share the same entity_id bytes without collision
///   - has_object_entity_id / get_object_entity_id read helpers
#[test_only]
module dubhe::typed_object_test;

use dubhe::dapp_service::{Self, DappStorage};
use dubhe::dapp_system;

public struct ObjectKey has copy, drop {}
public struct OtherKey has copy, drop {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_ds(ctx: &mut TxContext): DappStorage {
    dapp_service::create_dapp_storage_for_testing<ObjectKey>(ctx)
}

// ─── create_object: happy path ────────────────────────────────────────────────

#[test]
fun test_create_object_registers_entity_id() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    let uid = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"guild_001", &mut ctx,
    );

    assert!(dapp_service::has_object_entity_id(&ds, b"guild", b"guild_001"), 0);

    let stored_addr = dapp_service::get_object_entity_id(&ds, b"guild", b"guild_001");
    assert!(stored_addr == object::uid_to_address(&uid), 1);

    object::delete(uid);
    dapp_service::destroy_dapp_storage(ds);
}

// ─── entity_id uniqueness within same type_tag ────────────────────────────────

#[test]
#[expected_failure]
fun test_duplicate_entity_id_same_type_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    let uid1 = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"dup_id", &mut ctx,
    );
    // Second create with same (type_tag, entity_id) must abort.
    let uid2 = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"dup_id", &mut ctx,
    );

    object::delete(uid1);
    object::delete(uid2);
    dapp_service::destroy_dapp_storage(ds);
}

// ─── different type_tags may share the same entity_id ─────────────────────────

#[test]
fun test_same_entity_id_different_type_tags_ok() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    // A guild and a boss can both be called b"leader" without conflict.
    let uid_guild = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"leader", &mut ctx,
    );
    let uid_boss = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"boss", b"leader", &mut ctx,
    );

    assert!(dapp_service::has_object_entity_id(&ds, b"guild", b"leader"), 0);
    assert!(dapp_service::has_object_entity_id(&ds, b"boss", b"leader"), 1);

    object::delete(uid_guild);
    object::delete(uid_boss);
    dapp_service::destroy_dapp_storage(ds);
}

// ─── destroy_object cleans up the mapping ────────────────────────────────────

#[test]
fun test_destroy_object_removes_entity_id() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    let uid = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"to_destroy", &mut ctx,
    );

    assert!(dapp_service::has_object_entity_id(&ds, b"guild", b"to_destroy"), 0);

    dapp_system::destroy_object<ObjectKey>(ObjectKey {}, &mut ds, b"guild", b"to_destroy", uid);

    assert!(!dapp_service::has_object_entity_id(&ds, b"guild", b"to_destroy"), 1);

    dapp_service::destroy_dapp_storage(ds);
}

// ─── entity_id can be reused after destroy ────────────────────────────────────

#[test]
fun test_entity_id_reuse_after_destroy() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = make_ds(&mut ctx);

    let uid1 = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"reuse_id", &mut ctx,
    );
    dapp_system::destroy_object<ObjectKey>(ObjectKey {}, &mut ds, b"guild", b"reuse_id", uid1);

    // Should succeed now.
    let uid2 = dapp_system::create_object<ObjectKey>(
        ObjectKey {}, &mut ds, b"guild", b"reuse_id", &mut ctx,
    );

    assert!(dapp_service::has_object_entity_id(&ds, b"guild", b"reuse_id"), 0);

    object::delete(uid2);
    dapp_service::destroy_dapp_storage(ds);
}

// ─── dapp_key_mismatch guard ──────────────────────────────────────────────────

#[test]
#[expected_failure]
fun test_create_object_wrong_dapp_key_aborts() {
    let mut ctx = sui::tx_context::dummy();
    // ds is bound to ObjectKey, but we try to create with OtherKey.
    let mut ds = make_ds(&mut ctx);

    let uid = dapp_system::create_object<OtherKey>(
        OtherKey {}, &mut ds, b"guild", b"mismatch", &mut ctx,
    );
    object::delete(uid);
    dapp_service::destroy_dapp_storage(ds);
}
