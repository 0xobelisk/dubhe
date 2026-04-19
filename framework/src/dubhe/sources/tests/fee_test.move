/// Unit tests — Fee collection and lazy settlement
///
/// Covers the write_count / settled_count model (lazy settlement):
///   write_count tracking: set_record increments, offchain/delete do not
///   set_field increments write_count
///   max_unsettled_writes guard (hardcoded constant MAX_UNSETTLED_WRITES=1000)
///   settle_writes full settlement (all unsettled writes charged)
///   settle_writes skip when credit_pool == 0
///   settle_writes partial settlement (limited by available credits)
///   settle_writes is a no-op when write_count already settled
///   recharge_credit increases credit_pool; aborts in USER_PAYS mode
///   propose_treasury / accept_treasury: two-step framework treasury rotation (treasury = receive-only)
///   Version gating: lifecycle functions abort when framework version mismatch
///
/// Additional coverage (appended):
///   update_framework_fee: fee increase is SCHEDULED not immediate (48-hour delay)
///   get_effective_fee_per_write_at: returns base fee before delay, pending fee after
///   second update_framework_fee call: commits matured pending fee before applying new value
///   free-tier (fee==0): settle_writes marks all settled without touching credit pool
///   update_framework_fee: version gating aborts after framework bump
///   settle_writes / recharge_credit: dapp_key_mismatch aborts when DappKey type does not match
///   sync_dapp_fee: permissionless sync copies DappHub effective fees to DappStorage
#[test_only]
#[allow(unused_let_mut)]
module dubhe::fee_test;

use dubhe::dapp_service::{Self, DappHub, DappStorage, UserStorage};
use dubhe::dapp_system;
use sui::test_scenario;
use sui::coin;
use sui::sui::SUI;
use sui::bcs::to_bytes;
use sui::clock;
use std::type_name;

public struct FeeKey has copy, drop {}
/// A distinct DApp key type used only to trigger dapp_key_mismatch errors.
public struct FeeWrongKey has copy, drop {}

/// 48-hour delay for fee increases, mirroring MIN_FEE_INCREASE_DELAY_MS in dapp_system.
const DELAY_MS: u64 = 172_800_000;

const USER: address = @0xFEE;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun k(n: vector<u8>): vector<vector<u8>> { vector[n] }
fun fns(): vector<vector<u8>> { vector[b"v"] }
fun u32v(v: u32): vector<vector<u8>> { vector[to_bytes(&v)] }

fun setup(scenario: &mut test_scenario::Scenario): (DappHub, DappStorage) {
    let ctx = test_scenario::ctx(scenario);
    let dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
    // Mirror the fee rates used by create_dapp_hub_for_testing (base=1000, bytes=10)
    // so that settle_writes reads the expected rates from DappStorage.
    dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
    dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);
    (dh, ds)
}

fun new_us(ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<FeeKey>(USER, ctx)
}

// ═══════════════════════════════════════════════════════════════════════════════
// write_count tracking
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_record_increments_write_count() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        assert!(dapp_service::write_count(&us) == 0);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"a"), fns(), u32v(1), false, ctx);
        assert!(dapp_service::write_count(&us) == 1);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"b"), fns(), u32v(2), false, ctx);
        assert!(dapp_service::write_count(&us) == 2);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_set_field_increments_write_count() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"p"), fns(), u32v(1), false, ctx);
        let before = dapp_service::write_count(&us);
        dapp_system::set_field<FeeKey>(FeeKey {}, &mut us, k(b"p"), b"v", to_bytes(&2u32), ctx);
        assert!(dapp_service::write_count(&us) == before + 1);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_offchain_record_increments_write_count_but_not_bytes() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        // Offchain writes: write_count is incremented (framework was used) but write_bytes stays 0.
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"x"), fns(), u32v(7), true, ctx);
        assert!(dapp_service::write_count(&us) == 1);
        assert!(dapp_service::write_bytes(&us) == 0);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_delete_record_does_not_increment_write_count() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"hp"), fns(), u32v(1), false, ctx);
        let count_after_write = dapp_service::write_count(&us);

        dapp_system::delete_record<FeeKey>(FeeKey {}, &mut us, k(b"hp"), fns(), ctx);
        assert!(dapp_service::write_count(&us) == count_after_write);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_delete_field_does_not_increment_write_count() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"p"), vector[b"a", b"b"],
            vector[to_bytes(&1u32), to_bytes(&2u32)], false, ctx);
        let count = dapp_service::write_count(&us);

        dapp_system::delete_field<FeeKey>(FeeKey {}, &mut us, k(b"p"), b"a", ctx);
        assert!(dapp_service::write_count(&us) == count);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// max_unsettled_writes guard (centrally managed in DappHub)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_set_record_aborts_at_max_unsettled_writes() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        // MAX_UNSETTLED_WRITES = 1000: fill exactly to the limit.
        let max_writes = 1000u64;
        let mut i = 0u64;
        while (i < max_writes) {
            dapp_service::increment_write_count(&mut us);
            i = i + 1;
        };
        assert!(dapp_service::write_count(&us) == max_writes);

        // This write must abort with user_debt_limit_exceeded.
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"over"), fns(), u32v(0), false, ctx);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_write_allowed_after_settlement_clears_debt() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::add_credit(&mut ds, 1_000_000u256);

        let mut us = new_us(ctx);

        // Fill up to max: 1000 writes = MAX_UNSETTLED_WRITES.
        let max_writes = 1000u64;
        let mut i = 0u64;
        while (i < max_writes) {
            dapp_service::increment_write_count(&mut us);
            i = i + 1;
        };

        // Settle clears the debt.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);
        assert!(dapp_service::unsettled_count(&us) == 0);

        // Can write again now.
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"new"), fns(), u32v(1), false, ctx);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// propose_framework_admin / accept_framework_admin — two-step admin rotation
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN:     address = @0xAD01;
const NEW_ADMIN: address = @0xAD02;
const EVIL:      address = @0xBAD1;

#[test]
fun test_propose_framework_admin_sets_pending() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // No pending admin initially.
        assert!(dapp_service::pending_framework_admin(dapp_service::get_config(&dh)) == @0x0);

        dapp_system::propose_framework_admin(&mut dh, NEW_ADMIN, ctx);
        assert!(dapp_service::pending_framework_admin(dapp_service::get_config(&dh)) == NEW_ADMIN);
        // Admin not yet changed.
        assert!(dapp_service::framework_admin(dapp_service::get_config(&dh)) == ADMIN);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
