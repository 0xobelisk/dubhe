#[test_only]
module dubhe::session_flow_scenario_test;

use dubhe::dapp_fee_config;
use dubhe::dapp_service;
use dubhe::dapp_system;
use dubhe::session_cap;
use dubhe::session_registry;
use dubhe::session_system;
use dubhe::subject_id;
use std::ascii::string;
use sui::bcs::to_bytes;
use sui::test_scenario;

public struct TestDappKey has copy, drop {}

fun new_test_key(): TestDappKey {
    TestDappKey {}
}

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
public fun test_owner_registers_delegate_executes_and_data_stays_with_owner() {
    let owner = @0xA;
    let delegate = @0xB;
    let mut scenario = test_scenario::begin(owner);

    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_fee_config::set(&mut dh, 1000000u256, 0u256, 0u256, ctx);
        dapp_system::initialize_fee_state<TestDappKey>(&mut dh, ctx);

        let registry = session_registry::create_registry_for_testing(ctx);
        let owner_account = string(b"0xa");
        let subject = subject_id::from_account(copy owner_account);
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 10_000;
        let cap = session_system::create_session_cap_with_limits<TestDappKey>(
            &registry,
            subject,
            delegate,
            session_cap::scope_set_record(),
            expires_at,
            2,
            ctx
        );

        transfer::public_transfer(cap, delegate);
        transfer::public_transfer(registry, delegate);
        transfer::public_transfer(dh, delegate);
    };

    let _effects = test_scenario::next_tx(&mut scenario, delegate);

    {
        let mut dh = test_scenario::take_from_sender<dapp_service::DappHub>(&scenario);
        let registry = test_scenario::take_from_sender<session_registry::SessionRegistry>(&scenario);
        let mut cap = test_scenario::take_from_sender<session_cap::SessionCap>(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dapp_system::set_record_with_session_cap_nonce<TestDappKey>(
            &mut dh,
            new_test_key(),
            make_key(b"score"),
            make_u32_record(77u32),
            false,
            &registry,
            &mut cap,
            0,
            ctx
        );
        assert!(session_cap::next_nonce(&cap) == 1);
        assert!(session_cap::used_uses(&cap) == 1);
        assert!(session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));
        assert!(!session_cap::can_write_with_nonce<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            0,
            ctx
        ));
        assert!(session_cap::can_write_with_nonce<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            1,
            ctx
        ));

        let owner_account = string(b"0xa");
        let delegate_account = string(b"0xb");
        assert!(dapp_service::has_record<TestDappKey>(&dh, owner_account, make_key(b"score")));
        assert!(!dapp_service::has_record<TestDappKey>(&dh, delegate_account, make_key(b"score")));

        transfer::public_transfer(cap, owner);
        transfer::public_transfer(registry, owner);
        transfer::public_transfer(dh, owner);
    };

    let _effects = test_scenario::next_tx(&mut scenario, owner);

    {
        let dh = test_scenario::take_from_sender<dapp_service::DappHub>(&scenario);
        let registry = test_scenario::take_from_sender<session_registry::SessionRegistry>(&scenario);
        let cap = test_scenario::take_from_sender<session_cap::SessionCap>(&scenario);

        dapp_service::destroy(dh);
        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };

    scenario.end();
}

#[test]
public fun test_owner_cannot_execute_delegate_bound_session_cap() {
    let owner = @0xA;
    let delegate = @0xB;
    let mut scenario = test_scenario::begin(owner);

    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    dapp_fee_config::set(&mut dh, 1000000u256, 0u256, 0u256, ctx);
    dapp_system::initialize_fee_state<TestDappKey>(&mut dh, ctx);

    let registry = session_registry::create_registry_for_testing(ctx);
    let subject = subject_id::from_account(string(b"0xa"));
    let expires_at = tx_context::epoch_timestamp_ms(ctx) + 10_000;
    let cap = session_system::create_session_cap<TestDappKey>(
        &registry,
        subject,
        delegate,
        session_cap::scope_set_record(),
        expires_at,
        ctx
    );

    assert!(!session_cap::can_write<TestDappKey>(
        &cap,
        &registry,
        session_cap::scope_set_record(),
        ctx
    ));

    dapp_service::destroy(dh);
    session_cap::destroy_for_testing(cap);
    session_registry::destroy_for_testing(registry);
    scenario.end();
}

#[test]
public fun test_session_use_cap_enforced() {
    let owner = @0xA;
    let delegate = @0xB;
    let mut scenario = test_scenario::begin(owner);

    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_fee_config::set(&mut dh, 1000000u256, 0u256, 0u256, ctx);
        dapp_system::initialize_fee_state<TestDappKey>(&mut dh, ctx);
        let registry = session_registry::create_registry_for_testing(ctx);
        let subject = subject_id::from_account(string(b"0xa"));
        let expires_at = tx_context::epoch_timestamp_ms(ctx) + 10_000;
        let cap = session_system::create_session_cap_with_limits<TestDappKey>(
            &registry,
            subject,
            delegate,
            session_cap::scope_set_record(),
            expires_at,
            1,
            ctx
        );
        transfer::public_transfer(cap, delegate);
        transfer::public_transfer(registry, delegate);
        transfer::public_transfer(dh, delegate);
    };

    let _effects = test_scenario::next_tx(&mut scenario, delegate);

    {
        let mut dh = test_scenario::take_from_sender<dapp_service::DappHub>(&scenario);
        let registry = test_scenario::take_from_sender<session_registry::SessionRegistry>(&scenario);
        let mut cap = test_scenario::take_from_sender<session_cap::SessionCap>(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dapp_system::set_record_with_session_cap_nonce<TestDappKey>(
            &mut dh,
            new_test_key(),
            make_key(b"uses"),
            make_u32_record(1u32),
            false,
            &registry,
            &mut cap,
            0,
            ctx
        );

        assert!(session_cap::used_uses(&cap) == 1);
        assert!(!session_cap::can_write<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            ctx
        ));
        assert!(!session_cap::can_write_with_nonce<TestDappKey>(
            &cap,
            &registry,
            session_cap::scope_set_record(),
            1,
            ctx
        ));

        transfer::public_transfer(cap, owner);
        transfer::public_transfer(registry, owner);
        transfer::public_transfer(dh, owner);
    };

    let _effects = test_scenario::next_tx(&mut scenario, owner);
    {
        let dh = test_scenario::take_from_sender<dapp_service::DappHub>(&scenario);
        let registry = test_scenario::take_from_sender<session_registry::SessionRegistry>(&scenario);
        let cap = test_scenario::take_from_sender<session_cap::SessionCap>(&scenario);

        dapp_service::destroy(dh);
        session_cap::destroy_for_testing(cap);
        session_registry::destroy_for_testing(registry);
    };

    scenario.end();
}
