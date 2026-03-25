/// Fee system unit tests for dapp_system.
///
/// Covers:
///   - Fee state initialization matches global fee config defaults
///   - set_record deducts correct fee from free_credit
///   - set_field deducts correct fee from free_credit
///   - delete_record charges no fee
///   - Fee stats (total_bytes_size, total_paid, total_set_count) accumulate
///   - free_credit is consumed before total_recharged
///   - total_recharged is used when free_credit is zero
///   - Partial free_credit is fully consumed before deducting from total_recharged (CVE-NEW-02)
///   - Abort on insufficient credit (both balances zero)
///   - Linear fee formula for count > 1 (Fix-09)
///   - recharge_credit requires Coin<SUI> payment (CVE-NEW-01)
///   - set_storage aborts immediately (Fix-08)
///   - Framework admin can grant/revoke free credits for DApps
///
/// Fix regression tests (confirm vulnerabilities are NOW CLOSED):
///   - create_dapp re-initialization is blocked by idempotency guard (Fix-01)
///   - dapp_service::set_record within-package bypass is expected behaviour
///     (dapp_service writes are package-internal and intentionally fee-free)
#[test_only]
module dubhe::dapp_fee_test;

use dubhe::dapp_service::{Self, DappHub};
use dubhe::dapp_system;
use dubhe::dapp_fee_state;
use dubhe::dapp_fee_config;
use dubhe::init_test;
use sui::test_scenario;
use sui::clock;
use std::ascii::string;
use sui::bcs::to_bytes;
use sui::coin;
use sui::sui::SUI;

// ─── Test DApp key ────────────────────────────────────────────────────────────

public struct FeeTestKey has copy, drop {}

fun new_fee_key(): FeeTestKey { FeeTestKey {} }

// ─── Default fee constants (must match deploy_hook::run) ─────────────────────

const FREE_CREDIT: u256 = 10_000_000_000;
const BASE_FEE: u256    = 80_000;
const BYTE_FEE: u256    = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

fun k(name: vector<u8>): vector<vector<u8>> { vector[name] }

fun v_u32(val: u32): vector<vector<u8>> { vector[to_bytes(&val)] }

/// fee = (key_bytes + value_bytes) * BYTE_FEE + BASE_FEE
fun fee(key_bytes: u256, value_bytes: u256): u256 {
    (key_bytes + value_bytes) * BYTE_FEE + BASE_FEE
}

/// Build a fully-initialised DappHub: genesis run + FeeTestKey DApp registered.
fun setup(scenario: &mut test_scenario::Scenario): DappHub {
    let mut dh = init_test::deploy_dapp_for_testing(scenario);
    let ctx = test_scenario::ctx(scenario);
    let clk = clock::create_for_testing(ctx);
    dapp_system::create_dapp<FeeTestKey>(
        &mut dh,
        new_fee_key(),
        string(b"Fee Test DApp"),
        string(b"DApp used in fee unit tests"),
        &clk,
        ctx
    );
    clock::destroy_for_testing(clk);
    dh
}

// ─── Initialization tests ─────────────────────────────────────────────────────

/// create_dapp copies the global fee config values into the DApp's fee state.
#[test]
public fun test_fee_state_initialized_with_global_defaults() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let dh = setup(&mut scenario);
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let state = dapp_fee_state::get_struct(&dh, dapp_key);

        assert!(state.free_credit()     == FREE_CREDIT, 0);
        assert!(state.base_fee()        == BASE_FEE,    1);
        assert!(state.byte_fee()        == BYTE_FEE,    2);
        assert!(state.total_recharged() == 0,           3);
        assert!(state.total_paid()      == 0,           4);
        assert!(state.total_bytes_size()== 0,           5);
        assert!(state.total_set_count() == 0,           6);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── Fee deduction tests ──────────────────────────────────────────────────────