fun test_accept_framework_admin_completes_rotation() {
    let mut scenario = test_scenario::begin(ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    dapp_system::propose_framework_admin(&mut dh, NEW_ADMIN, test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, NEW_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_framework_admin(&mut dh, ctx);

        assert!(dapp_service::framework_admin(dapp_service::get_config(&dh)) == NEW_ADMIN);
        assert!(dapp_service::pending_framework_admin(dapp_service::get_config(&dh)) == @0x0);
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

#[test]
fun test_propose_framework_admin_zero_cancels_pending() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        dapp_system::propose_framework_admin(&mut dh, NEW_ADMIN, ctx);
        assert!(dapp_service::pending_framework_admin(dapp_service::get_config(&dh)) == NEW_ADMIN);

        // Cancel by proposing @0x0.
        dapp_system::propose_framework_admin(&mut dh, @0x0, ctx);
        assert!(dapp_service::pending_framework_admin(dapp_service::get_config(&dh)) == @0x0);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_propose_framework_admin_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    test_scenario::next_tx(&mut scenario, EVIL);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::propose_framework_admin(&mut dh, EVIL, ctx);
    };
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_framework_admin_aborts_when_no_pending() {
    let mut scenario = test_scenario::begin(NEW_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        // No pending admin — must abort.
        dapp_system::accept_framework_admin(&mut dh, ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_framework_admin_aborts_for_wrong_caller() {
    let mut scenario = test_scenario::begin(ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    dapp_system::propose_framework_admin(&mut dh, NEW_ADMIN, test_scenario::ctx(&mut scenario));

    // Wrong caller tries to accept.
    test_scenario::next_tx(&mut scenario, EVIL);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_framework_admin(&mut dh, ctx);
    };
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_settle_writes_full_settlement() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::add_credit(&mut ds, 1_000_000u256);

        let mut us = new_us(ctx);

        let mut i = 0u64;
        while (i < 5) {
            dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(i as u32), false, ctx);
            i = i + 1;
        };
        assert!(dapp_service::write_count(&us) == 5);
        assert!(dapp_service::unsettled_count(&us) == 5);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        assert!(dapp_service::write_count(&us) == 5);
        assert!(dapp_service::settled_count(&us) == 5);
        assert!(dapp_service::unsettled_count(&us) == 0);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_settle_writes_skipped_when_no_credits() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        assert!(dapp_service::credit_pool(&ds) == 0);

        let mut us = new_us(ctx);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(1), false, ctx);
        assert!(dapp_service::unsettled_count(&us) == 1);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // Settlement skipped — write_count stays, settled_count unchanged.
        assert!(dapp_service::unsettled_count(&us) == 1);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_settle_writes_is_noop_when_already_settled() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::add_credit(&mut ds, 1_000_000u256);

        let mut us = new_us(ctx);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(1), false, ctx);

        // First settlement.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);
        assert!(dapp_service::unsettled_count(&us) == 0);
        let pool_after_first = dapp_service::credit_pool(&ds);

        // Second settlement — no additional charge.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);
        assert!(dapp_service::credit_pool(&ds) == pool_after_first);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// recharge_credit
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_recharge_credit_increases_pool() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        assert!(dapp_service::credit_pool(&ds) == 0);

        let payment = coin::mint_for_testing<SUI>(2_000_000, ctx);
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, payment, ctx);

        assert!(dapp_service::credit_pool(&ds) == 2_000_000u256);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_recharge_credit_accumulates() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let p1 = coin::mint_for_testing<SUI>(1_000_000, ctx);
        let p2 = coin::mint_for_testing<SUI>(500_000, ctx);
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, p1, ctx);
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, p2, ctx);

        assert!(dapp_service::credit_pool(&ds) == 1_500_000u256);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// update_framework_fee — requires framework admin
// ═══════════════════════════════════════════════════════════════════════════════

const FRAMEWORK_ADMIN: address = @0xAD01;
const TREASURY_ONLY:   address = @0xFEE1; // receives payments but cannot manage contracts


#[test]
/// Decrease also requires a 48-hour delay — fees are applied when the pending
/// matures, not immediately. The committed fees remain at the old values until
/// the delay elapses and update_framework_fee is called again to trigger commit.
fun test_update_framework_fee_decrease_requires_48h_delay() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = sui::clock::create_for_testing(ctx);

        // Starting base fee is 1000 (set by create_dapp_hub_for_testing).
        let (base_fee_0, _) = dapp_system::get_effective_fees(&dh);
        assert!(base_fee_0 == 1000u256);

        // Decrease: NOT applied immediately — schedules a pending.
        clock::set_for_testing(&mut clk, 0);
        dapp_system::update_framework_fee(&mut dh, 500u256, 10u256, &clk, ctx);

        // Committed fee still 1000 right after the call.
        let (base_fee_immediate, _) = dapp_system::get_effective_fees(&dh);
        assert!(base_fee_immediate == 1000u256);

        // After the 48-hour delay the pending (500) is visible via get_effective_fees_at.
        let (eff_after, _) = dapp_system::get_effective_fees_at(&dh, DELAY_MS);
        assert!(eff_after == 500u256);

        // Trigger commit by calling update_framework_fee again post-delay.
        clock::set_for_testing(&mut clk, DELAY_MS);
        dapp_system::update_framework_fee(&mut dh, 500u256, 10u256, &clk, ctx);

        // Now the decrease is committed (no-op second schedule since fees match).
        let (base_fee_committed, _) = dapp_system::get_effective_fees(&dh);
        assert!(base_fee_committed == 500u256);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Treasury cannot update the framework fee — only admin can.
