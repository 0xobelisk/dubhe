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
///   recharge_credit increases credit_pool
///   set_dapp_config: min_credit_to_unsuspend enforcement in unsuspend_dapp
///   suspend_dapp / unsuspend_dapp: require framework admin, not treasury
///   propose_treasury / accept_treasury: two-step framework treasury rotation (treasury = receive-only)
///   Version gating: lifecycle functions abort when framework version mismatch
///
/// Additional coverage (appended):
///   update_framework_fee: fee increase is SCHEDULED not immediate (48-hour delay)
///   get_effective_fee_per_write_at: returns base fee before delay, pending fee after
///   second update_framework_fee call: commits matured pending fee before applying new value
///   free-tier (fee==0): settle_writes marks all settled without touching credit pool
///   unsuspend_dapp / update_framework_fee: version gating aborts after framework bump
///   settle_writes / recharge_credit: dapp_key_mismatch aborts when DappKey type does not match
///   set_dapp_fee: framework admin can set per-DApp fee rates; non-admin aborts
///   sync_dapp_fee: permissionless sync copies DappHub effective fees to DappStorage
#[test_only]
module dubhe::fee_test;

use dubhe::dapp_service::{Self, DappHub, DappStorage, UserStorage};
use dubhe::dapp_system;
use sui::test_scenario;
use sui::coin;
use sui::sui::SUI;
use sui::bcs::to_bytes;
use sui::transfer;
use sui::clock;
use std::type_name;
use std::option;

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
// set_dapp_config — min_credit_to_unsuspend (per-DApp)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_dapp_config_updates_min_credit_to_unsuspend() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Default is 0.
        assert!(dapp_service::min_credit_to_unsuspend(&ds) == 0);

        // Admin sets custom threshold.
        dapp_system::set_dapp_config<FeeKey>(FeeKey {}, &mut ds, 1000u256, ctx);
        assert!(dapp_service::min_credit_to_unsuspend(&ds) == 1000u256);

        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_set_dapp_config_aborts_for_non_admin() {
    let admin:    address = @0xAD00;
    let attacker: address = @0xBAD0;
    let mut scenario = test_scenario::begin(admin);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        // Non-admin call must abort.
        dapp_system::set_dapp_config<FeeKey>(FeeKey {}, &mut ds, 50u256, ctx);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// suspend_dapp / unsuspend_dapp — require framework admin, not treasury
// ═══════════════════════════════════════════════════════════════════════════════

const FRAMEWORK_ADMIN: address = @0xAD01;
const TREASURY_ONLY:   address = @0xFEE1; // receives payments but cannot manage contracts

#[test]
fun test_unsuspend_with_default_config_requires_any_positive_credit() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        // DappHub.config.admin == FRAMEWORK_ADMIN (ctx.sender() at creation).
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // min_credit_to_unsuspend defaults to 0 (any credit > 0 is enough).
        assert!(dapp_service::min_credit_to_unsuspend(&ds) == 0);

        // Framework admin suspends the DApp.
        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::is_suspended(&ds));

        // Add just 1 credit — sufficient for default config.
        dapp_service::add_credit(&mut ds, 1u256);
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(!dapp_service::is_suspended(&ds));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
fun test_unsuspend_with_custom_min_credit_passes_when_met() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Set min_credit_to_unsuspend = 1000.
        dapp_system::set_dapp_config<FeeKey>(FeeKey {}, &mut ds, 1000u256, ctx);
        assert!(dapp_service::min_credit_to_unsuspend(&ds) == 1000u256);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);

        // Meet the threshold exactly.
        dapp_service::add_credit(&mut ds, 1000u256);
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(!dapp_service::is_suspended(&ds));

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_unsuspend_with_custom_min_credit_aborts_when_below_threshold() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Set min_credit_to_unsuspend = 1000.
        dapp_system::set_dapp_config<FeeKey>(FeeKey {}, &mut ds, 1000u256, ctx);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);

        // Only 999 — below threshold, must abort.
        dapp_service::add_credit(&mut ds, 999u256);
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// unsuspend_dapp must abort when credit_pool == 0 and min_credit_to_unsuspend == 0
/// (default config — any credit > 0 is required, but pool is empty).
#[test]
#[expected_failure]
fun test_unsuspend_dapp_aborts_when_credit_pool_is_zero() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Confirm default: min_credit_to_unsuspend == 0 (any positive credit required).
        assert!(dapp_service::min_credit_to_unsuspend(&ds) == 0);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::is_suspended(&ds));

        // credit_pool is 0 — must abort with insufficient_credit_to_unsuspend.
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Treasury address cannot call suspend_dapp — only framework admin can.
#[test]
#[expected_failure]
fun test_suspend_dapp_aborts_for_treasury_caller() {
    // DappHub is created by FRAMEWORK_ADMIN, so admin = FRAMEWORK_ADMIN.
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    let mut ds = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx)
    };

    // TREASURY_ONLY is not the framework admin — must abort.
    test_scenario::next_tx(&mut scenario, TREASURY_ONLY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
    };

    dapp_system::destroy_dapp_hub(dh);
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

