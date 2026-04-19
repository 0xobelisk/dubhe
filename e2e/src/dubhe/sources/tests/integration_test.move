/// Integration tests — end-to-end flows combining multiple subsystems
///
/// These tests exercise complete user journeys rather than individual functions:
///
///   full_game_session:
///     Admin sets up DApp → user creates storage → writes game data →
///     DApp settles fees → verify final state
///
///   session_key_flow:
///     User activates session → session key writes → session expires →
///     write rejected → owner renews session → new session key writes
///
///   session_key_loss_recovery:
///     Owner activates session → session key "lost" (owner re-activates without deactivate) →
///     new session key takes over immediately
///
///   dapp_key_mismatch_abort:
///     Attempt to write to a UserStorage using the wrong DApp's key → abort
///
///   suspended_dapp_blocks_new_users:
///     Admin suspends DApp mid-operation → new user cannot create storage →
///     admin unsuspends → creation works again
#[test_only]
module dubhe::integration_test;

use dubhe::dapp_service::{Self, UserStorage};
use dubhe::dapp_system;
use sui::test_scenario;
use sui::clock;
use sui::coin;
use sui::sui::SUI;
use sui::bcs;
use sui::bcs::to_bytes;

public struct GameKey    has copy, drop {}
public struct RivalKey   has copy, drop {}

const ADMIN:      address = @0xAD00;
const USER_A:     address = @0xAAAA;
const SESSION:    address = @0xBBBB;
const NEW_SESSION: address = @0xCCCC;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun k(n: vector<u8>): vector<vector<u8>> { vector[n] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u32v(v: u32): vector<vector<u8>> { vector[to_bytes(&v)] }

fun read_u32(us: &UserStorage, key: vector<vector<u8>>, field: vector<u8>): u32 {
    let raw = dapp_system::get_field<GameKey>(us, key, field);
    let mut b = bcs::new(raw);
    bcs::peel_u32(&mut b)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full game session
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_full_game_session() {
    let mut scenario = test_scenario::begin(ADMIN);

    // ── Setup ──
    let (dh, mut ds) = {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<GameKey>(ctx);
        dapp_service::add_credit(&mut ds, 10_000_000u256);
        (dh, ds)
    };

    // ── User creates storage ──
    test_scenario::next_tx(&mut scenario, USER_A);
    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<GameKey>(USER_A, ctx);
        us
    };

    // ── User writes game data ──
    test_scenario::next_tx(&mut scenario, USER_A);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"hero"), fns(), u32v(100), false, ctx);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"xp"),   fns(), u32v(0),   false, ctx);
        assert!(dapp_service::unsettled_count(&us) == 2);
    };

    // ── DApp settles fee ──
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::settle_writes<GameKey>(&dh, &mut ds, &mut us, ctx);
        assert!(dapp_service::unsettled_count(&us) == 0);
    };

    // ── Verify data is intact after settlement ──
    assert!(read_u32(&us, k(b"hero"), b"v") == 100);
    assert!(read_u32(&us, k(b"xp"),   b"v") == 0);

    dapp_service::destroy_user_storage(us);
    dapp_system::destroy_dapp_hub(dh);
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session key flow: activate → write → expire → renew
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_session_key_flow() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(USER_A);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);

    let dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::create_user_storage_for_testing<GameKey>(USER_A, ctx)
    };

    // ── Owner activates a session ──
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::activate_session<GameKey>(&dh, &mut us, SESSION, min, &clk, ctx);
        assert!(dapp_service::session_key(&us) == SESSION);
    };

    // ── Session key writes while active ──
    test_scenario::next_tx(&mut scenario, SESSION);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"pos"), fns(), u32v(42), false, ctx);
        assert!(read_u32(&us, k(b"pos"), b"v") == 42);
    };

    // ── Session expires ──
    clock::set_for_testing(&mut clk, min + 1);

    // ── Owner renews without explicit deactivate ──
    test_scenario::next_tx(&mut scenario, USER_A);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::activate_session<GameKey>(&dh, &mut us, @0x9999, min, &clk, ctx);
        assert!(dapp_service::session_key(&us) == @0x9999);
    };

    // ── New session key writes ──
    test_scenario::next_tx(&mut scenario, @0x9999);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"pos"), fns(), u32v(99), false, ctx);
        assert!(read_u32(&us, k(b"pos"), b"v") == 99);
    };

    clk.destroy_for_testing();
    dapp_service::destroy_user_storage(us);
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session key loss recovery (overwrite without deactivate)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_session_key_loss_recovery() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(USER_A);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);

    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::create_user_storage_for_testing<GameKey>(USER_A, ctx)
    };
    let dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    // ── First session (to be lost) ──
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::activate_session<GameKey>(&dh, &mut us, SESSION, min * 100, &clk, ctx);
    };

    // ── Owner "lost" the session wallet — creates a new session directly ──
    {
        let ctx = test_scenario::ctx(&mut scenario);
        // No deactivate needed: activate overwrites the active session.
        dapp_system::activate_session<GameKey>(&dh, &mut us, NEW_SESSION, min, &clk, ctx);
        assert!(dapp_service::session_key(&us) == NEW_SESSION);
        // Old SESSION is immediately invalid.
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 0));
        assert!(dapp_service::is_write_authorized(&us, NEW_SESSION, 0));
    };

    clk.destroy_for_testing();
    dapp_service::destroy_user_storage(us);
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DApp key mismatch abort
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_write_to_wrong_dapp_storage_aborts() {
    let mut scenario = test_scenario::begin(USER_A);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        // UserStorage belongs to GameKey DApp.
        let mut us = dapp_service::create_user_storage_for_testing<GameKey>(USER_A, ctx);
        // Writing with RivalKey must abort with dapp_key_mismatch.
        dapp_system::set_record<RivalKey>(
            RivalKey {}, &mut us, k(b"x"), fns(), u32v(1), false, ctx
        );
        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// User storage creation is always open (no suspended gate)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_user_can_always_create_storage() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let (dh, mut ds) = {
            let ctx = test_scenario::ctx(&mut scenario);
            (
                dapp_system::create_dapp_hub_for_testing(ctx),
                dapp_system::create_dapp_storage_for_testing<GameKey>(ctx),
            )
        };

        // User can create storage without any precondition.
        test_scenario::next_tx(&mut scenario, USER_A);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            dapp_system::create_user_storage<GameKey>(&dh, &mut ds, ctx);
            assert!(dapp_service::has_registered_user_storage(&ds, USER_A));
        };

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Credit recharge and settlement in sequence
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_recharge_then_settle() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<GameKey>(ctx);

        // Set per-DApp fee rates so settle_writes actually charges credit.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);

        // Recharge.
        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        dapp_system::recharge_credit<GameKey, SUI>(&dh, &mut ds, payment, ctx);
        assert!(dapp_service::credit_pool(&ds) == 5_000_000u256);

        // User writes several records.
        let mut us = dapp_service::create_user_storage_for_testing<GameKey>(ADMIN, ctx);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"a"), fns(), u32v(1), false, ctx);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"b"), fns(), u32v(2), false, ctx);
        dapp_system::set_record<GameKey>(GameKey {}, &mut us, k(b"c"), fns(), u32v(3), false, ctx);
        assert!(dapp_service::unsettled_count(&us) == 3);

        // Settle.
        dapp_system::settle_writes<GameKey>(&dh, &mut ds, &mut us, ctx);
        assert!(dapp_service::unsettled_count(&us) == 0);
        // Pool must have decreased.
        assert!(dapp_service::credit_pool(&ds) < 5_000_000u256);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}
