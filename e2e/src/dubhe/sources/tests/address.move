#[test_only]
module dubhe::address_test;

use dubhe::address_system;
use dubhe::dapp_system;
use dubhe::proxy_config;
use dubhe::dapp_key::DappKey;
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
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let expected = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    assert!(address_system::ensure_origin<DappKey>(&dh, ctx) == expected);

    dapp_system::destroy(dh);
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
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let origin = address_system::ensure_origin<DappKey>(&dh, ctx);
    let expected = string(b"9168765ee952de7c6f8fc6fad5ec209b960b7622");
    assert!(origin == expected);

    dapp_system::destroy(dh);
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
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let origin_a = address_system::ensure_origin<DappKey>(&dh, test_scenario::ctx(&mut scenario));
    dapp_system::destroy(dh);

    address_system::setup_evm_scenario(&mut scenario, b"0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let origin_b = address_system::ensure_origin<DappKey>(&dh, test_scenario::ctx(&mut scenario));
    dapp_system::destroy(dh);

    assert!(origin_a != origin_b);
    scenario.end();
}

#[test]
public fun test_cross_chain_origin_isolation() {
    let mut scenario = test_scenario::begin(SUI_SENDER);

    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let sui_origin = address_system::ensure_origin<DappKey>(&dh, test_scenario::ctx(&mut scenario));
    assert!(sui_origin.length() == 64);
    dapp_system::destroy(dh);

    address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let evm_origin = address_system::ensure_origin<DappKey>(&dh, test_scenario::ctx(&mut scenario));
    assert!(evm_origin.length() == 40);
    dapp_system::destroy(dh);

    assert!(sui_origin != evm_origin);
    scenario.end();
}

// ============================================================
// Proxy resolution tests
// ============================================================

// Active proxy: epoch_timestamp_ms = 0 (test default), expires_at = 9999.
// Check: 0 < 9999 = true → active → returns owner.
#[test]
public fun test_proxy_with_expiry_returns_owner() {
    let proxy_wallet: address = @0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    let owner_hex = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");

    let mut scenario = test_scenario::begin(proxy_wallet);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let proxy_account = proxy_wallet.to_ascii_string();
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, owner_hex, 9999, ctx);

    let origin = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin == owner_hex);

    dapp_system::destroy(dh);
    scenario.end();
}

// Active proxy still within its window.
#[test]
public fun test_proxy_not_yet_expired_returns_owner() {
    let proxy_wallet: address = @0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;
    let owner_hex = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");

    let mut scenario = test_scenario::begin(proxy_wallet);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let proxy_account = proxy_wallet.to_ascii_string();
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, owner_hex, 9999, ctx);

    let origin = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin == owner_hex);

    dapp_system::destroy(dh);
    scenario.end();
}

// Expired proxy: epoch_timestamp_ms = 0, expires_at = 0.
// Check: 0 < 0 = false → expired → falls back to proxy wallet's own address.
#[test]
public fun test_expired_proxy_falls_back_to_self() {
    let proxy_wallet: address = @0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc;
    let owner_hex = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    let proxy_hex = string(b"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");

    let mut scenario = test_scenario::begin(proxy_wallet);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let proxy_account = proxy_wallet.to_ascii_string();
    // expires_at = 0: in test context epoch_timestamp_ms = 0, so 0 < 0 = false → expired.
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, owner_hex, 0, ctx);

    let origin = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin == proxy_hex);
    assert!(origin != owner_hex);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// Without a proxy binding, ensure_origin returns the sender's own 64-char hex.
public fun test_no_proxy_ensure_origin_returns_self() {
    let mut scenario = test_scenario::begin(SUI_SENDER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let expected = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    assert!(address_system::ensure_origin<DappKey>(&dh, ctx) == expected);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// Proxy lookup is scoped per DappKey.
public fun test_proxy_is_scoped_per_dapp_key() {
    let proxy_wallet: address = @0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd;
    let owner_hex = string(b"1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
    let proxy_hex = string(b"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");

    let mut scenario = test_scenario::begin(proxy_wallet);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    // Register proxy under a different dapp_key (with a future expiry)
    let other_dapp_key_str = string(b"0000000000000000000000000000000000000000000000000000000000000042::other::OtherKey");
    let proxy_account = proxy_wallet.to_ascii_string();
    proxy_config::set(&mut dh, other_dapp_key_str, proxy_account, owner_hex, 9999, ctx);

    // Lookup with DappKey (not other_dapp_key_str) finds no binding → own address
    let origin = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin == proxy_hex);

    dapp_system::destroy(dh);
    scenario.end();
}