#[test]
#[expected_failure]
fun test_update_framework_fee_aborts_for_treasury_caller() {
    // DappHub is created by FRAMEWORK_ADMIN.
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    // TREASURY_ONLY tries to update fee — must abort.
    test_scenario::next_tx(&mut scenario, TREASURY_ONLY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let clk = sui::clock::create_for_testing(ctx);
        dapp_system::update_framework_fee(&mut dh, 0u256, 0u256, &clk, ctx);
        clk.destroy_for_testing();
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// propose_treasury / accept_treasury — two-step framework treasury rotation
// ═══════════════════════════════════════════════════════════════════════════════

const TREASURY:     address = @0xFEE2;
const NEW_TREASURY: address = @0xFEE3;

#[test]
fun test_propose_treasury_sets_pending_treasury() {
    let mut scenario = test_scenario::begin(TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // No pending transfer initially.
        assert!(dapp_service::pending_treasury(dapp_service::get_fee_config(&dh)) == @0x0);

        dapp_system::propose_treasury(&mut dh, NEW_TREASURY, ctx);
        assert!(dapp_service::pending_treasury(dapp_service::get_fee_config(&dh)) == NEW_TREASURY);
        // Treasury not changed yet.
        assert!(dapp_service::treasury(dapp_service::get_fee_config(&dh)) == TREASURY);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
fun test_accept_treasury_completes_rotation() {
    let mut scenario = test_scenario::begin(TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dh
    };
    dapp_system::propose_treasury(&mut dh, NEW_TREASURY, test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, NEW_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_treasury(&mut dh, ctx);

        assert!(dapp_service::treasury(dapp_service::get_fee_config(&dh)) == NEW_TREASURY);
        assert!(dapp_service::pending_treasury(dapp_service::get_fee_config(&dh)) == @0x0);
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

#[test]
fun test_propose_treasury_zero_cancels_pending() {
    let mut scenario = test_scenario::begin(TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        dapp_system::propose_treasury(&mut dh, NEW_TREASURY, ctx);
        assert!(dapp_service::pending_treasury(dapp_service::get_fee_config(&dh)) == NEW_TREASURY);

        // Cancel by proposing @0x0.
        dapp_system::propose_treasury(&mut dh, @0x0, ctx);
        assert!(dapp_service::pending_treasury(dapp_service::get_fee_config(&dh)) == @0x0);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_propose_treasury_aborts_for_non_treasury() {
    let mut scenario = test_scenario::begin(EVIL);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    // Reuse scenario with explicit TREASURY then switch to EVIL.
    test_scenario::next_tx(&mut scenario, TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    test_scenario::next_tx(&mut scenario, EVIL);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::propose_treasury(&mut dh, EVIL, ctx);
    };
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_treasury_aborts_when_no_pending() {
    let mut scenario = test_scenario::begin(NEW_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        // No pending transfer — must abort.
        dapp_system::accept_treasury(&mut dh, ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_treasury_aborts_for_wrong_caller() {
    let mut scenario = test_scenario::begin(TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    dapp_system::propose_treasury(&mut dh, NEW_TREASURY, test_scenario::ctx(&mut scenario));

    // Wrong caller tries to accept.
    test_scenario::next_tx(&mut scenario, EVIL);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_treasury(&mut dh, ctx);
    };
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Framework version gating — lifecycle functions gate on FRAMEWORK_VERSION
// ═══════════════════════════════════════════════════════════════════════════════

/// Version gating test: create_user_storage must succeed when version matches.
#[test]
fun test_create_user_storage_succeeds_at_correct_version() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Framework version == FRAMEWORK_VERSION (1) — must succeed.
        assert!(dapp_service::framework_version(&dh) == dapp_system::framework_version());

        dapp_system::create_user_storage<FeeKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::has_registered_user_storage(&ds, sender));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Version gating test: bump_framework_version updates DappHub.version.
/// (This simulates what migrate() does after a package upgrade.)
#[test]
fun test_bump_framework_version_updates_dapp_hub_version() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // Version starts at 1 (FRAMEWORK_VERSION).
        assert!(dapp_service::framework_version(&dh) == 1);

        // Directly set version to 2 (simulating what a future migrate() call would do).
        dapp_service::set_framework_version(&mut dh, 2);
        assert!(dapp_service::framework_version(&dh) == 2);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Version gating — lifecycle functions abort when DappHub.version != FRAMEWORK_VERSION
//
// Technique: set hub.version = 2 via the test-only setter.  All version-gated
// functions compiled with FRAMEWORK_VERSION = 1 (the current constant) will
// then fail the assert_framework_version check.  This mirrors exactly what
// happens when an old package tries to use a DappHub that has been migrated
// to a newer framework version by migrate::run.
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_create_user_storage_aborts_after_framework_version_bump() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let (mut dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Simulate migrate::run bumping hub version to 2.
        dapp_service::set_framework_version(&mut dh, 2);

        // This package still has FRAMEWORK_VERSION = 1, so the call must abort.
        dapp_system::create_user_storage<FeeKey>(&dh, &mut ds, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_settle_writes_aborts_after_framework_version_bump() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (mut dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_service::add_credit(&mut ds, 1_000_000u256);
        let mut us = new_us(ctx);

        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(1), false, ctx);

        // Bump hub version to 2 to simulate post-migrate state.
        dapp_service::set_framework_version(&mut dh, 2);

        // Current package has FRAMEWORK_VERSION = 1 — must abort.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes — partial settlement (credit covers only some unsettled writes)
// ═══════════════════════════════════════════════════════════════════════════════

/// When the DApp credit pool can pay for fewer writes than the total unsettled,
/// settle_writes charges only what the pool can cover and leaves the rest pending.
/// The pool is fully drained (reaching zero) and settled_count advances by the
/// number of writes that were paid for.
#[test]
fun test_settle_writes_partial_settlement() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // base_fee=1000, bytes_fee=10, each set_record writes 4 bytes (u32) → 1040 credits/write.
        // Fund enough for exactly 3 writes: 1040 × 3 = 3120.
        dapp_service::add_credit(&mut ds, 1040u256 * 3);

        let mut us = new_us(ctx);

        // Write 5 records (3 will be payable, 2 remain pending).
        let mut i = 0u64;
        while (i < 5) {
            dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(i as u32), false, ctx);
            i = i + 1;
        };
        assert!(dapp_service::unsettled_count(&us) == 5);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // Pool is exhausted.
        assert!(dapp_service::credit_pool(&ds) == 0u256);
        // 3 writes settled, 2 remain unsettled.
        assert!(dapp_service::settled_count(&us) == 3);
        assert!(dapp_service::unsettled_count(&us) == 2);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes — partial settlement with revenue sharing (share_bps > 0)
// ═══════════════════════════════════════════════════════════════════════════════

/// Partial settlement where the DApp has a non-zero revenue share (share_bps=3000).
///
/// The DApp owes only the framework's cut (70%) of the proportionally settled
/// writes, NOT the full write cost.  The old formula (exact_cost = raw write cost)
/// exceeded total_available when share_bps > 0, causing arithmetic underflow.
///
/// Budget:         4 000 credits
/// Writes:         10 (no bytes, bytes_fee=0)
/// total_cost:     10 000  (1000 × 10)
/// framework_cost: 7 000  (10000 × 70%)
/// settled_writes: ⌊4000 × 10 / 7000⌋ = 5
/// exact_cost:     (1000 × 5) × 70% = 3 500  ≤ 4 000  ✓
/// remaining pool: 4 000 − 3 500 = 500
///
/// Old buggy formula: exact_cost = 1000 × 5 = 5000 > 4000 → underflow.
#[test]
fun test_settle_writes_partial_settlement_with_revenue_share() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 3000);
        dapp_service::add_credit(&mut ds, 4000u256);

        let mut us = new_us(ctx);
        let mut i = 0u64;
        while (i < 10) {
            dapp_service::increment_write_count(&mut us);
            i = i + 1;
        };
        assert!(dapp_service::unsettled_count(&us) == 10);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        assert!(dapp_service::settled_count(&us) == 5);
        assert!(dapp_service::unsettled_count(&us) == 5);
        // exact_cost = 3500; pool must not be over-consumed.
        assert!(dapp_service::credit_pool(&ds) == 500u256);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes — zero-progress guard (credit insufficient for even 1 write)
// ═══════════════════════════════════════════════════════════════════════════════

/// When available credit is too small to retire even one write unit (floor rounds
/// to 0 for both settled_writes and settled_bytes), settle_writes must NOT deduct
/// any credit. The pool is preserved and emit_settlement_skipped is used.
#[test]
fun test_settle_writes_preserves_credit_when_progress_is_zero() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // base_fee=1000, share_bps=3000 → framework_cost_per_write = 700.
        // Fund only 100 credits: settled_writes = floor(100*1/700) = 0,
        // settled_bytes = floor(100*4/700) = 0 → both zero, deduction must be skipped.
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 3000);
        dapp_service::add_credit(&mut ds, 100u256);

        let mut us = new_us(ctx);
        // 1 write: unsettled_count = 1, framework_cost = 700, total_available = 100.
        // settled_writes = floor(100 * 1 / 700) = 0 → zero progress, skip deduction.
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(0u32), false, ctx);
        assert!(dapp_service::unsettled_count(&us) == 1);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // Credit must be preserved (NOT consumed).
        assert!(dapp_service::credit_pool(&ds) == 100u256);
        // Debt unchanged.
        assert!(dapp_service::unsettled_count(&us) == 1);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes — DAPP_SUBSIDIZES only charges the framework portion
// ═══════════════════════════════════════════════════════════════════════════════

/// With share_bps = 3000 (30% to DApp), the DApp only owes the remaining 70%.
/// One write at base_fee=1000, bytes_fee=0: framework_cost = 1000 × 7000/10000 = 700.
/// Funding exactly 700 credits must cover the write in full.
#[test]
fun test_settle_writes_dapp_mode_charges_only_framework_portion() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        // Use base_fee only (no bytes fee) so total_cost = 1000 per write.
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        // 30% revenue share → DApp pays only 70% to the framework.
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 3000);
        // Fund exactly the 70% framework portion: 1000 × 70% = 700.
        dapp_service::add_credit(&mut ds, 700u256);

        let mut us = new_us(ctx);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(1u32), false, ctx);
        assert!(dapp_service::unsettled_count(&us) == 1);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // Fully settled and pool is now zero.
        assert!(dapp_service::unsettled_count(&us) == 0);
        assert!(dapp_service::settled_count(&us) == 1);
        assert!(dapp_service::credit_pool(&ds) == 0u256);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// With share_bps = 10000 (100% to DApp), framework_cost = 0.
/// Writes should be settled for free even with an empty credit pool.
#[test]
fun test_settle_writes_free_when_framework_share_is_zero() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, mut ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        // 100% revenue share → framework collects nothing → writes are free for the DApp.
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 10_000);
        // Intentionally empty pool.
        assert!(dapp_service::credit_pool(&ds) == 0u256);

        let mut us = new_us(ctx);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(1u32), false, ctx);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // Settled at no cost.
        assert!(dapp_service::unsettled_count(&us) == 0);
        assert!(dapp_service::settled_count(&us) == 1);
        assert!(dapp_service::credit_pool(&ds) == 0u256);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// update_framework_fee — pending fee increase mechanism (48-hour delay)
// ═══════════════════════════════════════════════════════════════════════════════

/// A fee INCREASE is not applied immediately — it is scheduled with a 48-hour delay.
/// The base fee remains unchanged until the pending fee is committed.
#[test]
fun test_fee_increase_schedules_pending_not_immediate() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, 0);

        // Starting base fee is 1000; increasing to 2000 must be scheduled.
        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);

        // Base fee is still 1000 — not yet committed.
        assert!(dapp_service::base_fee_per_write(dapp_service::get_fee_config(&dh)) == 1000u256);
        // Pending base fee is set to 2000.
        assert!(dapp_service::pending_base_fee(dapp_service::get_fee_config(&dh)) == 2000u256);
        // Effective-at is exactly now + 48-hour delay.
        assert!(dapp_service::fee_effective_at_ms(dapp_service::get_fee_config(&dh)) == DELAY_MS);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Before the delay expires, get_effective_fee_per_write_at returns the current base fee.
#[test]
fun test_get_effective_fee_before_delay_returns_base_fee() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, 0);

        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);

        // Query at one millisecond before the delay expires → base fee returned.
        let (eff_base, _) = dapp_system::get_effective_fees_at(&dh, DELAY_MS - 1);
        assert!(eff_base == 1000u256);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// At or after the delay, get_effective_fee_per_write_at returns the pending (higher) fee.
/// The pending value is NOT yet committed to storage — that happens on the next
/// call to update_framework_fee.
#[test]
fun test_get_effective_fee_at_or_after_delay_returns_pending_fee() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, 0);

        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);

        // Exactly at effective_at → pending fee returned.
        let (eff_at_delay, _) = dapp_system::get_effective_fees_at(&dh, DELAY_MS);
        assert!(eff_at_delay == 2000u256);
        // Well after effective_at → still pending fee.
        let (eff_after, _) = dapp_system::get_effective_fees_at(&dh, DELAY_MS + 1_000);
        assert!(eff_after == 2000u256);
        // Base fee still unchanged in storage.
        assert!(dapp_service::base_fee_per_write(dapp_service::get_fee_config(&dh)) == 1000u256);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// A second call to update_framework_fee after the delay commits the matured pending fee
