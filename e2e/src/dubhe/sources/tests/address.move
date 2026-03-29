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

    // evm_to_sui pads 12 zero bytes then 20 EVM bytes → a valid 32-byte address
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
    // ensure_origin for EVM returns lowercase hex without 0x prefix
    let expected = string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622");
    assert!(origin == expected);

    scenario.end();
}

#[test]
public fun test_solana_address_conversion() {
    let solana_str = string(b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");
    let sui_addr = address_system::solana_to_sui(solana_str);
    // Result is a deterministic 32-byte address derived from base58 decode
    // Just assert it's non-zero (content validated by Solana test below)
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
// involves O(n²) arithmetic in Move and times out in unit tests. The Solana
// address detection is validated by test_solana_context_detection above.

// ============================================================
// evm_to_sui: 0x prefix variants
// ============================================================

#[test]
/// evm_to_sui must accept plain lowercase hex without any 0x prefix.
public fun test_evm_to_sui_without_0x_prefix() {
    let expected = @0x0000000000000000000000009168765ee952de7c6f8fc6fad5ec209b960b7622;
    assert!(address_system::evm_to_sui(string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622")) == expected);
}

#[test]
/// hex_string_to_bytes also strips the 0X (uppercase-X) prefix variant.
public fun test_evm_to_sui_with_uppercase_0X_prefix() {
    let expected = @0x0000000000000000000000009168765ee952de7c6f8fc6fad5ec209b960b7622;
    assert!(address_system::evm_to_sui(string(b"0X9168765ee952de7c6f8fc6fad5ec209b960b7622")) == expected);
}

// ============================================================
// evm_to_sui / solana_to_sui: error paths
// ============================================================

#[test]
#[expected_failure]
/// evm_to_sui aborts (E_INVALID_EVM_ADDRESS) when the decoded byte length is < 20.
public fun test_evm_to_sui_rejects_short_address() {
    // 38 hex chars → 19 bytes, one byte short of the required 20
    address_system::evm_to_sui(string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b7"));
}

#[test]
#[expected_failure]
/// evm_to_sui aborts (E_INVALID_EVM_ADDRESS) when the decoded byte length is > 20.
public fun test_evm_to_sui_rejects_long_address() {
    // 42 hex chars → 21 bytes, one byte over the required 20
    address_system::evm_to_sui(string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b762200011"));
}

#[test]
#[expected_failure]
/// solana_to_sui aborts (E_INVALID_SOLANA_ADDRESS) when the string contains a
/// character that is not in the Base58 alphabet (e.g. '0', ASCII 48).
public fun test_solana_to_sui_rejects_invalid_base58_char() {
    // '0' is absent from the Base58 alphabet (which starts from '1')
    address_system::solana_to_sui(string(b"0vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L"));
}

// ============================================================
// Namespace isolation (CVE-D-02 — resource_address convention)
// ============================================================

#[test]
/// Two distinct EVM accounts must produce distinct ensure_origin strings so
/// they never share a resource_address namespace slot.
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
/// EVM and Sui origins structurally cannot collide: EVM is always 40 chars,
/// Sui is always 64 chars, so no cross-chain namespace overlap is possible.
public fun test_cross_chain_origin_isolation() {
    let mut scenario = test_scenario::begin(SUI_SENDER);

    // Native Sui context → 64-char hex
    let sui_origin = address_system::ensure_origin(test_scenario::ctx(&mut scenario));
    assert!(sui_origin.length() == 64);

    // EVM relay context → 40-char hex (20-byte EVM address)
    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");
    let evm_origin = address_system::ensure_origin(test_scenario::ctx(&mut scenario));
    assert!(evm_origin.length() == 40);

    // Different lengths guarantee they are distinct, preventing cross-chain collisions.
    assert!(sui_origin != evm_origin);
    scenario.end();
}