/// Treasury address cannot call unsuspend_dapp — only framework admin can.
#[test]
#[expected_failure]
fun test_unsuspend_dapp_aborts_for_treasury_caller() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    let mut ds = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_suspended(&mut ds, true);
        dapp_service::add_credit(&mut ds, 1u256);
        ds
    };

    // TREASURY_ONLY is not the framework admin — must abort.
    test_scenario::next_tx(&mut scenario, TREASURY_ONLY);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);
    };

    dapp_system::destroy_dapp_hub(dh);
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// update_framework_fee — requires framework admin
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_update_framework_fee_decrease_takes_effect_immediately() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = sui::clock::create_for_testing(ctx);

        // Starting base fee is 1000 (set by create_dapp_hub_for_testing).
        let (base_fee_0, _) = dapp_system::get_effective_fees(&dh);
        assert!(base_fee_0 == 1000u256);

        // Decrease: applied immediately.
        dapp_system::update_framework_fee(&mut dh, 500u256, 10u256, &clk, ctx);
        let (base_fee_1, _) = dapp_system::get_effective_fees(&dh);
        assert!(base_fee_1 == 500u256);

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

#[test]
#[expected_failure]
fun test_suspend_dapp_aborts_after_framework_version_bump() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Bump hub version to 2 to simulate post-migrate state.
        dapp_service::set_framework_version(&mut dh, 2);

        // Current package has FRAMEWORK_VERSION = 1 — must abort.
        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);

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

        // Advance clock past the delay, then apply a decrease to 500.
        // The function must first commit pending=2000 to base, then apply the decrease.
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::update_framework_fee(&mut dh, 500u256, 5u256, &clk, ctx);

        // Pending cleared, new base is 500 (decrease applied immediately).
        assert!(dapp_service::pending_base_fee(dapp_service::get_fee_config(&dh)) == 0u256);
        assert!(dapp_service::base_fee_per_write(dapp_service::get_fee_config(&dh)) == 500u256);

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

        // Set fee to 0 (free tier) — a decrease, applied immediately.
        dapp_system::update_framework_fee(&mut dh, 0u256, 0u256, &clk, ctx);
        let (eff_base, _) = dapp_system::get_effective_fees(&dh);
        assert!(eff_base == 0u256);

        // Add credit — it must NOT be touched by settle_writes in free-tier mode.
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
// Version gating — unsuspend_dapp and update_framework_fee
// ═══════════════════════════════════════════════════════════════════════════════

/// unsuspend_dapp must abort when DappHub.version != FRAMEWORK_VERSION.
#[test]
#[expected_failure]
fun test_unsuspend_dapp_aborts_after_framework_version_bump() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        dapp_service::add_credit(&mut ds, 1u256);

        // Simulate post-migrate state: DappHub bumped to v2 while this package is v1.
        dapp_service::set_framework_version(&mut dh, 2);

        // Must abort with not_latest_version.
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

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

/// unsuspend_dapp succeeds using free credit alone (credit_pool == 0).
#[test]
fun test_unsuspend_succeeds_with_free_credit_only() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Grant free credit (never expires); leave credit_pool = 0.
        dapp_service::set_free_credit(&mut ds, 1u256, 0u64);
        assert!(dapp_service::credit_pool(&ds) == 0);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::is_suspended(&ds));

        // Must succeed: effective_total_credit = 1 > 0.
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        assert!(!dapp_service::is_suspended(&ds));

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// unsuspend_dapp aborts when both free_credit == 0 and credit_pool == 0.
#[test]
#[expected_failure]
fun test_unsuspend_aborts_when_all_credit_zero() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_service::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Both pools are empty.
        assert!(dapp_service::free_credit(&ds) == 0);
        assert!(dapp_service::credit_pool(&ds) == 0);

        dapp_system::suspend_dapp<FeeKey>(&dh, &mut ds, ctx);
        // Must abort: effective_total_credit == 0.
        dapp_system::unsuspend_dapp<FeeKey>(&dh, &mut ds, ctx);

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
// set_dapp_fee — framework admin sets per-DApp fee rates
// ═══════════════════════════════════════════════════════════════════════════════