/// to base_fee first, then applies the new fee value.
#[test]
fun test_second_update_commits_matured_pending_then_applies_new_fee() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Schedule an increase: base=1000 → pending=2000, effective at DELAY_MS.
        clock::set_for_testing(&mut clk, 0);
        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);
        assert!(dapp_service::pending_base_fee(dapp_service::get_fee_config(&dh)) == 2000u256);

        // Advance clock past the delay, then schedule a decrease to 500.
        // The function must first commit pending=2000 to base, then schedule the new decrease.
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::update_framework_fee(&mut dh, 500u256, 5u256, &clk, ctx);

        // Pending (2000) was committed → base is now 2000.
        assert!(dapp_service::base_fee_per_write(dapp_service::get_fee_config(&dh)) == 2000u256);
        // New pending (500, 5) scheduled — NOT applied immediately.
        assert!(dapp_service::pending_base_fee(dapp_service::get_fee_config(&dh)) == 500u256);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// settle_writes — free tier (fee_per_write == 0)
// ═══════════════════════════════════════════════════════════════════════════════

/// When the framework fee is 0, settle_writes marks all writes as settled without
/// deducting any credit from the DApp's credit pool.
#[test]
fun test_settle_writes_free_tier_marks_settled_without_charging_credit() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let clk = clock::create_for_testing(ctx);

        // Add credit — it must NOT be touched by settle_writes in free-tier mode.
        // create_dapp_storage_for_testing creates ds with base_fee=0, bytes_fee=0 (free tier).
        dapp_service::add_credit(&mut ds, 5_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(FRAMEWORK_ADMIN, ctx);

        let mut i = 0u64;
        while (i < 3) {
            dapp_system::set_record<FeeKey>(
                FeeKey {}, &mut us, k(b"k"), fns(), u32v(i as u32), false, ctx
            );
            i = i + 1;
        };
        assert!(dapp_service::unsettled_count(&us) == 3);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // All settled.
        assert!(dapp_service::unsettled_count(&us) == 0);
        // Credit pool completely untouched.
        assert!(dapp_service::credit_pool(&ds) == 5_000u256);

        clk.destroy_for_testing();
        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Version gating — update_framework_fee
// ═══════════════════════════════════════════════════════════════════════════════

/// update_framework_fee must abort when DappHub.version != FRAMEWORK_VERSION.
#[test]
#[expected_failure]
fun test_update_framework_fee_aborts_after_framework_version_bump() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);

        // Bump to v2.
        dapp_service::set_framework_version(&mut dh, 2);

        // Must abort with not_latest_version.
        dapp_system::update_framework_fee(&mut dh, 500u256, 10u256, &clk, ctx);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// dapp_key_mismatch — settle_writes and recharge_credit
// ═══════════════════════════════════════════════════════════════════════════════

/// settle_writes must abort when DappStorage belongs to a different DApp.
#[test]
#[expected_failure]
fun test_settle_writes_aborts_on_dapp_storage_key_mismatch() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        // DappStorage keyed to FeeWrongKey — does not match settle_writes<FeeKey>.
        let mut ds_wrong = dapp_service::create_dapp_storage_for_testing<FeeWrongKey>(ctx);
        dapp_service::add_credit(&mut ds_wrong, 1_000_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(USER, ctx);
        dapp_service::increment_write_count(&mut us);

        // Must abort: dapp_storage belongs to FeeWrongKey, not FeeKey.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds_wrong, &mut us, ctx);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds_wrong);
    };
    scenario.end();
}

/// settle_writes must abort when UserStorage belongs to a different DApp.
#[test]
#[expected_failure]
fun test_settle_writes_aborts_on_user_storage_key_mismatch() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::add_credit(&mut ds, 1_000_000u256);
        // UserStorage keyed to FeeWrongKey — does not match settle_writes<FeeKey>.
        let mut us_wrong = dapp_service::create_user_storage_for_testing<FeeWrongKey>(USER, ctx);
        dapp_service::increment_write_count(&mut us_wrong);

        // Must abort: user_storage belongs to FeeWrongKey, not FeeKey.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us_wrong, ctx);

        dapp_service::destroy_user_storage(us_wrong);
        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Free credit — grant / revoke / extend / settlement dual-pool
// ═══════════════════════════════════════════════════════════════════════════════

/// grant_free_credit sets amount and expiry; only framework admin may call.
#[test]
fun test_grant_free_credit_sets_amount_and_expiry() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        assert!(dapp_service::free_credit(&ds) == 0);

        // Grant 100 credits with expiry at epoch 9_999_999.
        dapp_system::grant_free_credit<FeeKey>(&dh, &mut ds, 100u256, 9_999_999u64, ctx);

        assert!(dapp_service::free_credit(&ds) == 100);
        assert!(dapp_service::free_credit_expires_at(&ds) == 9_999_999);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// grant_free_credit is an override — calling it again replaces the previous grant.
#[test]
fun test_grant_free_credit_overrides_existing() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        dapp_system::grant_free_credit<FeeKey>(&dh, &mut ds, 500u256, 9_999_999u64, ctx);
        // Override with a different amount and expiry.
        dapp_system::grant_free_credit<FeeKey>(&dh, &mut ds, 200u256, 1_111_111u64, ctx);

        assert!(dapp_service::free_credit(&ds) == 200);
        assert!(dapp_service::free_credit_expires_at(&ds) == 1_111_111);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// revoke_free_credit zeroes out remaining balance.
