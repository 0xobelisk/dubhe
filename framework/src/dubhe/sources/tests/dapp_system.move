#[test_only]
module dubhe::dapp_system_test;

use dubhe::dapp_service::{Self, DappHub};
use dubhe::dapp_system;
use sui::test_scenario;
use std::ascii::string;
use sui::bcs::to_bytes;

// Minimal DappKey for testing (inside dubhe package = package-internal access)
public struct TestDappKey has copy, drop {}

fun new_test_key(): TestDappKey { TestDappKey {} }

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

// ─── tests ──────────────────────────────────────────────────────────────────

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
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
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

        // Each account should have its own record
        assert!(dapp_service::has_record<TestDappKey>(&dh, acc_a, make_key(b"score")));
        assert!(dapp_service::has_record<TestDappKey>(&dh, acc_b, make_key(b"score")));

        // Cross-check: acc_a does not have acc_b's score key under acc_a namespace
        // (they ARE the same key, just different accounts — verify they both exist)
        assert!(!dapp_service::has_record<TestDappKey>(&dh, acc_a, make_key(b"other")));

        dapp_service::destroy(dh);
    };
    scenario.end();
}