/// set_record deducts exactly (key_bytes + value_bytes) * byte_fee + base_fee.
#[test]
public fun test_set_record_deducts_correct_fee_from_free_credit() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // key = b"hp" (2 bytes), value = to_bytes(&100u32) (4 bytes) -> B = 6
        // fee = 6 * 500 + 80_000 = 83_000
        let expected_fee = fee(2, 4);  // 83_000
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"hp"), v_u32(100), res, false, ctx
        );

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let state = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state.free_credit() == FREE_CREDIT - expected_fee, 0);
        assert!(state.total_paid()  == expected_fee,               1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// set_field deducts the same formula: key bytes + value bytes.
/// Internally charge_fee receives vector[value], so the math is identical.
#[test]
public fun test_set_field_deducts_correct_fee() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // Create the parent record first so set_field has something to update.
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"score"), v_u32(0), res, false, ctx
        );

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let credit_after_set_record =
            dapp_fee_state::get_struct(&dh, dapp_key).free_credit();

        // key = b"score" (5 bytes), value = to_bytes(&99u32) (4 bytes) -> B = 9
        // fee = 9 * 500 + 80_000 = 84_500
        let expected_fee = fee(5, 4);  // 84_500
        dapp_system::set_field<FeeTestKey>(
            &mut dh, new_fee_key(), res, k(b"score"), 0, to_bytes(&99u32), ctx
        );

        let state = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state.free_credit() == credit_after_set_record - expected_fee, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// delete_record must not charge any fee.
#[test]
public fun test_delete_record_charges_no_fee() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"tmp"), v_u32(1), res, false, ctx
        );

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let credit_after_write =
            dapp_fee_state::get_struct(&dh, dapp_key).free_credit();

        dapp_system::delete_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"tmp"), res
        );

        let state = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state.free_credit() == credit_after_write, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── Statistics accumulation ──────────────────────────────────────────────────

/// total_bytes_size, total_paid, and total_set_count accumulate across writes.
#[test]
public fun test_fee_stats_accumulate_across_multiple_writes() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // Write 1: key = b"a"  (1 byte), value = to_bytes(&1u8) (1 byte) -> B=2, fee=81_000
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"a"), vector[to_bytes(&1u8)], res, false, ctx
        );
        // Write 2: key = b"bb" (2 bytes), value = to_bytes(&2u8) (1 byte) -> B=3, fee=81_500
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"bb"), vector[to_bytes(&2u8)], res, false, ctx
        );

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let state = dapp_fee_state::get_struct(&dh, dapp_key);

        let expected_bytes = 2 + 3;                // B1 + B2
        let expected_paid  = 81_000 + 81_500;      // fee1 + fee2
        assert!(state.total_bytes_size() == expected_bytes, 0);
        assert!(state.total_paid()       == expected_paid,  1);
        assert!(state.total_set_count()  == 2,              2);
        assert!(state.free_credit()      == FREE_CREDIT - (expected_paid as u256), 3);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── Credit priority tests ────────────────────────────────────────────────────

/// free_credit is consumed first; total_recharged is untouched while credits remain.
#[test]
public fun test_free_credit_consumed_before_recharged() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // Give some recharged balance.
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_total_recharged(5_000_000);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), v_u32(0), res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        // free_credit decreased; recharged is unchanged because free_credit was sufficient.
        assert!(state2.free_credit()     < FREE_CREDIT, 0);
        assert!(state2.total_recharged() == 5_000_000,  1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// When free_credit is zero, total_recharged is used to pay fees.
#[test]
public fun test_recharged_credit_used_when_free_credit_exhausted() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(0);
        state.update_total_recharged(1_000_000);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        // key = b"x" (1 byte), value = to_bytes(&0u8) (1 byte) -> B=2, fee=81_000
        let expected_fee = fee(1, 1); // 81_000
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state2.free_credit()     == 0,                          0);
        assert!(state2.total_recharged() == 1_000_000 - expected_fee,   1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// set_record aborts when both free_credit and total_recharged are zero.
#[test]
#[expected_failure]
public fun test_set_record_aborts_on_zero_credit() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(0);       // no free credit
        // total_recharged stays 0 (default)
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        // Must abort with INSUFFICIENT_CREDIT.
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"fail"), v_u32(0), res, false, ctx
        );

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── FIX REGRESSION TESTS ────────────────────────────────────────────────────