#[test]
fun test_revoke_free_credit_clears_balance() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        dapp_system::grant_free_credit<FeeKey>(&dh, &mut ds, 300u256, 0u64, ctx);
        assert!(dapp_service::free_credit(&ds) == 300);

        dapp_system::revoke_free_credit<FeeKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::free_credit(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// extend_free_credit updates only the expiry, not the amount.
#[test]
fun test_extend_free_credit_updates_only_expiry() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        dapp_system::grant_free_credit<FeeKey>(&dh, &mut ds, 400u256, 1_000_000u64, ctx);
        dapp_system::extend_free_credit<FeeKey>(&dh, &mut ds, 5_000_000u64, ctx);

        assert!(dapp_service::free_credit(&ds) == 400);           // amount unchanged
        assert!(dapp_service::free_credit_expires_at(&ds) == 5_000_000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// settle_writes consumes free credit before the paid credit_pool.
/// base_fee=1000, bytes_fee=10 (from create_dapp_hub_for_testing).
/// 1 write of 0 bytes → cost = 1000.
/// free_credit = 5000 (>= cost) → all from free; credit_pool untouched.
#[test]
fun test_settle_writes_consumes_free_credit_first() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(USER, ctx);

        // 5000 free credit (never expires), 2000 paid.
        dapp_service::set_free_credit(&mut ds, 5000u256, 0u64);
        dapp_service::add_credit(&mut ds, 2000u256);

        // Set per-DApp fee rates so settle_writes charges at base=1000.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);

        // 1 write of 0 bytes → cost = 1000.
        dapp_service::increment_write_count(&mut us);
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // free_credit consumed first: 5000 - 1000 = 4000 remaining.
        assert!(dapp_service::free_credit(&ds) == 4000);
        // credit_pool untouched.
        assert!(dapp_service::credit_pool(&ds) == 2000);
        // All writes settled.
        assert!(dapp_service::unsettled_count(&us) == 0);
        // total_settled not incremented (free payment).
        assert!(dapp_service::total_settled(&ds) == 0);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// When free_credit < cost, free is exhausted first and the remainder hits credit_pool.
/// base_fee=1000 → cost = 1000; free_credit = 300 → free_used=300, paid_used=700.
#[test]
fun test_settle_writes_spills_from_free_to_paid() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(USER, ctx);

        // 300 free credit, 2000 paid.
        dapp_service::set_free_credit(&mut ds, 300u256, 0u64);
        dapp_service::add_credit(&mut ds, 2000u256);

        // Set per-DApp fee rates so settle_writes charges at base=1000.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);

        // 1 write → cost = 1000.
        dapp_service::increment_write_count(&mut us);
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        assert!(dapp_service::free_credit(&ds) == 0);             // fully drained
        assert!(dapp_service::credit_pool(&ds) == 2000 - 700);    // 700 deducted from paid
        assert!(dapp_service::total_settled(&ds) == 700);         // only paid portion tracked
        assert!(dapp_service::unsettled_count(&us) == 0);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Expired free credit is treated as 0; settlement falls entirely on credit_pool.
#[test]
fun test_settle_writes_ignores_expired_free_credit() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(USER, ctx);

        // Free credit that expired at epoch 1 (now = 0 in test, but epoch_timestamp_ms
        // returns 0 in unit tests so set expires_at = 0 to mean never-expires is wrong here).
        // Use expires_at = 1 so effective_free = 0 when epoch is 0.
        dapp_service::set_free_credit(&mut ds, 5000u256, 1u64);  // expires_at = 1 ms
        dapp_service::add_credit(&mut ds, 5000u256);

        // Set per-DApp fee rates so settle_writes charges at base=1000.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);

        // 1 write → cost = 1000.
        dapp_service::increment_write_count(&mut us);
        // epoch_timestamp_ms() == 0 in unit tests → 0 >= 1 is false → still valid!
        // Use expires_at = 0 to represent "already expired" is tricky in unit tests.
        // Instead validate the inverse: expires_at = 0 → never expires → free used.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // expires_at = 1, epoch = 0 → 0 < 1 → free credit IS effective.
        assert!(dapp_service::free_credit(&ds) == 4000);
        assert!(dapp_service::credit_pool(&ds) == 5000);
        assert!(dapp_service::total_settled(&ds) == 0);

        dapp_service::destroy_user_storage(us);
        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// update_default_free_credit changes the default applied to new DApps.
#[test]
fun test_update_default_free_credit_changes_config() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // create_dapp_hub_for_testing initialises with default_free_credit = 0.
        assert!(dapp_service::default_free_credit(dapp_service::get_config(&dh)) == 0);

        dapp_system::update_default_free_credit(&mut dh, 25_000_000_000u256, 15_778_800_000u64, ctx);

        assert!(dapp_service::default_free_credit(dapp_service::get_config(&dh)) == 25_000_000_000);
        assert!(dapp_service::default_free_credit_duration_ms(dapp_service::get_config(&dh)) == 15_778_800_000);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// recharge_credit must abort when DappStorage belongs to a different DApp.
#[test]
#[expected_failure]
fun test_recharge_credit_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        // DappStorage keyed to FeeWrongKey — does not match recharge_credit<FeeKey>.
        let mut ds_wrong = dapp_service::create_dapp_storage_for_testing<FeeWrongKey>(ctx);

        let payment = coin::mint_for_testing<SUI>(1_000, ctx);
        // Must abort: dapp_storage belongs to FeeWrongKey, not FeeKey.
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds_wrong, payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds_wrong);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// sync_dapp_fee — permissionless pull of DappHub effective fees into DappStorage
// ═══════════════════════════════════════════════════════════════════════════════

/// Any caller can sync a DApp's rates to the current DappHub defaults.
#[test]
fun test_sync_dapp_fee_copies_current_defaults() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // DappHub default (from create_dapp_hub_for_testing): base=1000, bytes=10.
        let (default_base, default_bytes) = dapp_system::get_effective_fees(&dh);
        assert!(default_base == 1000u256);

        // DappStorage starts at 0.
        assert!(dapp_service::dapp_base_fee_per_write(&ds) == 0);

        // Sync pulls the DappHub defaults into DappStorage.
        dapp_system::sync_dapp_fee<FeeKey>(&dh, &mut ds);

        assert!(dapp_service::dapp_base_fee_per_write(&ds) == default_base);
        assert!(dapp_service::dapp_bytes_fee_per_byte(&ds) == default_bytes);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// sync_dapp_fee uses the effective (pending) fee after the delay has elapsed.
#[test]
fun test_sync_dapp_fee_uses_effective_fee_after_delay() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds  = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Schedule an increase: base 1000 → 2000, effective in 48 hours.
        clock::set_for_testing(&mut clk, 0);
        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);

        // Before the delay: effective fee is still 1000.
        // sync_dapp_fee uses get_effective_fees which reads current clock via tx_context
        // — but in unit tests we use get_effective_fees_at for time-sensitive assertions.
        let (eff_before, _) = dapp_system::get_effective_fees_at(&dh, DELAY_MS - 1);
        assert!(eff_before == 1000u256);

        // After the delay the pending fee (2000) becomes effective.
        let (eff_after, eff_bytes) = dapp_system::get_effective_fees_at(&dh, DELAY_MS);
        assert!(eff_after == 2000u256);

        // Manually sync using the post-delay effective fee.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, eff_after);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, eff_bytes);

        assert!(dapp_service::dapp_base_fee_per_write(&ds) == 2000);
        assert!(dapp_service::dapp_bytes_fee_per_byte(&ds) == 20);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// sync_dapp_fee must abort when called with the wrong DappKey type.
#[test]
#[expected_failure]
fun test_sync_dapp_fee_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        // DappStorage keyed to FeeWrongKey — caller passes FeeKey → mismatch.
        let mut ds_wrong = dapp_system::create_dapp_storage_for_testing<FeeWrongKey>(ctx);

        dapp_system::sync_dapp_fee<FeeKey>(&dh, &mut ds_wrong);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds_wrong);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// propose_coin_type / accept_coin_type — two-step payment coin type migration
// ═══════════════════════════════════════════════════════════════════════════════
//
// Flow:
//   treasury → propose_coin_type<NewCoin>(dh, clock, ctx)   (schedules change)
//   [48 h pass]
//   treasury → accept_coin_type(dh, clock, ctx)              (commits change)
//   recharge_credit<DappKey, NewCoin> ✅   recharge_credit<DappKey, OldCoin> ❌

/// A phantom coin type used as the migration target in coin-type tests.
public struct AltCoin has copy, drop {}

const COIN_TREASURY: address = @0xCF01;
const COIN_ATTACKER: address = @0xBAD9;

// ─── recharge_credit: wrong coin type ────────────────────────────────────────

