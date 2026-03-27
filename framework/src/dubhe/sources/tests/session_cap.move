#[test_only]
module dubhe::session_cap_test;

use dubhe::dapp_service;
use dubhe::dapp_system;
use dubhe::dapp_fee_config;
use dubhe::session_cap;
use dubhe::session_registry;
use dubhe::session_system;
use dubhe::subject_id;
use sui::test_scenario;
use std::ascii::string;
use sui::bcs::to_bytes;

public struct TestDappKey has copy, drop {}

fun new_test_key(): TestDappKey { TestDappKey {} }

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

#[test]
public fun test_set_record_with_session_cap() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_fee_config::set(&mut dh, 1000000u256, 0u256, 0u256, ctx);
        dapp_system::initialize_fee_state<TestDappKey>(&mut dh, ctx);
        let registry = session_registry::create_registry_for_testing(ctx);
        let account = string(b"0xa");
        let subject = subject_id::from_account(copy account);
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 1000;
        let cap = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject,
            sender,
            session_cap::scope_set_record(),
            expires_at,
            ctx
        );

        dapp_system::set_record_with_session_cap<TestDappKey>(
            &mut dh,
            new_test_key(),
            make_key(b"score"),
            make_u32_record(7u32),
            false,
            &registry,
            &cap,
            ctx
        );
        assert!(dapp_service::has_record<TestDappKey>(&dh, account, make_key(b"score")));

        dapp_service::destroy(dh);
        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };
    scenario.end();
}

#[test]
public fun test_scope_mismatch_detected() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let registry = session_registry::create_registry_for_testing(ctx);
        let subject = subject_id::from_account(string(b"0xa"));
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 1000;
        let cap = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject,
            sender,
            session_cap::scope_set_field(),
            expires_at,
            ctx
        );

        assert!(!session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));

        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };
    scenario.end();
}

#[test]
public fun test_revoke_session_cap() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let registry = session_registry::create_registry_for_testing(ctx);
        let subject = subject_id::from_account(string(b"0xa"));
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 1000;
        let mut cap = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject,
            sender,
            session_cap::scope_set_record(),
            expires_at,
            ctx
        );

        assert!(session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));
        session_system::revoke_session_cap(&mut cap, ctx);
        assert!(!session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));

        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };
    scenario.end();
}

#[test]
public fun test_revoke_subject_sessions_by_version_bump() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = session_registry::create_registry_for_testing(ctx);
        let subject = subject_id::from_account(string(b"0xa"));
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 1000;
        let cap = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject,
            sender,
            session_cap::scope_set_record(),
            expires_at,
            ctx
        );

        assert!(session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));
        session_system::revoke_subject_sessions<TestDappKey>(&mut registry, &cap, ctx);
        assert!(!session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));

        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };
    scenario.end();
}

#[test]
public fun test_cross_subject_isolation() {
    let sender = @0xA;
    let mut scenario = test_scenario::begin(sender);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_fee_config::set(&mut dh, 1000000u256, 0u256, 0u256, ctx);
        dapp_system::initialize_fee_state<TestDappKey>(&mut dh, ctx);
        let registry = session_registry::create_registry_for_testing(ctx);
        let account_a = string(b"0xa");
        let account_b = string(b"0xb");
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 1000;

        let cap_a = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject_id::from_account(copy account_a),
            sender,
            session_cap::scope_set_record(),
            expires_at,
            ctx
        );
        let cap_b = session_system::create_session_cap<TestDappKey>(
            &registry,
            subject_id::from_account(copy account_b),
            sender,
            session_cap::scope_set_record(),
            expires_at,
            ctx
        );

        dapp_system::set_record_with_session_cap<TestDappKey>(
            &mut dh,
            new_test_key(),
            make_key(b"score"),
            make_u32_record(11u32),
            false,
            &registry,
            &cap_a,
            ctx
        );
        dapp_system::set_record_with_session_cap<TestDappKey>(
            &mut dh,
            new_test_key(),
            make_key(b"score"),
            make_u32_record(22u32),
            false,
            &registry,
            &cap_b,
            ctx
        );

        assert!(dapp_service::has_record<TestDappKey>(&dh, account_a, make_key(b"score")));
        assert!(dapp_service::has_record<TestDappKey>(&dh, account_b, make_key(b"score")));

        dapp_service::destroy(dh);
        session_cap::destroy_for_testing(cap_a);
        session_cap::destroy_for_testing(cap_b);
        session_registry::destroy_for_testing(registry);
    };
    scenario.end();
}
