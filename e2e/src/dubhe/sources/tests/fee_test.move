/// Unit tests — Fee collection and lazy settlement
///
/// Covers the write_count / settled_count model (lazy settlement):
///   write_count tracking: set_record increments, offchain/delete do not
///   set_field increments write_count
///   max_unsettled_writes guard (compile-time constant MAX_UNSETTLED_WRITES)
///   settle_writes full settlement (all unsettled writes charged)
///   settle_writes skip when credit_pool == 0
///   settle_writes partial settlement (limited by available credits)
///   settle_writes is a no-op when write_count already settled
///   recharge_credit increases credit_pool
///   set_dapp_config: min_credit_to_unsuspend enforcement in unsuspend_dapp
///   suspend_dapp / unsuspend_dapp: require framework admin, not treasury
///   unsuspend_dapp: aborts when credit_pool == 0 with default min (zero credit, any > 0 required)
///   update_framework_fee: requires framework admin, not treasury
///   propose_framework_admin / accept_framework_admin: two-step admin rotation
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
    (
        dapp_system::create_dapp_hub_for_testing(ctx),
        dapp_system::create_dapp_storage_for_testing<FeeKey>(ctx),
    )
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
fun test_offchain_record_does_not_increment_write_count() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        dapp_system::set_record<FeeKey>(FeeKey {}, &mut us, k(b"x"), fns(), u32v(7), true, ctx);
        assert!(dapp_service::write_count(&us) == 0);

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
// max_unsettled_writes guard (compile-time constant MAX_UNSETTLED_WRITES)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_set_record_aborts_at_max_unsettled_writes() {
    let mut scenario = test_scenario::begin(USER);
    {
        let (dh, ds) = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us(ctx);

        let max = dapp_system::max_unsettled_writes();
        let mut i = 0u64;
        while (i < max) {
            dapp_service::increment_write_count(&mut us);
            i = i + 1;
        };
        assert!(dapp_service::write_count(&us) == max);

        // This write must abort with user_debt_limit_exceeded_error.
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

        // Fill up to max.
        let max = dapp_system::max_unsettled_writes();
        let mut i = 0u64;
        while (i < max) {
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
        dapp_system::recharge_credit<FeeKey>(&dh, &mut ds, payment, ctx);

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
        dapp_system::recharge_credit<FeeKey>(&dh, &mut ds, p1, ctx);
        dapp_system::recharge_credit<FeeKey>(&dh, &mut ds, p2, ctx);

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

        // credit_pool is 0 — must abort with insufficient_credit_to_unsuspend_error.
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

        // Starting fee is 1000 (set by create_dapp_hub_for_testing).
        assert!(dapp_system::get_effective_fee_per_write(&dh) == 1000u256);

        // Decrease: applied immediately.
        dapp_system::update_framework_fee(&mut dh, 500u256, &clk, ctx);
        assert!(dapp_system::get_effective_fee_per_write(&dh) == 500u256);

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
        dapp_system::update_framework_fee(&mut dh, 0u256, &clk, ctx);
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

        // Fee per write is 1000 (set by create_dapp_hub_for_testing).
        // Fund enough for exactly 3 writes.
        let fee = dapp_system::get_effective_fee_per_write(&dh);
        dapp_service::add_credit(&mut ds, fee * 3);

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
        dapp_system::update_framework_fee(&mut dh, 2000u256, &clk, ctx);

        // Base fee is still 1000 — not yet committed.
        assert!(dapp_service::base_fee_per_write(dapp_service::get_fee_config(&dh)) == 1000u256);
        // Pending fee is set to 2000.
        assert!(dapp_service::pending_fee_per_write(dapp_service::get_fee_config(&dh)) == 2000u256);
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

        dapp_system::update_framework_fee(&mut dh, 2000u256, &clk, ctx);

        // Query at one millisecond before the delay expires → base fee returned.
        let effective = dapp_system::get_effective_fee_per_write_at(&dh, DELAY_MS - 1);
        assert!(effective == 1000u256);

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

        dapp_system::update_framework_fee(&mut dh, 2000u256, &clk, ctx);

        // Exactly at effective_at → pending fee returned.
        assert!(dapp_system::get_effective_fee_per_write_at(&dh, DELAY_MS) == 2000u256);
        // Well after effective_at → still pending fee.
        assert!(dapp_system::get_effective_fee_per_write_at(&dh, DELAY_MS + 1_000) == 2000u256);
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
        dapp_system::update_framework_fee(&mut dh, 2000u256, &clk, ctx);
        assert!(dapp_service::pending_fee_per_write(dapp_service::get_fee_config(&dh)) == 2000u256);

        // Advance clock past the delay, then apply a decrease to 500.
        // The function must first commit pending=2000 to base, then apply the decrease.
        clock::set_for_testing(&mut clk, DELAY_MS + 1);
        dapp_system::update_framework_fee(&mut dh, 500u256, &clk, ctx);

        // Pending cleared, new base is 500 (decrease applied immediately).
        assert!(dapp_service::pending_fee_per_write(dapp_service::get_fee_config(&dh)) == 0u256);
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
        dapp_system::update_framework_fee(&mut dh, 0u256, &clk, ctx);
        assert!(dapp_system::get_effective_fee_per_write(&dh) == 0u256);

        // Add credit — it must NOT be touched by settle_writes in free-tier mode.
        dapp_service::add_credit(&mut ds, 5_000u256);
        let mut us = dapp_service::create_user_storage_for_testing<FeeKey>(FRAMEWORK_ADMIN, ctx);

        let mut i = 0u64;
        while (i < 3) {
            dapp_system::set_record<FeeKey>(
                FeeKey {}, &dh, &mut us, k(b"k"), fns(), u32v(i as u32), false, ctx
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

        // Must abort with not_latest_version_error.
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

        // Must abort with not_latest_version_error.
        dapp_system::update_framework_fee(&mut dh, 500u256, &clk, ctx);

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
        dapp_system::recharge_credit<FeeKey>(&dh, &mut ds_wrong, payment, ctx);

        dapp_system::destroy_dapp_hub(dh);
        dapp_service::destroy_dapp_storage(ds_wrong);
    };
    scenario.end();
}
