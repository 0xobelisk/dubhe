#[test_only]
module dubhe::dapp_system_test;

use dubhe::dapp_service::{Self, DappHub};
use dubhe::dapp_system;
use dubhe::dapp_metadata;
use dubhe::type_info;
use dubhe::init_test;
use sui::test_scenario;
use sui::clock;
use std::ascii::string;
use sui::bcs::to_bytes;

// Minimal DappKey for testing (inside dubhe package = package-internal access)
public struct TestDappKey has copy, drop {}
public struct OwnerTestKey has copy, drop {}

fun new_test_key(): TestDappKey { TestDappKey {} }
fun new_owner_key(): OwnerTestKey { OwnerTestKey {} }

// ─── helpers ───────────────────────────────────────────────────────────────

fun make_key(name: vector<u8>): vector<vector<u8>> {
    let mut k = vector::empty();
    k.push_back(name);
    k
}

fun make_u32_record(v: u32): vector<vector<u8>> {
    let mut vals = vector::empty();
    vals.push_back(to_bytes(&v));
    vals
}

/// Build a DappHub with genesis run and OwnerTestKey DApp registered.
/// Uses deploy_dapp_for_testing (calls next_tx internally) — suitable for
/// single-transaction tests only.
fun setup_owner_dapp(scenario: &mut test_scenario::Scenario): DappHub {
    let mut dh = init_test::deploy_dapp_for_testing(scenario);
    let ctx = test_scenario::ctx(scenario);
    let clk = clock::create_for_testing(ctx);
    dapp_system::create_dapp<OwnerTestKey>(
        &mut dh,
        new_owner_key(),
        string(b"Owner Test DApp"),
        string(b"DApp for ownership transfer tests"),
        &clk,
        ctx
    );
    clock::destroy_for_testing(clk);
    dh
}

/// Lightweight setup for cross-transaction tests: creates a bare DappHub and
/// registers OwnerTestKey without calling next_tx, so the object can be
/// safely shared with transfer::public_share_object in the same block.
/// propose_ownership / accept_ownership only read dapp_metadata, so
/// dapp_fee_config initialisation (from genesis) is not required.
fun setup_owner_dapp_inline(ctx: &mut TxContext): DappHub {
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let clk = clock::create_for_testing(ctx);
    dapp_system::create_dapp<OwnerTestKey>(
        &mut dh,
        new_owner_key(),
        string(b"Owner Test DApp"),
        string(b"DApp for ownership transfer tests"),
        &clk,
        ctx
    );
    clock::destroy_for_testing(clk);
    dh
}

// ─── Storage record tests ────────────────────────────────────────────────────

#[test]
public fun test_set_and_has_record() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        let resource_account = string(b"0xa");

        // Before write: record must not exist
        assert!(!dapp_service::has_record<TestDappKey>(&dh, resource_account, make_key(b"score")));

        dapp_service::set_record<TestDappKey>(&mut dh, new_test_key(), make_key(b"score"), make_u32_record(42u32), resource_account, false, ctx);

        assert!(dapp_service::has_record<TestDappKey>(&dh, resource_account, make_key(b"score")));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

#[test]
public fun test_delete_record() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        let resource_account = string(b"0xa");

        dapp_service::set_record<TestDappKey>(&mut dh, new_test_key(), make_key(b"hp"), make_u32_record(100u32), resource_account, false, ctx);
        assert!(dapp_service::has_record<TestDappKey>(&dh, resource_account, make_key(b"hp")));

        dapp_service::delete_record<TestDappKey>(&mut dh, new_test_key(), make_key(b"hp"), resource_account);
        assert!(!dapp_service::has_record<TestDappKey>(&dh, resource_account, make_key(b"hp")));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

#[test]
public fun test_ensure_has_not_record() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_service::create_dapp_hub_for_testing(ctx);
        let resource_account = string(b"0xa");

        // Record does not exist yet — should not abort
        dapp_system::ensure_has_not_record<TestDappKey>(&dh, resource_account, make_key(b"missing"));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