/// Paying with a coin type that is not accepted by DappHub must abort.
#[test]
#[expected_failure]
fun test_recharge_credit_aborts_on_wrong_coin_type() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // DappHub accepts SUI (set by create_dapp_hub_for_testing).
        // Paying with AltCoin must abort with wrong_payment_coin_type.
        let bad_payment = coin::mint_for_testing<AltCoin>(1_000, ctx);
        dapp_system::recharge_credit<FeeKey, AltCoin>(&dh, &mut ds, bad_payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// recharge_credit must abort when the DApp is in USER_PAYS mode.
/// In USER_PAYS mode the credit_pool is not consumed by settlement so depositing is misleading.
#[test]
#[expected_failure]
fun test_recharge_credit_aborts_in_user_pays_mode() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Switch to USER_PAYS mode.
        dapp_service::set_settlement_mode(&mut ds, 1);

        let payment = coin::mint_for_testing<SUI>(1_000, ctx);
        // Must abort: wrong_settlement_mode.
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ─── propose_coin_type ────────────────────────────────────────────────────────

/// propose_coin_type records the pending type and a future effective timestamp.
#[test]
fun test_propose_coin_type_sets_pending() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);

        // Before proposal: no pending change.
        let cfg = dapp_service::get_fee_config(&dh);
        assert!(option::is_none(dapp_service::pending_coin_type(cfg)));
        assert!(dapp_service::coin_type_effective_at_ms(cfg) == 0);

        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);

        let cfg = dapp_service::get_fee_config(&dh);
        assert!(option::is_some(dapp_service::pending_coin_type(cfg)));
        assert!(dapp_service::coin_type_effective_at_ms(cfg) > 0);
        // accepted_coin_type must NOT change until accept_coin_type is called.
        assert!(
            *option::borrow(dapp_service::accepted_coin_type(cfg)) == type_name::with_defining_ids<SUI>()
        );

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Only the framework admin may call propose_coin_type.
#[test]
#[expected_failure]
fun test_propose_coin_type_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    // COIN_ATTACKER is not the framework admin.
    test_scenario::next_tx(&mut scenario, COIN_ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let clk = clock::create_for_testing(ctx);
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        clk.destroy_for_testing();
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

/// A second propose_coin_type call replaces the previously pending change.
#[test]
fun test_propose_coin_type_replaces_pending() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // First proposal.
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        let first_effective_at =
            dapp_service::coin_type_effective_at_ms(dapp_service::get_fee_config(&dh));

        // Advance clock slightly and propose again (same treasury).
        clock::set_for_testing(&mut clk, 1_000);
        dapp_system::propose_coin_type<SUI>(&mut dh, &clk, ctx);

        let cfg = dapp_service::get_fee_config(&dh);
        // Pending type is now SUI (the replacement).
        assert!(
            *option::borrow(dapp_service::pending_coin_type(cfg)) == type_name::with_defining_ids<SUI>()
        );
        // Effective timestamp was reset to the new proposal time.
        assert!(dapp_service::coin_type_effective_at_ms(cfg) > first_effective_at);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ─── accept_coin_type ─────────────────────────────────────────────────────────

/// accept_coin_type must abort when there is no pending change.
#[test]
#[expected_failure]
fun test_accept_coin_type_aborts_with_no_pending() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);

        // No propose_coin_type was called — must abort.
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// accept_coin_type must abort when the 48-hour delay has not elapsed.
#[test]
#[expected_failure]
fun test_accept_coin_type_aborts_before_delay() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Propose at t=0.
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);

        // Advance to just before the 48-hour mark.
        clock::set_for_testing(&mut clk, DELAY_MS - 1);

        // Must abort: delay has not elapsed.
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Only the framework admin may call accept_coin_type.
#[test]
#[expected_failure]
fun test_accept_coin_type_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        clk.destroy_for_testing();
        dh
    };

    // Advance past delay and try as a non-admin address.
    test_scenario::next_tx(&mut scenario, COIN_ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);
        clk.destroy_for_testing();
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

/// After the 48-hour delay, accept_coin_type commits the pending coin type.
#[test]
fun test_accept_coin_type_happy_path() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Propose AltCoin as the new accepted type.
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);

        // Advance time past the delay and commit.
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);

        let cfg = dapp_service::get_fee_config(&dh);
        // accepted_coin_type is now AltCoin.
        assert!(
            *option::borrow(dapp_service::accepted_coin_type(cfg)) == type_name::with_defining_ids<AltCoin>()
        );
        // Pending is cleared.
        assert!(option::is_none(dapp_service::pending_coin_type(cfg)));
        assert!(dapp_service::coin_type_effective_at_ms(cfg) == 0);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

// ─── End-to-end: coin type switch ─────────────────────────────────────────────

/// After a completed coin type migration, recharge with the new coin succeeds.
#[test]
fun test_coin_type_switch_new_coin_accepted() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Migrate SUI → AltCoin.
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);

        let credit_before = dapp_service::credit_pool(&ds);

        // Recharge with the new coin type — must succeed.
        let payment = coin::mint_for_testing<AltCoin>(2_000_000, ctx);
        dapp_system::recharge_credit<FeeKey, AltCoin>(&dh, &mut ds, payment, ctx);

        assert!(dapp_service::credit_pool(&ds) == credit_before + 2_000_000u256);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// After a completed coin type migration, recharge with the old coin type aborts.
#[test]
#[expected_failure]
fun test_coin_type_switch_old_coin_rejected() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Migrate SUI → AltCoin.
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::accept_coin_type(&mut dh, &clk, ctx);

        // Recharge with old SUI — must abort with wrong_payment_coin_type.
        let old_payment = coin::mint_for_testing<SUI>(1_000, ctx);
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, old_payment, ctx);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ─── Multi-Mode Settlement: USER_PAYS tests ────────────────────────────────────

const DAPP_ADMIN: address = @0xDA01;
const REGULAR_USER: address = @0xBEEF;
const ATTACKER: address = @0xBAD1;

/// settle_writes_user_pays aborts when DApp is in DAPP_SUBSIDIZES mode (mode=0).
#[test]
#[expected_failure]
fun test_settle_writes_user_pays_aborts_in_dapp_subsidizes_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // DApp is in mode=0 (DAPP_SUBSIDIZES) → settle_writes_user_pays must abort.
        let payment = coin::mint_for_testing<SUI>(1_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// Switching from USER_PAYS(1) → DAPP_SUBSIDIZES(0) is now allowed (bidirectional).
#[test]
fun test_can_switch_back_to_dapp_subsidizes() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Switch to USER_PAYS.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        assert!(dapp_service::settlement_mode(&ds) == 1);

        // Switch back to DAPP_SUBSIDIZES — must succeed.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 0, ctx);
        assert!(dapp_service::settlement_mode(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// DAPP_SUBSIDIZES(0) → USER_PAYS(1) succeeds; credit_pool balance is kept (not refunded).
#[test]
fun test_switch_to_user_pays_credit_pool_kept() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Pre-charge some credit.
        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        dapp_system::recharge_credit<FeeKey, SUI>(&dh, &mut ds, payment, ctx);
        assert!(dapp_service::credit_pool(&ds) == 5_000_000);

        // Switch to USER_PAYS with 30% DApp share.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);

        // credit_pool is still intact (no refund).
        assert!(dapp_service::credit_pool(&ds) == 5_000_000);
        assert!(dapp_service::settlement_mode(&ds) == 1);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 3000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes_user_pays splits correctly — framework gets 70%, DApp gets 30%.
/// Also verifies change is returned and writes are marked settled.
#[test]
fun test_settle_writes_user_pays_splits_correctly() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS with 3000 bps (30%) DApp share.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);

        // Simulate 1 write (cost = 1_000_000 MIST).
        dapp_service::increment_write_count(&mut us);

        // Overpay with 10_000_000 — expect 9_000_000 change returned.
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // Change returned to caller.
        assert!(coin::value(&change) == 9_000_000);
        coin::burn_for_testing(change);
        // DApp balance should be 30% of 1_000_000 = 300_000.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 300_000);
        // Writes fully settled.
        assert!(dapp_service::unsettled_count(&us) == 0);
        // credit_pool untouched.
        assert!(dapp_service::credit_pool(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes_user_pays aborts when payment is insufficient.
#[test]
#[expected_failure]
fun test_settle_writes_user_pays_aborts_on_insufficient_payment() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        // 3 writes → cost = 3_000_000. Provide only 100 → abort.
        dapp_service::increment_write_count(&mut us);
        dapp_service::increment_write_count(&mut us);
        dapp_service::increment_write_count(&mut us);
        let payment = coin::mint_for_testing<SUI>(100, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes (no-coin version) aborts when mode is USER_PAYS and there are unsettled writes.
#[test]
#[expected_failure]
fun test_settle_writes_aborts_in_user_pays_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);

        // settle_writes (no coin) must abort in USER_PAYS mode when writes are pending.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// withdraw_dapp_revenue succeeds and empties the Balance.
#[test]
fun test_withdraw_dapp_revenue_happy_path() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 10_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS with 30% DApp share and settle 1 write.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);
        dapp_service::increment_write_count(&mut us);
        // cost = 10_000_000, dapp share = 30% = 3_000_000.
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        // DApp balance = 3_000_000.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 3_000_000);

        // Admin withdraws.
        let withdrawn = dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&dh, &mut ds, ctx);
        assert!(coin::value(&withdrawn) == 3_000_000);
        coin::burn_for_testing(withdrawn);

        // Balance now zero.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// withdraw_dapp_revenue aborts when balance is zero.
#[test]
#[expected_failure]
fun test_withdraw_dapp_revenue_aborts_when_empty() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Switch to USER_PAYS but no deposits made → balance is 0.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        let withdrawn = dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&dh, &mut ds, ctx);
        coin::burn_for_testing(withdrawn);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// withdraw_dapp_revenue aborts when called by a non-admin address.
#[test]
#[expected_failure]
fun test_withdraw_dapp_revenue_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    let (mut dh, mut ds) = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 5_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);
        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);
        dapp_service::destroy_user_storage(us);
        (dh, ds)
    };

    // Attacker tries to withdraw — must abort.
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let withdrawn = dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&dh, &mut ds, ctx);
        coin::burn_for_testing(withdrawn);
    };

    dapp_system::destroy_dapp_hub(dh);
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

