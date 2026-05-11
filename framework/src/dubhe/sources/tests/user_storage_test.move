/// Unit tests — UserStorage creation and registration
///
/// Covers:
///   create_user_storage: initial state, registration recorded, duplicate abort
///   canonical_owner is set correctly on creation
///   session fields initialized to zero/empty
#[test_only]
module dubhe::user_storage_test;

use dubhe::dapp_service::{Self, DappHub, DappStorage};
use dubhe::dapp_system;
use sui::test_scenario;

public struct UsTestKey has copy, drop {}

const USER: address = @0x1234;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun setup(scenario: &mut test_scenario::Scenario): (DappHub, DappStorage) {
    let ctx = test_scenario::ctx(scenario);
    (
        dapp_system::create_dapp_hub_for_testing(ctx),
        dapp_system::create_dapp_storage_for_testing<UsTestKey>(ctx),
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Initial state
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_initial_write_counts_are_zero() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<UsTestKey>(USER, ctx);

        assert!(dapp_service::write_count(&us) == 0);
        assert!(dapp_service::settled_count(&us) == 0);
        assert!(dapp_service::unsettled_count(&us) == 0);

        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_canonical_owner_set_on_creation() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<UsTestKey>(USER, ctx);
        assert!(dapp_service::canonical_owner(&us) == USER);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_session_fields_cleared_on_creation() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<UsTestKey>(USER, ctx);
        assert!(dapp_service::session_key(&us) == @0x0);
        assert!(dapp_service::session_expires_at(&us) == 0);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// create_user_storage (via dapp_system) — registration guard
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_create_user_storage_registers_address() {
    let sender = @0xABC;
    let mut scenario = test_scenario::begin(sender);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assert!(!dapp_service::has_registered_user_storage(&ds, sender));
        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::has_registered_user_storage(&ds, sender));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_create_user_storage_twice_aborts() {
    let sender = @0xABC;
    let mut scenario = test_scenario::begin(sender);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);
        // Second call from the same address must abort with user_storage_already_exists.
        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_different_users_can_each_create_one_user_storage() {
    let user_a = @0xAAAA;
    let user_b = @0xBBBB;

    let mut scenario = test_scenario::begin(user_a);
    {
        let (dh, mut ds) = setup(&mut scenario);

        // user_a creates their storage.
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::has_registered_user_storage(&ds, user_a));

        // user_b creates theirs in a new tx.
        test_scenario::next_tx(&mut scenario, user_b);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::has_registered_user_storage(&ds, user_b));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Suspended DApp guard
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_create_user_storage_succeeds_after_registration_check() {
    let sender = @0xABC;
    let mut scenario = test_scenario::begin(sender);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Must succeed.
        dapp_system::create_user_storage<UsTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::has_registered_user_storage(&ds, sender));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}
