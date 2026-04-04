/// Unit tests — Storage read/write operations
///
/// Covers UserStorage and DappStorage record/field operations:
///   set_record, set_field, delete_record, delete_field (UserStorage)
///   set_global_record, set_global_field, delete_global_record, delete_global_field (DappStorage)
///   Read helpers: has_record, get_field, ensure_has_record, ensure_has_not_record
///   Error guards: dapp_key_mismatch, write_authorization, write_limit
///   Error guards: ELengthMismatch (field_names/values length mismatch, user + global)
///   Error guards: EInvalidKey (set_field / set_global_field on non-existent record)
///
/// Design: every test uses sui::tx_context::dummy() — no test_scenario needed.
/// Authorization tests use a UserStorage owned by @0xDEAD so ctx.sender() ≠ owner.
/// DappKey-mismatch tests use ctx.sender() as owner so only the key check fires.
#[test_only]
module dubhe::storage_test;

use dubhe::dapp_service::{Self, UserStorage, DappStorage, DappHub};
use dubhe::dapp_system;
use sui::bcs;
use sui::bcs::to_bytes;

// Two distinct DApp key types used to trigger dapp_key_mismatch.
public struct StoreKey has copy, drop {}
public struct WrongKey has copy, drop {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun k(name: vector<u8>): vector<vector<u8>> { vector[name] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u32_val(v: u32): vector<vector<u8>> { vector[to_bytes(&v)] }

// Free-tier DappHub (fee=0) — used by most tests so global writes need no credit.
fun make_dh(ctx: &mut TxContext): DappHub {
    dapp_service::create_free_dapp_hub_for_testing(ctx)
}

// Paid DappHub (base_fee=1000) — used only by write-limit tests that enforce debt ceiling.
fun make_paid_dh(ctx: &mut TxContext): DappHub {
    dapp_service::create_dapp_hub_for_testing(ctx)
}

// UserStorage owned by ctx.sender() — auth check passes.
fun us_owned(ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<StoreKey>(ctx.sender(), ctx)
}

// UserStorage owned by a foreign address — auth check fails.
fun us_foreign(ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<StoreKey>(@0xDEAD, ctx)
}

// UserStorage with StoreKey but owned by ctx.sender() — used for key-mismatch tests.
fun us_for_mismatch(ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<StoreKey>(ctx.sender(), ctx)
}

fun ds(ctx: &mut TxContext): DappStorage {
    dapp_service::create_dapp_storage_for_testing<StoreKey>(ctx)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — set_record
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_record_creates_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    assert!(!dapp_system::has_record<StoreKey>(&us, k(b"hp")));
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(100), false, &mut ctx);
    assert!(dapp_system::has_record<StoreKey>(&us, k(b"hp")));

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_record_overwrites_existing_value() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(50), false, &mut ctx);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(99), false, &mut ctx);

    let raw = dapp_system::get_field<StoreKey>(&us, k(b"hp"), b"v");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 99);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_record_increments_write_count() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    assert!(dapp_service::write_count(&us) == 0);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"a"), fns(), u32_val(1), false, &mut ctx);
    assert!(dapp_service::write_count(&us) == 1);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"b"), fns(), u32_val(2), false, &mut ctx);
    assert!(dapp_service::write_count(&us) == 2);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_record_offchain_increments_write_count_but_not_bytes() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"x"), fns(), u32_val(7), true, &mut ctx);

    // Off-chain writes emit an event but do NOT store data on-chain.
    // write_count is still incremented (the framework was used); write_bytes stays 0.
    assert!(dapp_service::write_count(&us) == 1);
    assert!(dapp_service::write_bytes(&us) == 0);
    assert!(!dapp_system::has_record<StoreKey>(&us, k(b"x")));

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_record_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_for_mismatch(&mut ctx);
    // WrongKey does not match UserStorage's StoreKey → dapp_key_mismatch
    dapp_system::set_record<WrongKey>(WrongKey {}, &dh, &mut us, k(b"x"), fns(), u32_val(1), false, &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_record_aborts_when_not_authorized() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    // canonical_owner = @0xDEAD ≠ ctx.sender() → no_permission
    let mut us = us_foreign(&mut ctx);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"x"), fns(), u32_val(1), false, &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_record_aborts_at_write_limit() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_paid_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    // base_fee=1000, max_unsettled_charge=200_000 → 200 writes exhaust the limit.
    let max_writes = 200u64;
    let mut i = 0u64;
    while (i < max_writes) {
        dapp_service::increment_write_count(&mut us);
        i = i + 1;
    };

    // One write over the limit must abort.
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"over"), fns(), u32_val(0), false, &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — set_field
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_field_updates_single_field() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    // Write a record with two fields.
    dapp_system::set_record<StoreKey>(
        StoreKey {}, &dh, &mut us, k(b"p"),
        vector[b"hp", b"mp"],
        vector[to_bytes(&10u32), to_bytes(&20u32)],
        false, &mut ctx
    );

    // Update only "hp".
    dapp_system::set_field<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), b"hp", to_bytes(&99u32), &mut ctx);

    let raw_hp = dapp_system::get_field<StoreKey>(&us, k(b"p"), b"hp");
    let mut b = bcs::new(raw_hp);
    assert!(bcs::peel_u32(&mut b) == 99);

    // "mp" must remain unchanged.
    let raw_mp = dapp_system::get_field<StoreKey>(&us, k(b"p"), b"mp");
    let mut b2 = bcs::new(raw_mp);
    assert!(bcs::peel_u32(&mut b2) == 20);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_field_increments_write_count() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), fns(), u32_val(1), false, &mut ctx);
    let before = dapp_service::write_count(&us);

    dapp_system::set_field<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), b"v", to_bytes(&2u32), &mut ctx);
    assert!(dapp_service::write_count(&us) == before + 1);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_field_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_for_mismatch(&mut ctx);
    dapp_system::set_field<WrongKey>(WrongKey {}, &dh, &mut us, k(b"p"), b"v", to_bytes(&1u32), &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_field_aborts_when_not_authorized() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_foreign(&mut ctx);
    dapp_system::set_field<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), b"v", to_bytes(&1u32), &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — delete_record
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_delete_record_removes_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(100), false, &mut ctx);
    assert!(dapp_system::has_record<StoreKey>(&us, k(b"hp")));

    dapp_system::delete_record<StoreKey>(StoreKey {}, &mut us, k(b"hp"), fns(), &ctx);
    assert!(!dapp_system::has_record<StoreKey>(&us, k(b"hp")));

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_delete_record_does_not_increment_write_count() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(1), false, &mut ctx);
    let count_after_write = dapp_service::write_count(&us);

    dapp_system::delete_record<StoreKey>(StoreKey {}, &mut us, k(b"hp"), fns(), &ctx);
    assert!(dapp_service::write_count(&us) == count_after_write);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_delete_record_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_for_mismatch(&mut ctx);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::delete_record<WrongKey>(WrongKey {}, &mut us, k(b"hp"), fns(), &ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_delete_record_aborts_when_not_authorized() {
    let mut ctx = sui::tx_context::dummy();
    let mut us = us_foreign(&mut ctx);
    dapp_system::delete_record<StoreKey>(StoreKey {}, &mut us, k(b"hp"), fns(), &ctx);
    dapp_service::destroy_user_storage(us);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — delete_field
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_delete_field_removes_only_target_field() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(
        StoreKey {}, &dh, &mut us, k(b"p"),
        vector[b"hp", b"mp"],
        vector[to_bytes(&1u32), to_bytes(&2u32)],
        false, &mut ctx
    );

    dapp_system::delete_field<StoreKey>(StoreKey {}, &mut us, k(b"p"), b"hp", &ctx);

    // "mp" must still be accessible.
    let raw = dapp_system::get_field<StoreKey>(&us, k(b"p"), b"mp");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 2);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_delete_field_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let mut us = us_for_mismatch(&mut ctx);
    dapp_system::delete_field<WrongKey>(WrongKey {}, &mut us, k(b"p"), b"v", &ctx);
    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_delete_field_aborts_when_not_authorized() {
    let mut ctx = sui::tx_context::dummy();
    let mut us = us_foreign(&mut ctx);
    dapp_system::delete_field<StoreKey>(StoreKey {}, &mut us, k(b"p"), b"v", &ctx);
    dapp_service::destroy_user_storage(us);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — read helpers
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_has_record_false_before_write_true_after() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    assert!(!dapp_system::has_record<StoreKey>(&us, k(b"hp")));
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(1), false, &mut ctx);
    assert!(dapp_system::has_record<StoreKey>(&us, k(b"hp")));

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_ensure_has_record_passes_when_exists() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::ensure_has_record<StoreKey>(&us, k(b"hp"));

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_ensure_has_record_aborts_when_missing() {
    let mut ctx = sui::tx_context::dummy();
    let us = us_owned(&mut ctx);
    dapp_system::ensure_has_record<StoreKey>(&us, k(b"missing"));
    dapp_service::destroy_user_storage(us);
}

#[test]
fun test_ensure_has_not_record_passes_when_missing() {
    let mut ctx = sui::tx_context::dummy();
    let us = us_owned(&mut ctx);
    dapp_system::ensure_has_not_record<StoreKey>(&us, k(b"missing"));
    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_ensure_has_not_record_aborts_when_exists() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"hp"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::ensure_has_not_record<StoreKey>(&us, k(b"hp"));
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_get_field_returns_stored_value() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), fns(), u32_val(42), false, &mut ctx);

    let raw = dapp_system::get_field<StoreKey>(&us, k(b"p"), b"v");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 42);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DappStorage — global record/field operations
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_global_record_creates_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    assert!(!dapp_system::has_global_record<StoreKey>(&d, k(b"map")));
    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"map"), fns(), u32_val(1), false, &mut ctx);
    assert!(dapp_system::has_global_record<StoreKey>(&d, k(b"map")));

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_global_record_overwrites_value() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"cfg"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"cfg"), fns(), u32_val(99), false, &mut ctx);

    let raw = dapp_system::get_global_field<StoreKey>(&d, k(b"cfg"), b"v");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 99);

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_set_global_field_updates_field() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"cfg"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::set_global_field<StoreKey>(StoreKey {}, &dh, &mut d, k(b"cfg"), b"v", to_bytes(&77u32), &mut ctx);

    let raw = dapp_system::get_global_field<StoreKey>(&d, k(b"cfg"), b"v");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 77);

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_delete_global_record_removes_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"tmp"), fns(), u32_val(1), false, &mut ctx);
    assert!(dapp_system::has_global_record<StoreKey>(&d, k(b"tmp")));

    dapp_system::delete_global_record<StoreKey>(StoreKey {}, &mut d, k(b"tmp"), fns());
    assert!(!dapp_system::has_global_record<StoreKey>(&d, k(b"tmp")));

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_delete_global_field_removes_only_target_field() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    dapp_system::set_global_record<StoreKey>(
        StoreKey {}, &dh, &mut d, k(b"cfg"),
        vector[b"a", b"b"],
        vector[to_bytes(&1u32), to_bytes(&2u32)],
        false, &mut ctx
    );
    dapp_system::delete_global_field<StoreKey>(StoreKey {}, &mut d, k(b"cfg"), b"a");

    let raw = dapp_system::get_global_field<StoreKey>(&d, k(b"cfg"), b"b");
    let mut b = bcs::new(raw);
    assert!(bcs::peel_u32(&mut b) == 2);

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_ensure_has_global_record_passes_when_exists() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);

    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"g"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::ensure_has_global_record<StoreKey>(&d, k(b"g"));

    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_ensure_has_global_record_aborts_when_missing() {
    let mut ctx = sui::tx_context::dummy();
    let d = ds(&mut ctx);
    dapp_system::ensure_has_global_record<StoreKey>(&d, k(b"missing"));
    dapp_service::destroy_dapp_storage(d);
}