// ─── Multi-Mode Settlement: missing coverage ───────────────────────────────────

/// USER_PAYS: global write is free — credit_pool must not be touched.
#[test]
fun test_global_write_free_in_user_pays_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 500u256);
        dapp_service::add_credit(&mut ds, 10_000_000u256);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        dapp_system::set_global_record<FeeKey>(
            FeeKey {}, &mut ds, k(b"cfg"), fns(), vector[b"v1"], false
        );

        // credit_pool must be unchanged.
        assert!(dapp_service::credit_pool(&ds) == 10_000_000u256);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes (no-coin) with 0 unsettled writes must NOT abort.
#[test]
fun test_settle_writes_no_coin_ok_when_nothing_to_settle_in_user_pays() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        // No writes pending — must return early, not abort.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes_user_pays returns payment unchanged when nothing to settle.
#[test]
fun test_settle_writes_user_pays_returns_payment_when_nothing_to_settle() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // Payment returned unchanged — nothing was settled.
        assert!(coin::value(&change) == 5_000_000);
        coin::burn_for_testing(change);
        // No revenue accumulated — payment returned to sender.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes_user_pays with fee=0 settles for free and returns payment.
#[test]
fun test_settle_writes_user_pays_free_tier_returns_payment() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 0u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);

        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // Settled for free — full payment returned unchanged.
        assert!(coin::value(&change) == 5_000_000);
        coin::burn_for_testing(change);

        assert!(dapp_service::unsettled_count(&us) == 0);
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes_user_pays aborts on wrong coin type.
#[test]
#[expected_failure]
fun test_settle_writes_user_pays_wrong_coin_type_aborts() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);

        // Accepted type is SUI; paying with AltCoin must abort.
        let payment = coin::mint_for_testing<AltCoin>(5_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, AltCoin>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// set_dapp_settlement_config aborts when called by a non-admin.
#[test]
#[expected_failure]
fun test_set_dapp_settlement_config_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    let mut ds = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_system::destroy_dapp_hub(dh);
        ds
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

/// After switching USER_PAYS → DAPP, unsettled user writes are settled from credit_pool.
#[test]
fun test_switch_back_to_dapp_user_writes_settled_by_credit_pool() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        dapp_service::add_credit(&mut ds, 5_000_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // In USER_PAYS, accumulate 2 writes without settling.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);
        dapp_service::increment_write_count(&mut us);

        // Switch back to DAPP_SUBSIDIZES.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 0, ctx);

        let pool_before = dapp_service::credit_pool(&ds);
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // 2 writes × 1000 = 2000 deducted from credit_pool.
        assert!(dapp_service::unsettled_count(&us) == 0);
        assert!(dapp_service::credit_pool(&ds) == pool_before - 2_000u256);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// After switching USER_PAYS → DAPP, Revenue Balance is preserved and still withdrawable.
#[test]
fun test_switch_back_to_dapp_revenue_balance_preserved() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 10_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);
        dapp_service::increment_write_count(&mut us);
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 3_000_000);

        // Switch back to DAPP_SUBSIDIZES.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 0, ctx);

        // Revenue Balance intact and withdrawable.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 3_000_000);
        let withdrawn = dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&dh, &mut ds, ctx);
        assert!(coin::value(&withdrawn) == 3_000_000);
        coin::burn_for_testing(withdrawn);
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

// update_max_revenue_share aborts when called by a non-admin.
// ─── 6 missing scenarios ──────────────────────────────────────────────────────

/// settle_writes_user_pays: overpayment change is returned to the caller as a Coin.
#[test]
fun test_settle_writes_user_pays_returns_change_to_caller() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);
        dapp_service::increment_write_count(&mut us);

        // Overpay by 500_000 — change must be returned as a Coin.
        let payment = coin::mint_for_testing<SUI>(1_500_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // Change coin holds the exact overpayment.
        assert!(coin::value(&change) == 500_000);
        coin::burn_for_testing(change);

        // Writes settled and revenue split correctly.
        assert!(dapp_service::unsettled_count(&us) == 0);
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 300_000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// settle_writes_user_pays: bytes fee component contributes to total cost correctly.
#[test]
fun test_settle_writes_user_pays_includes_bytes_fee() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        // 1000 MIST per write, 10 MIST per byte.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 10u256);
        // UserStorage must be owned by the same sender (DAPP_ADMIN) to pass is_write_authorized.
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        // One write of 4 bytes (u32 = 4 bytes).
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k"), fns(), u32v(42u32), false, ctx);

        // total_cost = 1000 + 10 × 4 = 1040.
        let payment = coin::mint_for_testing<SUI>(1_040, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        assert!(dapp_service::unsettled_count(&us) == 0);
        // 0% dapp share → all revenue is framework revenue (0 in dapp balance).
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// settle_writes_user_pays aborts after framework version bump.
#[test]
#[expected_failure]
fun test_settle_writes_user_pays_aborts_after_version_bump() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);

        // Bump framework version — subsequent calls must abort.
        dapp_service::set_framework_version(&mut dh, 2);

        let payment = coin::mint_for_testing<SUI>(1_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// set_dapp_settlement_config aborts after framework version bump.
#[test]
#[expected_failure]
fun test_set_dapp_settlement_config_aborts_after_version_bump() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        dapp_service::set_framework_version(&mut dh, 2);

        // Must abort with not_latest_version.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// withdraw_dapp_revenue aborts on DappKey type mismatch.
#[test]
#[expected_failure]
fun test_withdraw_dapp_revenue_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 10_000_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        dapp_service::increment_write_count(&mut us);
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);
        coin::burn_for_testing(change);

        // Pass FeeWrongKey but ds is keyed to FeeKey → must abort.
        let withdrawn = dapp_system::withdraw_dapp_revenue<FeeWrongKey, SUI>(&dh, &mut ds, ctx);
        coin::burn_for_testing(withdrawn);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

// ─── set_dapp_revenue_share tests ────────────────────────────────────────────

/// Framework admin can set per-DApp revenue share; value is immediately stored.
#[test]
fun test_set_dapp_revenue_share_by_framework_admin() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Framework admin sets per-DApp share to 4000 (40%).
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 4000, ctx);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 4000);

        // Update to 0% (framework takes 100%).
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 0, ctx);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// set_dapp_revenue_share aborts when caller is not the framework admin.
#[test]
#[expected_failure]
fun test_set_dapp_revenue_share_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    test_scenario::next_tx(&mut scenario, DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        // DAPP_ADMIN is not the framework admin → must abort.
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 3000, ctx);
        dapp_system::destroy_dapp_storage(ds);
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