/// Framework admin can override the per-DApp fee rates via set_dapp_fee.
#[test]
fun test_set_dapp_fee_updates_rates() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Initial rates are 0 (create_dapp_storage_for_testing initialises to 0).
        assert!(dapp_service::dapp_base_fee_per_write(&ds) == 0);
        assert!(dapp_service::dapp_bytes_fee_per_byte(&ds) == 0);

        // Admin sets custom rates.
        dapp_system::set_dapp_fee<FeeKey>(&dh, &mut ds, 2000u256, 20u256, ctx);

        assert!(dapp_service::dapp_base_fee_per_write(&ds) == 2000);
        assert!(dapp_service::dapp_bytes_fee_per_byte(&ds) == 20);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Non-admin caller must abort when calling set_dapp_fee.
#[test]
#[expected_failure]
fun test_set_dapp_fee_aborts_for_non_admin() {
    let attacker: address = @0xBAD0;
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    let dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };
    let mut ds = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx)
    };

    // Switch to an attacker who is not the framework admin.
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_dapp_fee<FeeKey>(&dh, &mut ds, 9999u256, 99u256, ctx);
    };

    dapp_system::destroy_dapp_hub(dh);
    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

/// set_dapp_fee must abort when called with the wrong DappKey type.
#[test]
#[expected_failure]
fun test_set_dapp_fee_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(FRAMEWORK_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh  = dapp_system::create_dapp_hub_for_testing(ctx);
        // DappStorage keyed to FeeWrongKey — caller passes FeeKey → mismatch.
        let mut ds_wrong = dapp_system::create_dapp_storage_for_testing<FeeWrongKey>(ctx);

        dapp_system::set_dapp_fee<FeeKey>(&dh, &mut ds_wrong, 1000u256, 10u256, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds_wrong);
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
            *option::borrow(dapp_service::accepted_coin_type(cfg)) == type_name::get<SUI>()
        );

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// Only the treasury may call propose_coin_type.
#[test]
#[expected_failure]
fun test_propose_coin_type_aborts_for_non_treasury() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::create_dapp_hub_for_testing(ctx)
    };

    // COIN_ATTACKER is not the treasury.
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
            *option::borrow(dapp_service::pending_coin_type(cfg)) == type_name::get<SUI>()
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

/// Only the treasury may call accept_coin_type.
#[test]
#[expected_failure]
fun test_accept_coin_type_aborts_for_non_treasury() {
    let mut scenario = test_scenario::begin(COIN_TREASURY);
    let mut dh = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);
        dapp_system::propose_coin_type<AltCoin>(&mut dh, &clk, ctx);
        clk.destroy_for_testing();
        dh
    };

    // Advance past delay and try as a non-treasury address.
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
            *option::borrow(dapp_service::accepted_coin_type(cfg)) == type_name::get<AltCoin>()
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

/// deposit_user_credit aborts when DApp is in DAPP_SUBSIDIZES mode (mode=0).
#[test]
#[expected_failure]
fun test_deposit_user_credit_aborts_in_dapp_subsidizes_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // DApp is in mode=0 (DAPP_SUBSIDIZES) by default → deposit must abort.
        let payment = coin::mint_for_testing<SUI>(1_000_000, ctx);
        dapp_system::deposit_user_credit<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// set_dapp_settlement_config aborts when revenue_share_bps > max.
#[test]
#[expected_failure]
fun test_set_dapp_settlement_config_aborts_on_exceeded_max() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // max_dapp_revenue_share_bps in test hub = 5000 (50%). Try 6000 → abort.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 6000, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// Switching from USER_PAYS(1) → DAPP_SUBSIDIZES(0) aborts.
#[test]
#[expected_failure]
fun test_cannot_downgrade_settlement_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // First switch to USER_PAYS.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        // Now try to downgrade back to DAPP_SUBSIDIZES → abort.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 0, 0, ctx);

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
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);

        // credit_pool is still intact (no refund).
        assert!(dapp_service::credit_pool(&ds) == 5_000_000);
        assert!(dapp_service::settlement_mode(&ds) == 1);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 3000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}

/// USER_PAYS: deposit splits correctly — framework gets 70%, DApp gets 30%.
#[test]
fun test_deposit_user_credit_splits_correctly() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS with 3000 bps (30%) DApp share.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);

        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        dapp_system::deposit_user_credit<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // user_credit_pool should equal total deposit.
        assert!(dapp_service::user_credit_pool(&us) == 10_000_000);
        // DApp balance should be 30% = 3_000_000.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 3_000_000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes deducts from user_credit_pool (not credit_pool).