#[test]
fun test_ensure_has_not_global_record_passes_when_missing() {
    let mut ctx = sui::tx_context::dummy();
    let d = ds(&mut ctx);
    dapp_system::ensure_has_not_global_record<StoreKey>(&d, k(b"missing"));
    dapp_service::destroy_dapp_storage(d);
}

#[test]
#[expected_failure]
fun test_ensure_has_not_global_record_aborts_when_exists() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);
    dapp_system::set_global_record<StoreKey>(StoreKey {}, &dh, &mut d, k(b"g"), fns(), u32_val(1), false, &mut ctx);
    dapp_system::ensure_has_not_global_record<StoreKey>(&d, k(b"g"));
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_global_record_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    // DappStorage keyed to StoreKey; write with WrongKey must abort.
    let mut d = dapp_service::create_dapp_storage_for_testing<StoreKey>(&mut ctx);
    dapp_system::set_global_record<WrongKey>(WrongKey {}, &dh, &mut d, k(b"x"), fns(), u32_val(1), false, &mut ctx);
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_global_field_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = dapp_service::create_dapp_storage_for_testing<StoreKey>(&mut ctx);
    dapp_system::set_global_field<WrongKey>(WrongKey {}, &dh, &mut d, k(b"x"), b"v", to_bytes(&1u32), &mut ctx);
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_delete_global_record_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    // Write a record with the correct key first.
    let mut d = dapp_service::create_dapp_storage_for_testing<StoreKey>(&mut ctx);
    dapp_system::set_global_record<StoreKey>(
        StoreKey {}, &dh, &mut d, k(b"g"), fns(), u32_val(1), false, &mut ctx
    );
    // Attempt delete with the wrong key — must abort with dapp_key_mismatch.
    dapp_system::delete_global_record<WrongKey>(WrongKey {}, &mut d, k(b"g"), fns());
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_delete_global_field_aborts_on_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = dapp_service::create_dapp_storage_for_testing<StoreKey>(&mut ctx);
    dapp_system::set_global_record<StoreKey>(
        StoreKey {}, &dh, &mut d, k(b"g"), vector[b"a", b"b"],
        vector[to_bytes(&1u32), to_bytes(&2u32)], false, &mut ctx
    );
    // Attempt field delete with the wrong key — must abort with dapp_key_mismatch.
    dapp_system::delete_global_field<WrongKey>(WrongKey {}, &mut d, k(b"g"), b"a");
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UserStorage — set_field at write limit
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_set_field_aborts_at_write_limit() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_paid_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);

    // Create a record so the sentinel exists for set_field.
    dapp_system::set_record<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), fns(), u32_val(1), false, &mut ctx);

    // set_record above counted as 1 write; add 199 more to reach the limit of 200.
    let mut i = 1u64;
    while (i < 200) {
        dapp_service::increment_write_count(&mut us);
        i = i + 1;
    };

    // At the limit: unsettled charge ≥ max_unsettled_charge → set_field must abort.
    dapp_system::set_field<StoreKey>(StoreKey {}, &dh, &mut us, k(b"p"), b"v", to_bytes(&99u32), &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELengthMismatch — field_names / values length mismatch
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_set_record_aborts_on_length_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);
    // 2 field names but only 1 value → ELengthMismatch.
    dapp_system::set_record<StoreKey>(
        StoreKey {}, &dh, &mut us, k(b"x"),
        vector[b"a", b"b"],
        vector[to_bytes(&1u32)],
        false, &mut ctx
    );
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_global_record_aborts_on_length_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);
    // 2 field names but only 1 value → ELengthMismatch.
    // Note: charge_global_write fires first (insufficient credit), which also causes failure.
    dapp_system::set_global_record<StoreKey>(
        StoreKey {}, &dh, &mut d, k(b"x"),
        vector[b"a", b"b"],
        vector[to_bytes(&1u32)],
        false, &mut ctx
    );
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EInvalidKey — set_field / set_global_field on a non-existent record
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_set_field_aborts_on_missing_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut us = us_owned(&mut ctx);
    // No record created at k(b"ghost") → set_user_field must abort with EInvalidKey.
    dapp_system::set_field<StoreKey>(StoreKey {}, &dh, &mut us, k(b"ghost"), b"v", to_bytes(&1u32), &mut ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_global_field_aborts_on_missing_record() {
    let mut ctx = sui::tx_context::dummy();
    let dh = make_dh(&mut ctx);
    let mut d = ds(&mut ctx);
    // No record created at k(b"ghost") → set_global_field must abort with EInvalidKey.
    dapp_system::set_global_field<StoreKey>(StoreKey {}, &dh, &mut d, k(b"ghost"), b"v", to_bytes(&1u32), &mut ctx);
    dapp_service::destroy_dapp_storage(d);
    dapp_service::destroy_dapp_hub(dh);
}
