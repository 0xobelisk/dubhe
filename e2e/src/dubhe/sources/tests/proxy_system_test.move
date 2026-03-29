#[test_only]
module dubhe::proxy_system_test;

use dubhe::address_system;
use dubhe::dapp_system;
use dubhe::proxy_config;
use dubhe::proxy_system;
use dubhe::dapp_key::DappKey;
use sui::test_scenario;
use sui::clock;
use std::ascii::string;

const OWNER: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
const PROXY: address  = @0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
const OTHER: address  = @0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;

// ── create_proxy ownership / re-binding rules ─────────────────────────────────

#[test]
/// Same owner can call create_proxy again to update expires_at on an active binding.
public fun test_create_proxy_same_owner_can_overwrite_active() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();

    // epoch_timestamp_ms = 0; expires_at = 9000 > 0 → valid.
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);
    // Same owner re-registers with a later expiry — must not abort.
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 50000, ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let (_, new_expires_at) = proxy_config::get(&dh, dapp_key_str, proxy_account);
    assert!(new_expires_at == 50000);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 7)]
/// A different owner cannot overwrite an active proxy binding.
public fun test_create_proxy_different_owner_aborts_on_active() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();

    // OWNER registers the proxy.
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    // Switch to OTHER and attempt to overwrite → must abort with E_PROXY_ALREADY_CLAIMED (7).
    // epoch_timestamp_ms = 0: now (0) < expires_at (9000) → binding is active.
    test_scenario::next_tx(&mut scenario, OTHER);
    let ctx = test_scenario::ctx(&mut scenario);
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// A new owner may claim a proxy binding after it has expired.
/// Expiry is simulated by writing expires_at = 0 directly (proxy_config::set),
/// so that epoch_timestamp_ms (0 in tests) is NOT < expires_at (0) → expired.
public fun test_create_proxy_new_owner_can_claim_expired() {
    let other_hex = string(b"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    // Write an already-expired binding for PROXY directly (expires_at = 0).
    // With epoch_timestamp_ms = 0: 0 < 0 = false → the binding is considered expired.
    let dapp_key_str = dubhe::dapp_key::to_string();
    let proxy_account = PROXY.to_ascii_string();
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, OWNER.to_ascii_string(), 0, ctx);

    // OTHER now claims the same proxy wallet — must succeed because the binding is expired.
    test_scenario::next_tx(&mut scenario, OTHER);
    let ctx = test_scenario::ctx(&mut scenario);
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 20000, ctx);

    let (new_owner, _) = proxy_config::get(&dh, dapp_key_str, proxy_account);
    assert!(new_owner == other_hex);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 6)]
