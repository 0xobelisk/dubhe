#[test_only]
module dubhe::test_cheatcodes_test;

use dubhe::address_system;
use dubhe::test_cheatcodes;
use sui::test_scenario;
use std::ascii::string;

#[test]
public fun test_prank_next_tx_switches_sender() {
    let mut scenario = test_scenario::begin(@0xA);
    assert!(test_scenario::sender(&scenario) == @0xA);

    let _effects = test_cheatcodes::prank_next_tx(&mut scenario, @0xB);
    assert!(test_scenario::sender(&scenario) == @0xB);

    scenario.end();
}

#[test]
public fun test_warp_and_roll_epoch() {
    let mut scenario = test_scenario::begin(@0xA);

    let start_ms = {
        let ctx = test_scenario::ctx(&mut scenario);
        tx_context::epoch_timestamp_ms(ctx)
    };

    let _effects = test_cheatcodes::warp_next_tx(&mut scenario, 1_500, @0xA);
    let after_warp_ms = {
        let ctx = test_scenario::ctx(&mut scenario);
        tx_context::epoch_timestamp_ms(ctx)
    };
    assert!(after_warp_ms == start_ms + 1_500);

    let start_epoch = {
        let ctx = test_scenario::ctx(&mut scenario);
        tx_context::epoch(ctx)
    };
    let _effects = test_cheatcodes::roll_next_epoch(&mut scenario, @0xA);
    let after_roll_epoch = {
        let ctx = test_scenario::ctx(&mut scenario);
        tx_context::epoch(ctx)
    };
    assert!(after_roll_epoch == start_epoch + 1);

    test_cheatcodes::roll_epochs(&mut scenario, 2, @0xA);
    let after_roll_epochs = {
        let ctx = test_scenario::ctx(&mut scenario);
        tx_context::epoch(ctx)
    };
    assert!(after_roll_epochs == start_epoch + 3);

    scenario.end();
}

#[test]
public fun test_impersonate_evm_sender() {
    let mut scenario = test_scenario::begin(@0xA);
    test_cheatcodes::impersonate_evm_sender(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");

    let ctx = test_scenario::ctx(&mut scenario);
    assert!(address_system::is_evm_address(ctx));
    let expected = string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622");
    assert!(address_system::ensure_origin(ctx) == expected);

    scenario.end();
}

#[test, expected_failure(abort_code = 77, location = dubhe::test_cheatcodes)]
public fun test_expect_revert_style() {
    test_cheatcodes::revert(77);
}