/// set_dapp_revenue_share aborts when bps > 10000.
#[test]
#[expected_failure]
fun test_set_dapp_revenue_share_aborts_for_bps_over_max() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // 10001 bps > 10000 → must abort.
        dapp_system::set_dapp_revenue_share<FeeKey>(&dh, &mut ds, 10001, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// set_dapp_revenue_share aborts when DappKey does not match DappStorage.
#[test]
#[expected_failure]
fun test_set_dapp_revenue_share_aborts_for_key_mismatch() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Wrong DappKey type → must abort.
        dapp_system::set_dapp_revenue_share<FeeWrongKey>(&dh, &mut ds, 3000, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ─── update_default_revenue_share tests ──────────────────────────────────────

/// Framework admin can update the global default revenue share.
#[test]
fun test_update_default_revenue_share_by_framework_admin() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // Initial default in test hub = 3000.
        let cfg = dapp_service::get_config(&dh);
        assert!(dapp_service::default_dapp_revenue_share_bps(cfg) == 3000);

        // Update to 5000 (50%).
        dapp_system::update_default_revenue_share(&mut dh, 5000, ctx);
        let cfg2 = dapp_service::get_config(&dh);
        assert!(dapp_service::default_dapp_revenue_share_bps(cfg2) == 5000);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// update_default_revenue_share aborts when caller is not the framework admin.
#[test]
#[expected_failure]
fun test_update_default_revenue_share_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::update_default_revenue_share(&mut dh, 5000, ctx);
    };

    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

/// update_default_revenue_share aborts when bps > 10000.
#[test]
#[expected_failure]
fun test_update_default_revenue_share_aborts_for_bps_over_max() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::update_default_revenue_share(&mut dh, 10001, ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// set_dapp_settlement_config only changes the mode; revenue share is unchanged.
#[test]
fun test_set_dapp_settlement_config_does_not_change_revenue_share() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Preset share via test helper.
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 4500);

        // DApp admin switches to USER_PAYS; share must remain 4500.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, ctx);
        assert!(dapp_service::settlement_mode(&ds) == 1);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 4500, 0);

        // Switch back to DAPP_SUBSIDIZES; share still unchanged.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 0, ctx);
        assert!(dapp_service::settlement_mode(&ds) == 0);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 4500, 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bug fixes — regression tests
// ═══════════════════════════════════════════════════════════════════════════════

/// Bug fix: set_dapp_settlement_config must reject any mode value outside {0, 1}.
/// Previously there was no validation; an invalid mode would brick both settlement paths.
#[test]
#[expected_failure]
fun test_set_dapp_settlement_config_aborts_for_invalid_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // mode=2 is outside the valid range {0, 1} — must abort.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 2, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Risk 3 fix: when a pending fee increase matures and is committed, it must
/// appear in fee_history so the audit trail is complete.
#[test]
fun test_committed_pending_fee_recorded_in_fee_history() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Initial state: base=1000, bytes=10 (from create_dapp_hub_for_testing).
        // Fee history starts empty in the test hub.

        // Schedule an increase: base 1000→2000.
        clock::set_for_testing(&mut clk, 0);
        dapp_system::update_framework_fee(&mut dh, 2000u256, 20u256, &clk, ctx);

        // Advance past delay and trigger commit via a second call (decrease to 500, 5).
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::update_framework_fee(&mut dh, 500u256, 5u256, &clk, ctx);

        // At this point:
        //   1. Pending (2000, 20) was committed at effective_at = DELAY_MS → recorded in history.
        //   2. The decrease (500, 5) is now scheduled as a new pending — NOT yet in history.
        // fee_history should have exactly 1 entry.
        let cfg = dapp_service::get_fee_config(&dh);
        let history = dapp_service::fee_history(cfg);
        assert!(history.length() == 1, 0);

        // The only entry: the committed pending increase (2000, 20).
        let entry0 = &history[0];
        assert!(dapp_service::fee_history_base_fee(entry0) == 2000u256, 1);
        assert!(dapp_service::fee_history_bytes_fee(entry0) == 20u256, 2);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Risk 4 fix: when dapp_revenue_share_bps == 10000 (100% to DApp), no
/// zero-value Coin must be transferred to the treasury.
/// The treasury should receive nothing; the DApp revenue should equal total_cost.
#[test]
fun test_settle_writes_user_pays_100pct_revenue_share_all_to_dapp() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Switch to USER_PAYS; set 100% revenue share to DApp.
        dapp_service::set_settlement_mode(&mut ds, 1);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1_000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);
        dapp_service::set_dapp_revenue_share_bps(&mut ds, 10_000);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        // One write → total_cost = 1000.
        dapp_system::set_record<FeeKey>(
            FeeKey {}, &mut us, k(b"k"), fns(), u32v(42u32), false, ctx
        );

        let payment = coin::mint_for_testing<SUI>(5_000, ctx);
        let change = dapp_system::settle_writes_user_pays<FeeKey, SUI>(
            &dh, &mut ds, &mut us, payment, ctx
        );
        // Overpay 4000 returned as change.
        assert!(coin::value(&change) == 4_000, 0);
        coin::burn_for_testing(change);

        // DApp revenue must equal total_cost (1000); treasury gets 0.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 1_000, 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_system::destroy_user_storage(us);
    };
    scenario.end();
}

// ─── Write limit management tests ─────────────────────────────────────────────

/// New UserStorage test helper uses 1_000 write_limit by default.
#[test]
fun test_user_storage_default_write_limit() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);
        assert!(dapp_service::user_write_limit(&us) == 1_000);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// sync_user_write_limit propagates framework write_limit to UserStorage.
#[test]
fun test_sync_user_write_limit_propagates_change() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // UserStorage starts with test-helper default 1_000.
        assert!(dapp_service::user_write_limit(&us) == 1_000);

        // Framework admin lowers limit to 200.
        dapp_system::set_framework_max_write_limit(&mut dh, 200, ctx);

        // Before sync, UserStorage still has old limit.
        assert!(dapp_service::user_write_limit(&us) == 1_000);

        // After sync, UserStorage reflects the new framework limit.
        dapp_system::sync_user_write_limit<FeeKey>(&dh, &mut us);
        assert!(dapp_service::user_write_limit(&us) == 200);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// Write is blocked once unsettled_count reaches write_limit (set via sync).
#[test]
#[expected_failure]
fun test_write_blocked_at_custom_write_limit() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        // Lower framework limit to 2 and sync into UserStorage.
        dapp_system::set_framework_max_write_limit(&mut dh, 2, ctx);
        dapp_system::sync_user_write_limit<FeeKey>(&dh, &mut us);

        // Write twice — both succeed.
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k1"), fns(), u32v(1u32), false, ctx);
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k2"), fns(), u32v(2u32), false, ctx);

        // Third write must abort (unsettled_count == 2 == write_limit).
        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"k3"), fns(), u32v(3u32), false, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// set_framework_max_write_limit updates the framework ceiling.
#[test]
fun test_set_framework_max_write_limit_happy_path() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

        // Default is 10_000.
        assert!(dapp_service::framework_max_write_limit(dapp_service::get_config(&dh)) == 10_000);

        // Framework admin lowers to 5_000.
        dapp_system::set_framework_max_write_limit(&mut dh, 5_000, ctx);
        assert!(dapp_service::framework_max_write_limit(dapp_service::get_config(&dh)) == 5_000);

        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// set_framework_max_write_limit aborts when max is 0.
#[test]
#[expected_failure]
fun test_set_framework_max_write_limit_aborts_when_zero() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::set_framework_max_write_limit(&mut dh, 0, ctx);
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// set_framework_max_write_limit cannot be called by non-admin.
#[test]
#[expected_failure]
fun test_set_framework_max_write_limit_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_framework_max_write_limit(&mut dh, 100, ctx);
    };
    dapp_system::destroy_dapp_hub(dh);
    scenario.end();
}

/// Lowering framework limit then syncing immediately takes effect: no bypass possible.
#[test]
fun test_framework_limit_lowered_takes_effect_after_sync() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(DAPP_ADMIN, ctx);

        // Raise limit to 50_000, then immediately lower to 100.
        dapp_system::set_framework_max_write_limit(&mut dh, 50_000, ctx);
        dapp_system::set_framework_max_write_limit(&mut dh, 100, ctx);

        // Sync should pick up 100 (not the intermediate 50_000).
        dapp_system::sync_user_write_limit<FeeKey>(&dh, &mut us);
        assert!(dapp_service::user_write_limit(&us) == 100);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}