/// create_proxy rejects expires_at = 0: with epoch_timestamp_ms = 0,
/// the check (0 > 0) is false → E_EXPIRES_AT_IN_PAST (6).
public fun test_create_proxy_rejects_zero_expires_at() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, PROXY.to_ascii_string(), 0, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 8)]
/// create_proxy rejects an expires_at that exceeds epoch_timestamp_ms + 7 days.
/// In test context epoch_timestamp_ms = 0, so the ceiling is MAX_PROXY_DURATION_MS.
public fun test_create_proxy_rejects_expires_at_too_far() {
    let max_duration_ms: u64 = 7 * 24 * 60 * 60 * 1000; // 604_800_000
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    // epoch_timestamp_ms = 0; ceiling = 604_800_000; trying 604_800_001 → abort (8).
    proxy_system::create_proxy_for_testing<DappKey>(
        &mut dh,
        PROXY.to_ascii_string(),
        max_duration_ms + 1,
        ctx,
    );

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// create_proxy accepts expires_at = epoch_timestamp_ms + 7 days exactly (boundary).
/// In test context epoch_timestamp_ms = 0, so boundary = MAX_PROXY_DURATION_MS.
public fun test_create_proxy_accepts_max_boundary() {
    let max_duration_ms: u64 = 7 * 24 * 60 * 60 * 1000;
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    proxy_system::create_proxy_for_testing<DappKey>(
        &mut dh,
        PROXY.to_ascii_string(),
        max_duration_ms,
        ctx,
    );

    dapp_system::destroy(dh);
    scenario.end();
}

// ── extend_proxy ──────────────────────────────────────────────────────────────

#[test]
/// Owner can extend an active proxy's expiry.
public fun test_extend_proxy_owner_succeeds() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    proxy_system::extend_proxy<DappKey>(&mut dh, proxy_account, 99000, ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let expires_at = proxy_config::get_expires_at(&dh, dapp_key_str, proxy_account);
    assert!(expires_at == 99000);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// Owner can shorten (bring forward) the expiry of an active proxy.
/// extend_proxy is really "set expiry" — any future time within 7 days is valid.
public fun test_extend_proxy_can_shorten_expiry() {
    let max_duration_ms: u64 = 7 * 24 * 60 * 60 * 1000;
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    // Create with the maximum allowed expiry.
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, max_duration_ms, ctx);

    // Shorten to 9000 — must succeed (still future, still within 7-day cap).
    proxy_system::extend_proxy<DappKey>(&mut dh, proxy_account, 9000, ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    let expires_at = proxy_config::get_expires_at(&dh, dapp_key_str, proxy_account);
    assert!(expires_at == 9000);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 5)]
/// extend_proxy rejects an already-expired binding.
/// Once a proxy expires, the owner must call create_proxy again (with a fresh
/// proxy wallet signature) — silent revival via extend_proxy is not permitted.
/// Simulated: writes expires_at = 0 directly so that epoch_timestamp_ms (0) is
/// NOT < 0, meaning the binding is considered expired.
public fun test_extend_proxy_rejects_expired_binding() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    // Write an expired binding directly (expires_at = 0; epoch_timestamp_ms = 0:
    // 0 < 0 = false → expired).
    let dapp_key_str = dubhe::dapp_key::to_string();
    let proxy_account = PROXY.to_ascii_string();
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, OWNER.to_ascii_string(), 0, ctx);

    // Attempting to extend an expired binding → must abort with E_PROXY_EXPIRED (5).
    proxy_system::extend_proxy<DappKey>(&mut dh, proxy_account, 9000, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure]
/// A non-owner cannot extend someone else's proxy.
public fun test_extend_proxy_non_owner_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    test_scenario::next_tx(&mut scenario, OTHER);
    let ctx = test_scenario::ctx(&mut scenario);
    proxy_system::extend_proxy<DappKey>(&mut dh, proxy_account, 99000, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 4)]
/// extend_proxy aborts when the proxy binding does not exist.
public fun test_extend_proxy_not_found_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    proxy_system::extend_proxy<DappKey>(&mut dh, PROXY.to_ascii_string(), 9000, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 6)]
/// extend_proxy rejects new_expires_at = 0:
/// epoch_timestamp_ms = 0, check (0 > 0) = false → E_EXPIRES_AT_IN_PAST (6).
public fun test_extend_proxy_rejects_zero_or_past_expires_at() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    // new_expires_at = 0, epoch_timestamp_ms = 0: 0 > 0 = false → abort.
    proxy_system::extend_proxy<DappKey>(&mut dh, proxy_account, 0, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 8)]
/// extend_proxy rejects a new_expires_at that exceeds epoch_timestamp_ms + 7 days.
public fun test_extend_proxy_rejects_expires_at_too_far() {
    let max_duration_ms: u64 = 7 * 24 * 60 * 60 * 1000;
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    // epoch_timestamp_ms = 0; ceiling = 604_800_000; trying 604_800_001 → abort (8).
    proxy_system::extend_proxy<DappKey>(
        &mut dh,
        proxy_account,
        max_duration_ms + 1,
        ctx,
    );

    dapp_system::destroy(dh);
    scenario.end();
}

// ── remove_proxy ──────────────────────────────────────────────────────────────