#[test]
public fun test_multiple_resource_accounts_isolated() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        let acc_a = string(b"0xaaaa");
        let acc_b = string(b"0xbbbb");

        dapp_service::set_record<TestDappKey>(&mut dh, new_test_key(), make_key(b"score"), make_u32_record(10u32), acc_a, false, ctx);
        dapp_service::set_record<TestDappKey>(&mut dh, new_test_key(), make_key(b"score"), make_u32_record(99u32), acc_b, false, ctx);

        assert!(dapp_service::has_record<TestDappKey>(&dh, acc_a, make_key(b"score")));
        assert!(dapp_service::has_record<TestDappKey>(&dh, acc_b, make_key(b"score")));
        assert!(!dapp_service::has_record<TestDappKey>(&dh, acc_a, make_key(b"other")));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── CVE-D-09: Event emission regression tests ───────────────────────────────
//
// After restricting emit_store_set_record / emit_store_delete_record to
// public(package), verify that storage operations still emit the expected
// number of events (the fix must not break normal event output).
//
// Note: the access-control property (no external module can call emit_*)
// is a compile-time guarantee and cannot be expressed as a unit test.

/// set_record (on-chain path) must emit exactly one SetRecord event.
#[test]
public fun test_set_record_emits_event() {
    let sender = @0xA1;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_service::set_record<TestDappKey>(
            &mut dh, new_test_key(), make_key(b"hp"), make_u32_record(42u32),
            string(b"0xa1"), false, ctx
        );
        dapp_service::destroy(dh);
    };
    // next_tx ends the current transaction and returns its effects.
    let effects = test_scenario::next_tx(&mut scenario, sender);
    assert!(test_scenario::num_user_events(&effects) == 1);
    scenario.end();
}

/// delete_record must emit exactly one DeleteRecord event.
#[test]
public fun test_delete_record_emits_event() {
    let sender = @0xA2;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        // set + delete = 2 events in one block
        dapp_service::set_record<TestDappKey>(
            &mut dh, new_test_key(), make_key(b"hp"), make_u32_record(100u32),
            string(b"0xa2"), false, ctx
        );
        dapp_service::delete_record<TestDappKey>(
            &mut dh, new_test_key(), make_key(b"hp"), string(b"0xa2")
        );
        dapp_service::destroy(dh);
    };
    let effects = test_scenario::next_tx(&mut scenario, sender);
    assert!(test_scenario::num_user_events(&effects) == 2);
    scenario.end();
}

/// set_record (offchain=true path) must also emit a SetRecord event.
#[test]
public fun test_set_record_offchain_emits_event() {
    let sender = @0xA3;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_service::set_record<TestDappKey>(
            &mut dh, new_test_key(), make_key(b"score"), make_u32_record(99u32),
            string(b"0xa3"), true, ctx  // offchain = true
        );
        dapp_service::destroy(dh);
    };
    let effects = test_scenario::next_tx(&mut scenario, sender);
    assert!(test_scenario::num_user_events(&effects) == 1);
    scenario.end();
}

// ─── CVE-NEW-03: Two-step ownership transfer tests ───────────────────────────

/// propose_ownership sets pending_admin without changing the current admin.
#[test]
public fun test_propose_ownership_sets_pending_admin() {
    let admin   = @0xAD00;
    let nominee = @0xBEEF;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup_owner_dapp(&mut scenario);
        let ctx    = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();

        // Initially no pending transfer
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == @0x0);

        dapp_system::propose_ownership(&mut dh, dapp_key, nominee, ctx);

        // Pending admin recorded; current admin unchanged
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == nominee);
        assert!(dapp_metadata::get_admin(&dh, dapp_key) == admin);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// accept_ownership completes the state transition: admin updated, pending cleared.
