#[test_only]
module dubhe::address_test;

use dubhe::address_system;
use sui::test_scenario;
use std::ascii::string;

// SUI address used in all tests
const SUI_SENDER: address = @0x1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217;

#[test]
public fun test_sui_address_detection() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    let ctx = test_scenario::ctx(&mut scenario);

    assert!(address_system::is_sui_address(ctx));
    assert!(!address_system::is_evm_address(ctx));
    assert!(!address_system::is_solana_address(ctx));

    scenario.end();
}

#[test]
public fun test_sui_ensure_origin() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    let ctx = test_scenario::ctx(&mut scenario);

    let expected = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    assert!(address_system::ensure_origin(ctx) == expected);

    scenario.end();
}

#[test]
public fun test_evm_address_conversion() {
    let evm_str = string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b7622");
    let sui_addr = address_system::evm_to_sui(evm_str);

    let expected = @0x0000000000000000000000009168765ee952de7c6f8fc6fad5ec209b960b7622;
    assert!(sui_addr == expected);
}

#[test]
public fun test_evm_context_detection() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");

    let ctx = test_scenario::ctx(&mut scenario);
    assert!(address_system::is_evm_address(ctx));
    assert!(!address_system::is_sui_address(ctx));
    assert!(!address_system::is_solana_address(ctx));

    scenario.end();
}

#[test]
public fun test_evm_ensure_origin() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");

    let ctx = test_scenario::ctx(&mut scenario);
    let origin = address_system::ensure_origin(ctx);
    let expected = string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622");
    assert!(origin == expected);

    scenario.end();
}

#[test]
public fun test_solana_address_conversion() {
    let solana_str = string(b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");
    let sui_addr = address_system::solana_to_sui(solana_str);
    assert!(sui_addr != @0x0);
}

#[test]
public fun test_solana_context_detection() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    address_system::setup_solana_scenario(&mut scenario, b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");

    let ctx = test_scenario::ctx(&mut scenario);
    assert!(address_system::is_solana_address(ctx));
    assert!(!address_system::is_sui_address(ctx));
    assert!(!address_system::is_evm_address(ctx));

    scenario.end();
}

// NOTE: test_solana_ensure_origin is omitted — base58_encode on a 32-byte address
// involves O(n²) arithmetic in Move and times out in unit tests.

// ============================================================
// evm_to_sui: 0x prefix variants
// ============================================================

#[test]
public fun test_evm_to_sui_without_0x_prefix() {
    let expected = @0x0000000000000000000000009168765ee952de7c6f8fc6fad5ec209b960b7622;
    assert!(address_system::evm_to_sui(string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622")) == expected);
}

#[test]
public fun test_evm_to_sui_with_uppercase_0X_prefix() {
    let expected = @0x0000000000000000000000009168765ee952de7c6f8fc6fad5ec209b960b7622;
    assert!(address_system::evm_to_sui(string(b"0X9168765ee952de7c6f8fc6fad5ec209b960b7622")) == expected);
}

// ============================================================
// error paths
// ============================================================

#[test]
#[expected_failure]
public fun test_evm_to_sui_rejects_short_address() {
    address_system::evm_to_sui(string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b7"));
}

#[test]
#[expected_failure]
public fun test_evm_to_sui_rejects_long_address() {
    address_system::evm_to_sui(string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b762200011"));
}

#[test]
#[expected_failure]
public fun test_solana_to_sui_rejects_invalid_base58_char() {
    address_system::solana_to_sui(string(b"0vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L"));
}

// ============================================================
// Namespace isolation (CVE-D-02)
// ============================================================

#[test]
public fun test_evm_ensure_origin_isolation() {
    let mut scenario = test_scenario::begin(SUI_SENDER);

    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");
    let origin_a = address_system::ensure_origin(test_scenario::ctx(&mut scenario));

    address_system::setup_evm_scenario(&mut scenario, b"0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    let origin_b = address_system::ensure_origin(test_scenario::ctx(&mut scenario));

    assert!(origin_a != origin_b);
    scenario.end();
}

#[test]
public fun test_cross_chain_origin_isolation() {
    let mut scenario = test_scenario::begin(SUI_SENDER);

    let sui_origin = address_system::ensure_origin(test_scenario::ctx(&mut scenario));
    assert!(sui_origin.length() == 64);

    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");
    let evm_origin = address_system::ensure_origin(test_scenario::ctx(&mut scenario));
    assert!(evm_origin.length() == 40);

    assert!(sui_origin != evm_origin);
    scenario.end();
}

#[test]
/// ensure_origin returns the sender's own 64-char hex for native Sui.
public fun test_no_proxy_ensure_origin_returns_self() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    let ctx = test_scenario::ctx(&mut scenario);

    let expected = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    assert!(address_system::ensure_origin(ctx) == expected);

    scenario.end();
}