#[test]
/// Owner can remove an active proxy.
public fun test_remove_proxy_owner_succeeds() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut clk = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clk, 1000);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);
    assert!(proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    proxy_system::remove_proxy<DappKey>(&mut dh, proxy_account, ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    assert!(!proxy_config::has(&dh, dapp_key_str, proxy_account));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// After removal, ensure_origin falls back to the proxy wallet's own address.
public fun test_remove_proxy_ensure_origin_falls_back() {
    let mut scenario = test_scenario::begin(PROXY);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    let owner_hex = string(b"1111111111111111111111111111111111111111111111111111111111111111");

    // Set up proxy binding directly (future expiry = 9000; epoch_timestamp_ms = 0).
    let dapp_key_str = dubhe::dapp_key::to_string();
    proxy_config::set(&mut dh, dapp_key_str, proxy_account, owner_hex, 9000, ctx);

    // ensure_origin as PROXY resolves to owner (no Clock needed).
    let origin_before = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin_before == owner_hex);

    // OWNER removes the binding.
    test_scenario::next_tx(&mut scenario, OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    proxy_system::remove_proxy<DappKey>(&mut dh, proxy_account, ctx);

    // Now ensure_origin as PROXY falls back to PROXY's own address.
    test_scenario::next_tx(&mut scenario, PROXY);
    let ctx = test_scenario::ctx(&mut scenario);
    let origin_after = address_system::ensure_origin<DappKey>(&dh, ctx);
    assert!(origin_after == proxy_account);
    assert!(origin_after != owner_hex);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// Owner can also remove an already-expired proxy (storage reclaim).
public fun test_remove_proxy_can_remove_expired() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut clk = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clk, 1000);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 5000, ctx);

    // Fast-forward clock past the expiry (is_proxy_active still uses Clock).
    clock::set_for_testing(&mut clk, 10000);
    assert!(!proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    // Binding is expired but OWNER can still remove it.
    proxy_system::remove_proxy<DappKey>(&mut dh, proxy_account, ctx);

    let dapp_key_str = dubhe::dapp_key::to_string();
    assert!(!proxy_config::has(&dh, dapp_key_str, proxy_account));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure]
/// A non-owner cannot remove someone else's proxy.
public fun test_remove_proxy_non_owner_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);

    test_scenario::next_tx(&mut scenario, OTHER);
    let ctx = test_scenario::ctx(&mut scenario);
    proxy_system::remove_proxy<DappKey>(&mut dh, proxy_account, ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 4)]
/// remove_proxy aborts when the binding does not exist.
public fun test_remove_proxy_not_found_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);

    proxy_system::remove_proxy<DappKey>(&mut dh, PROXY.to_ascii_string(), ctx);

    dapp_system::destroy(dh);
    scenario.end();
}

// ── is_proxy_active ───────────────────────────────────────────────────────────
// is_proxy_active is a view helper that takes a Clock (not in the transaction hot path).

#[test]
/// is_proxy_active returns true when clock < expires_at.
public fun test_is_proxy_active_within_window() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut clk = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clk, 1000);

    let proxy_account = PROXY.to_ascii_string();
    // epoch_timestamp_ms = 0, expires_at = 9000 → valid creation.
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 9000, ctx);
    // clock = 1000 < 9000 → active.
    assert!(proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// is_proxy_active returns false when clock >= expires_at (binding has expired).
public fun test_is_proxy_active_expired() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut clk = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clk, 1000);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 5000, ctx);

    // Fast-forward past expiry: clock = 10000 >= 5000.
    clock::set_for_testing(&mut clk, 10000);
    assert!(!proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// is_proxy_active returns false when no binding exists.
public fun test_is_proxy_active_not_found() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let clk = clock::create_for_testing(ctx);

    assert!(!proxy_system::is_proxy_active<DappKey>(&dh, PROXY.to_ascii_string(), &clk));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}

#[test]
/// Boundary semantics: active when clock < expires_at, expired when clock >= expires_at.
/// (is_proxy_active uses strict `<` so the proxy expires exactly at expires_at.)
public fun test_is_proxy_active_at_boundary() {
    let mut scenario = test_scenario::begin(OWNER);
    let ctx = test_scenario::ctx(&mut scenario);
    let mut dh = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut clk = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clk, 1000);

    let proxy_account = PROXY.to_ascii_string();
    proxy_system::create_proxy_for_testing<DappKey>(&mut dh, proxy_account, 5000, ctx);

    // clock = 4999 < 5000 → active.
    clock::set_for_testing(&mut clk, 4999);
    assert!(proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    // clock = 5000: NOT < 5000 → expired.
    clock::set_for_testing(&mut clk, 5000);
    assert!(!proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    // clock = 5001 → still expired.
    clock::set_for_testing(&mut clk, 5001);
    assert!(!proxy_system::is_proxy_active<DappKey>(&dh, proxy_account, &clk));

    clock::destroy_for_testing(clk);
    dapp_system::destroy(dh);
    scenario.end();
}
