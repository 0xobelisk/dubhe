#[test_only]
module dubhe::test_cheatcodes;

use dubhe::address_system;
use sui::test_scenario;

const E_TIME_TRAVEL_BACKWARD: u64 = 1;

/// Foundry-like prank: advance to next tx with a different sender.
public fun prank_next_tx(
    scenario: &mut test_scenario::Scenario,
    sender: address
): test_scenario::TransactionEffects {
    test_scenario::next_tx(scenario, sender)
}

/// Foundry-like warp: advance timestamp by delta and open next tx.
public fun warp_next_tx(
    scenario: &mut test_scenario::Scenario,
    delta_ms: u64,
    sender: address
): test_scenario::TransactionEffects {
    let ctx = test_scenario::ctx(scenario);
    tx_context::increment_epoch_timestamp(ctx, delta_ms);
    test_scenario::next_tx(scenario, sender)
}

/// Warp to an absolute timestamp (must be monotonic).
public fun warp_to_next_tx(
    scenario: &mut test_scenario::Scenario,
    target_timestamp_ms: u64,
    sender: address
): test_scenario::TransactionEffects {
    let ctx = test_scenario::ctx(scenario);
    let now_ms = tx_context::epoch_timestamp_ms(ctx);
    assert!(target_timestamp_ms >= now_ms, E_TIME_TRAVEL_BACKWARD);
    tx_context::increment_epoch_timestamp(ctx, target_timestamp_ms - now_ms);
    test_scenario::next_tx(scenario, sender)
}

/// Foundry-like roll: move to the next epoch and next tx.
public fun roll_next_epoch(
    scenario: &mut test_scenario::Scenario,
    sender: address
): test_scenario::TransactionEffects {
    test_scenario::next_epoch(scenario, sender)
}

/// Roll multiple epochs while keeping sender fixed.
public fun roll_epochs(scenario: &mut test_scenario::Scenario, epochs: u64, sender: address) {
    let mut i = 0;
    while (i < epochs) {
        let _effects = test_scenario::next_epoch(scenario, sender);
        i = i + 1;
    };
}

/// EVM impersonation helper (Dubhe tx hash marker + sender conversion).
public fun impersonate_evm_sender(
    scenario: &mut test_scenario::Scenario,
    evm_address_bytes: vector<u8>
) {
    address_system::setup_evm_scenario(scenario, evm_address_bytes);
}

/// Solana impersonation helper (Dubhe tx hash marker + sender conversion).
public fun impersonate_solana_sender(
    scenario: &mut test_scenario::Scenario,
    solana_address_bytes: vector<u8>
) {
    address_system::setup_solana_scenario(scenario, solana_address_bytes);
}

/// Explicit revert helper for expectRevert-style tests.
public fun revert(code: u64) {
    abort code
}