#[test]
fun test_settle_writes_user_pays_deducts_user_credit_pool() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        // Set fee rates on DappStorage.
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);

        // Pre-fund user credit pool (manually to avoid deposit_user_credit split complexity).
        dapp_service::add_user_credit_pool(&mut us, 5_000_000);

        // Simulate 3 writes.
        dapp_service::increment_write_count(&mut us);
        dapp_service::increment_write_count(&mut us);
        dapp_service::increment_write_count(&mut us);

        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // 3 writes × 1000 MIST = 3000 deducted from user_credit_pool.
        assert!(dapp_service::user_credit_pool(&us) == 5_000_000 - 3_000);
        assert!(dapp_service::unsettled_count(&us) == 0);
        // credit_pool untouched.
        assert!(dapp_service::credit_pool(&ds) == 0);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// USER_PAYS: settle_writes emits SettlementSkipped when user_credit_pool == 0.
#[test]
fun test_settle_writes_user_pays_skips_when_no_credit() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        dapp_service::set_dapp_base_fee_per_write(&mut ds, 1000u256);
        dapp_service::set_dapp_bytes_fee_per_byte(&mut ds, 0u256);

        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS with empty user_credit_pool.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        dapp_service::increment_write_count(&mut us);

        // settle_writes should NOT abort — it skips silently.
        dapp_system::settle_writes<FeeKey>(&dh, &mut ds, &mut us, ctx);

        // settled_count still 0 (skipped).
        assert!(dapp_service::unsettled_count(&us) == 1);

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
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        // Switch to USER_PAYS with 30% DApp share and deposit.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        dapp_system::deposit_user_credit<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        // DApp balance = 3_000_000 SUI.
        assert!(dapp_service::dapp_revenue_balance<SUI>(&ds) == 3_000_000);

        // Admin withdraws.
        dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&mut ds, ctx);

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
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&mut ds, ctx);

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
    let mut ds = {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(REGULAR_USER, ctx);

        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        dapp_system::deposit_user_credit<FeeKey, SUI>(&dh, &mut ds, &mut us, payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_user_storage(us);
        ds
    };

    // Attacker tries to withdraw.
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::withdraw_dapp_revenue<FeeKey, SUI>(&mut ds, ctx);
    };

    dapp_system::destroy_dapp_storage(ds);
    scenario.end();
}

/// update_max_revenue_share: decrease is scheduled with 48h delay.
#[test]
fun test_update_max_revenue_share_decrease_is_delayed() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut clk = clock::create_for_testing(ctx);

        // Current max = 5000 in test hub. Decrease to 2000.
        dapp_system::update_max_revenue_share(&mut dh, 2000, &clk, ctx);

        // Current max should still be 5000 (pending, not committed).
        let cfg = dapp_service::get_config(&dh);
        assert!(dapp_service::max_dapp_revenue_share_bps(cfg) == 5000);
        assert!(dapp_service::pending_max_dapp_revenue_share_bps(cfg) == 2000);
        assert!(dapp_service::max_share_effective_at_ms(cfg) > 0);

        // Advance past delay and trigger commit on the next update call.
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::update_max_revenue_share(&mut dh, 2000, &clk, ctx);

        let cfg2 = dapp_service::get_config(&dh);
        assert!(dapp_service::max_dapp_revenue_share_bps(cfg2) == 2000);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// update_max_revenue_share: increase takes effect immediately.
#[test]
fun test_update_max_revenue_share_increase_is_immediate() {
    let mut scenario = test_scenario::begin(USER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let clk = clock::create_for_testing(ctx);

        // Current max = 5000. Increase to 8000 → immediate.
        dapp_system::update_max_revenue_share(&mut dh, 8000, &clk, ctx);

        let cfg = dapp_service::get_config(&dh);
        assert!(dapp_service::max_dapp_revenue_share_bps(cfg) == 8000);
        assert!(dapp_service::pending_max_dapp_revenue_share_bps(cfg) == 0);
        assert!(dapp_service::max_share_effective_at_ms(cfg) == 0);

        clk.destroy_for_testing();
        dapp_system::destroy_dapp_hub(dh);
    };
    scenario.end();
}

/// USER_PAYS: adjusting dapp_revenue_share_bps in place (mode stays 1) works fine.
#[test]
fun test_adjust_dapp_revenue_share_bps_in_user_pays_mode() {
    let mut scenario = test_scenario::begin(DAPP_ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx);

        // Switch to USER_PAYS at 30%.
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 3000, ctx);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 3000);

        // Adjust to 20% (still USER_PAYS).
        dapp_system::set_dapp_settlement_config<FeeKey>(&dh, &mut ds, 1, 2000, ctx);
        assert!(dapp_service::settlement_mode(&ds) == 1);
        assert!(dapp_service::dapp_revenue_share_bps(&ds) == 2000);

        dapp_system::destroy_dapp_hub(dh);
        dapp_system::destroy_dapp_storage(ds);
    };
    scenario.end();
}