/// FIX-02: deploy_hook::run is idempotent — a second call must not reset the
/// global fee config (or overwrite the framework admin address).
#[test]
public fun test_fix02_deploy_hook_run_is_idempotent() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        // setup() calls genesis::run once internally via deploy_dapp_for_testing.
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Record the framework admin address written at genesis.
        let admin_after_first_run = dapp_fee_config::get_admin(&dh);

        // Manually invoke genesis::run a second time; deploy_hook must not reset
        // the fee config (idempotency guard) so the admin address must remain unchanged.
        let clk = clock::create_for_testing(ctx);
        dubhe::genesis::run(&mut dh, &clk, ctx);
        clock::destroy_for_testing(clk);

        // Admin must be unchanged after a redundant genesis call.
        let admin_after_second_run = dapp_fee_config::get_admin(&dh);
        assert!(admin_after_second_run == admin_after_first_run, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Verify that the genesis deployer address is correctly recorded as the
/// framework admin in dapp_metadata after genesis::run.
#[test]
public fun test_framework_admin_address_recorded_at_genesis() {
    let deployer = @0xFEE;
    let mut scenario = test_scenario::begin(deployer);
    {
        // deploy_dapp_for_testing calls genesis::run with ctx.sender() = @0xFEE.
        // The deployer address must be recorded as the framework admin in dapp_fee_config.
        let dh = init_test::deploy_dapp_for_testing(&mut scenario);
        let recorded_admin = dapp_fee_config::get_admin(&dh);
        assert!(recorded_admin == deployer, 0);
        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// FIX-01: create_dapp now aborts when the DApp is already registered.
/// Before the fix, a second call silently reset free_credit and metadata.
#[test]
#[expected_failure]
public fun test_fix01_create_dapp_reinit_is_blocked() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);  // registers FeeTestKey
        let ctx = test_scenario::ctx(&mut scenario);

        // Second call must abort with DAPP_ALREADY_INITIALIZED.
        let clk = clock::create_for_testing(ctx);
        dapp_system::create_dapp<FeeTestKey>(
            &mut dh,
            new_fee_key(),
            string(b"Fee Test DApp"),
            string(b"DApp used in fee unit tests"),
            &clk,
            ctx
        );
        clock::destroy_for_testing(clk);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// CVE-NEW-01 (Fix): recharge_credit now requires a Coin<SUI> payment.
/// The payment is transferred to the framework admin; credits added at 1 MIST = 1 credit.
#[test]
public fun test_cve_new01_recharge_credit_requires_sui_payment() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let recharged_before =
            dapp_fee_state::get_struct(&dh, dapp_key).total_recharged();

        // 5_000_000 MIST → 5_000_000 credits.
        let payment = coin::mint_for_testing<SUI>(5_000_000, ctx);
        dapp_system::recharge_credit(&mut dh, FeeTestKey {}, payment, ctx);

        let recharged_after =
            dapp_fee_state::get_struct(&dh, dapp_key).total_recharged();
        // Credits increased exactly by the MIST amount paid.
        assert!(recharged_after == recharged_before + 5_000_000, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// CVE-NEW-01: after SUI recharge, a credit-exhausted DApp can write again.
#[test]
public fun test_cve_new01_write_succeeds_after_sui_recharge() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // Zero out both credit pools.
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(0);
        state.update_total_recharged(0);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        // Top up via SUI payment (10_000_000 MIST = 10_000_000 credits).
        let payment = coin::mint_for_testing<SUI>(10_000_000, ctx);
        dapp_system::recharge_credit(&mut dh, FeeTestKey {}, payment, ctx);

        // Write should now succeed (deducts from total_recharged).
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"y"), v_u32(7), res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state2.total_recharged() < 10_000_000, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// FIX-08: set_storage now aborts instead of silently doing nothing.
#[test]
#[expected_failure]
public fun test_fix08_set_storage_aborts() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dapp_system::set_storage<FeeTestKey>(
            &mut dh,
            string(b"some_table"),
            k(b"key"),
            v_u32(0),
            1,
            ctx
        );

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// FIX-09: fee formula is now linear: (B * byte_fee + base_fee) * count.
/// Previously it was quadratic: (B * count * byte_fee + base_fee) * count.
/// Verification: fee(count=2) must equal exactly 2 * fee(count=1).
#[test]
public fun test_fix09_fee_formula_is_linear_for_count_gt_1() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let dh = setup(&mut scenario);
        let dapp_key_str = dapp_system::dapp_key<FeeTestKey>();

        // key = b"k" (1 byte), value = to_bytes(&0u8) (1 byte) -> B = 2
        // Linear: fee(count=1) = 2*500 + 80_000 = 81_000
        //         fee(count=2) = 81_000 * 2     = 162_000
        // Old quadratic count=2: (2*2*500 + 80_000)*2 = 164_000
        let key_bytes   = k(b"k");
        let value_bytes = vector[to_bytes(&0u8)];

        let (_, fee_count1) = dapp_system::calculate_bytes_size_and_fee(
            &dh, dapp_key_str, key_bytes, value_bytes, 1
        );
        let (_, fee_count2) = dapp_system::calculate_bytes_size_and_fee(
            &dh, dapp_key_str, key_bytes, value_bytes, 2
        );

        assert!(fee_count2 == fee_count1 * 2, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// NOTE: dapp_service::set_record is public(package) — within-package writes
/// intentionally bypass fee charging (used by framework-internal code such as
/// dapp_fee_config, dapp_fee_state, dapp_metadata writes).
/// External DApp packages cannot call dapp_service::set_record directly.
#[test]
public fun test_within_package_dapp_service_write_is_fee_free_by_design() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let credit_before =
            dapp_fee_state::get_struct(&dh, dapp_key).free_credit();

        dapp_service::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"internal"), v_u32(1), res, false, ctx
        );

        let credit_after =
            dapp_fee_state::get_struct(&dh, dapp_key).free_credit();
        // Credit is unchanged — this is intentional for framework-internal writes.
        assert!(credit_after == credit_before, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── CVE-NEW-02: partial free_credit + recharged ──────────────────────────────

/// CVE-NEW-02 (Fix): when free_credit < fee, all remaining free_credit is consumed
/// first, and only the remainder is deducted from total_recharged.
/// Previously the entire fee was charged from total_recharged, wasting free_credit.
#[test]
public fun test_cve_new02_partial_free_credit_consumed_before_recharged() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // key = b"x" (1 byte), value = to_bytes(&0u8) (1 byte) -> B=2, fee = 81_000
        let expected_fee = fee(1, 1); // 81_000

        // Set free_credit to half the fee so neither pool alone can cover it.
        // free_credit = 40_000  (<  81_000)
        // total_recharged = 100_000  (>= 81_000 - 40_000 = 41_000)
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(40_000);
        state.update_total_recharged(100_000);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        // free_credit must be fully consumed.
        assert!(state2.free_credit() == 0, 0);
        // total_recharged decreases by exactly (fee - original_free_credit).
        let expected_recharged = 100_000 - (expected_fee - 40_000);
        assert!(state2.total_recharged() == expected_recharged, 1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// CVE-NEW-02: abort when combined free_credit + total_recharged < fee.
#[test]
#[expected_failure]
public fun test_cve_new02_aborts_when_combined_credit_insufficient() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // fee = 81_000;  free_credit = 30_000;  total_recharged = 40_000
        // combined = 70_000 < 81_000 → must abort
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(30_000);
        state.update_total_recharged(40_000);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── Boundary: charge_fee edge cases ─────────────────────────────────────────

/// Boundary B: free_credit == fee exactly.
/// The if-branch uses `>=`, so this should succeed deducting from free_credit
/// only; total_recharged must remain unchanged.
#[test]
public fun test_charge_boundary_free_credit_equals_fee_exactly() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // fee = (1+1)*500 + 80_000 = 81_000
        let expected_fee = fee(1, 1);
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(expected_fee);      // exactly equal to fee
        state.update_total_recharged(50_000);        // available but must not be touched
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        // free_credit must be drained to zero.
        assert!(state2.free_credit() == 0, 0);
        // total_recharged must be untouched (free_credit alone covered the fee).
        assert!(state2.total_recharged() == 50_000, 1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Boundary D: free_credit + total_recharged == fee exactly (both pools drain to 0).
#[test]
public fun test_charge_boundary_combined_credit_equals_fee_exactly() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // fee = 81_000; free_credit = 1_000; recharged = 80_000 → combined = 81_000
        let expected_fee = fee(1, 1);
        let partial_free = 1_000u256;
        let partial_recharged = expected_fee - partial_free; // 80_000

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(partial_free);
        state.update_total_recharged(partial_recharged);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        // Both pools must be completely drained.
        assert!(state2.free_credit()     == 0, 0);
        assert!(state2.total_recharged() == 0, 1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Boundary E: free_credit == 0 and total_recharged == fee exactly (recharged drains to 0).
#[test]
public fun test_charge_boundary_recharged_equals_fee_exactly_when_free_zero() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // fee = 81_000; free_credit = 0; recharged = 81_000 → exactly covers fee
        let expected_fee = fee(1, 1);
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(0);
        state.update_total_recharged(expected_fee);
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        let state2 = dapp_fee_state::get_struct(&dh, dapp_key);
        assert!(state2.free_credit()     == 0, 0);
        assert!(state2.total_recharged() == 0, 1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Boundary G: free_credit == 0, total_recharged < fee → must abort.
#[test]
#[expected_failure]
public fun test_charge_boundary_recharged_only_but_insufficient() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let res = string(b"0xtest");

        // fee = 81_000; free_credit = 0; recharged = 80_999 → 1 unit short
        let expected_fee = fee(1, 1);
        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let mut state = dapp_fee_state::get_struct(&dh, dapp_key);
        state.update_free_credit(0);
        state.update_total_recharged(expected_fee - 1); // one unit short
        dapp_fee_state::set_struct(&mut dh, dapp_key, state, ctx);

        // Must abort with INSUFFICIENT_CREDIT.
        dapp_system::set_record<FeeTestKey>(
            &mut dh, new_fee_key(), k(b"x"), vector[to_bytes(&0u8)], res, false, ctx
        );

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── Framework admin free credit management ───────────────────────────────────

/// Framework admin can grant extra free credits to a DApp (partnership support).
#[test]
public fun test_framework_admin_can_grant_free_credit() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();
        let credit_before = dapp_fee_state::get_struct(&dh, dapp_key).free_credit();

        // Framework admin grants 1_000_000_000 bonus credits.
        let bonus: u256 = 1_000_000_000;
        dapp_system::set_dapp_free_credit(&mut dh, dapp_key, credit_before + bonus, ctx);

        let credit_after = dapp_fee_state::get_struct(&dh, dapp_key).free_credit();
        assert!(credit_after == credit_before + bonus, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Framework admin can revoke all free credits (set to 0) after a trial ends.
#[test]
public fun test_framework_admin_can_revoke_free_credit() {
    let sender = @0xFEE;
    let mut scenario = test_scenario::begin(sender);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();

        // Revoke all free credits.
        dapp_system::set_dapp_free_credit(&mut dh, dapp_key, 0, ctx);

        let credit_after = dapp_fee_state::get_struct(&dh, dapp_key).free_credit();
        assert!(credit_after == 0, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Any address (not just the DApp admin) may call recharge_credit.
/// Sponsors, community members, or the DApp admin itself can all top up credits.
#[test]
public fun test_anyone_can_recharge_credit() {
    let deployer = @0xFEE;
    let sponsor = @0xBAD;
    let mut scenario = test_scenario::begin(deployer);
    {
        let mut dh = setup(&mut scenario);
        // Switch context to a third-party sponsor address.
        let ctx = test_scenario::ctx(&mut scenario);
        *ctx = tx_context::new(sponsor, x"0000000000000000000000000000000000000000000000000000000000000002", 2, 0, 0);

        let dapp_key_str = dapp_system::dapp_key<FeeTestKey>();
        let recharged_before = dapp_fee_state::get_struct(&dh, dapp_key_str).total_recharged();
        let payment = coin::mint_for_testing<SUI>(1_000_000, ctx);

        // Must succeed — no permission restriction on recharge_credit.
        dapp_system::recharge_credit(&mut dh, FeeTestKey {}, payment, ctx);

        let recharged_after = dapp_fee_state::get_struct(&dh, dapp_key_str).total_recharged();
        assert!(recharged_after == recharged_before + 1_000_000, 0);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Non-framework-admin addresses must not be able to set DApp free credits.
#[test]
#[expected_failure]
public fun test_non_framework_admin_cannot_set_free_credit() {
    let framework_deployer = @0xFEE;
    let attacker = @0xBAD;
    // Start genesis as framework_deployer so the framework admin is @0xFEE.
    let mut scenario = test_scenario::begin(framework_deployer);
    {
        let mut dh = setup(&mut scenario);
        // Switch to attacker context.
        let ctx = test_scenario::ctx(&mut scenario);
        *ctx = tx_context::new(attacker, x"0000000000000000000000000000000000000000000000000000000000000001", 1, 0, 0);

        let dapp_key = dapp_system::dapp_key<FeeTestKey>();

        // Must abort with NO_PERMISSION.
        dapp_system::set_dapp_free_credit(&mut dh, dapp_key, 999_999_999, ctx);

        dapp_service::destroy(dh);
    };
    scenario.end();
}