///
/// The Sui test scenario framework does not propagate ObjectTable child-objects
/// across transactions for freshly-shared objects (known limitation), so we
/// use a single-transaction self-transfer to exercise the full code path.
/// Cross-address security (wrong caller / no pending) is covered by the
/// expected_failure tests below.
#[test]
public fun test_accept_ownership_completes_transfer() {
    // Start as the nominee so ctx.sender() == nominee throughout.
    // Admin (also nominee here) proposes itself, then accepts — degenerate but
    // it exercises every line of accept_ownership in one transaction.
    let nominee = @0xBEEF;
    let mut scenario = test_scenario::begin(nominee);
    {
        let mut dh = setup_owner_dapp(&mut scenario);
        let ctx    = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();

        // Admin (nominee) proposes itself as new admin.
        dapp_system::propose_ownership(&mut dh, dapp_key, nominee, ctx);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == nominee);

        // Nominee accepts — ctx.sender() == pending_admin, so this must succeed.
        dapp_system::accept_ownership(&mut dh, dapp_key, ctx);

        // Admin field updated; pending_admin cleared back to @0x0.
        assert!(dapp_metadata::get_admin(&dh, dapp_key) == nominee);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == @0x0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// propose_ownership can be overwritten: the last nominee wins.
#[test]
public fun test_propose_ownership_can_be_updated() {
    let admin    = @0xAD02;
    let nominee1 = @0xBEE1;
    let nominee2 = @0xBEE2;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup_owner_dapp(&mut scenario);
        let ctx    = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();

        dapp_system::propose_ownership(&mut dh, dapp_key, nominee1, ctx);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == nominee1);

        // Overwrite with a different nominee
        dapp_system::propose_ownership(&mut dh, dapp_key, nominee2, ctx);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == nominee2);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Passing @0x0 to propose_ownership cancels any pending transfer.
#[test]
public fun test_propose_zero_cancels_pending_transfer() {
    let admin   = @0xAD03;
    let nominee = @0xBEEF;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup_owner_dapp(&mut scenario);
        let ctx    = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();

        dapp_system::propose_ownership(&mut dh, dapp_key, nominee, ctx);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == nominee);

        // Cancel by proposing zero address
        dapp_system::propose_ownership(&mut dh, dapp_key, @0x0, ctx);
        assert!(dapp_metadata::get_pending_admin(&dh, dapp_key) == @0x0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// accept_ownership aborts when there is no pending transfer (pending_admin == @0x0).
#[test]
#[expected_failure]
public fun test_accept_ownership_aborts_when_no_pending_transfer() {
    let admin = @0xAD04;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup_owner_dapp(&mut scenario);
        let ctx    = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();
        // No propose_ownership called — pending_admin is @0x0.
        // Must abort: no_pending_ownership_transfer_error.
        dapp_system::accept_ownership(&mut dh, dapp_key, ctx);
        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// accept_ownership aborts when the caller is not the nominated pending_admin.
#[test]
#[expected_failure]
public fun test_accept_ownership_aborts_for_wrong_caller() {
    let admin      = @0xAD05;
    let nominee    = @0xBEEF;
    let wrong_addr = @0xDEAD;
    let mut scenario = test_scenario::begin(admin);

    // Tx 1: create DappHub inline so it can be shared right away.
    {
        let ctx      = test_scenario::ctx(&mut scenario);
        let mut dh   = setup_owner_dapp_inline(ctx);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();
        dapp_system::propose_ownership(&mut dh, dapp_key, nominee, ctx);
        transfer::public_share_object(dh);
    };

    // Tx 2: wrong address tries to accept — must abort.
    test_scenario::next_tx(&mut scenario, wrong_addr);
    {
        let mut dh: DappHub = test_scenario::take_shared(&scenario);
        let ctx      = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();
        dapp_system::accept_ownership(&mut dh, dapp_key, ctx);
        test_scenario::return_shared(dh);
    };
    scenario.end();
}

/// Non-admin calling propose_ownership must abort.
#[test]
#[expected_failure]
public fun test_propose_ownership_aborts_for_non_admin() {
    let admin    = @0xAD06;
    let attacker = @0xEE00;
    let mut scenario = test_scenario::begin(admin);

    // Tx 1: create DappHub inline so it can be shared right away.
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = setup_owner_dapp_inline(ctx);
        transfer::public_share_object(dh);
    };

    // Tx 2: attacker tries to propose — must abort.
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let mut dh: DappHub = test_scenario::take_shared(&scenario);
        let ctx      = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<OwnerTestKey>();
        dapp_system::propose_ownership(&mut dh, dapp_key, attacker, ctx);
        test_scenario::return_shared(dh);
    };
    scenario.end();
}
