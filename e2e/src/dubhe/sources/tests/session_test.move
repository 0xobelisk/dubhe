/// Unit tests — Session key management
///
/// Covers activate_session, deactivate_session, is_write_authorized, and dapp_key_mismatch:
///
/// activate_session:
///   happy path (sets key + expiry)
///   overwrites an active session (device switch / key loss without deactivate)
///   overwrites an expired session (direct renewal, no deactivate needed)
///   aborts: non-canonical-owner caller
///   aborts: session_wallet == @0x0
///   aborts: session_wallet == canonical_owner (self-proxy)
///   aborts: duration below MIN_SESSION_DURATION_MS
///   aborts: duration above MAX_SESSION_DURATION_MS
///   boundary: exactly MIN_SESSION_DURATION_MS succeeds
///   boundary: exactly MAX_SESSION_DURATION_MS succeeds
///
/// deactivate_session:
///   canonical owner deactivates an active session
///   session key deactivates itself
///   anyone cleans up after natural expiry
///   aborts: no active session (key == @0x0)
///   aborts: stranger tries to deactivate a still-active session
///   clears both session_key and session_expires_at to zero
///
/// is_write_authorized:
///   canonical owner is always authorized (no session, active session, expired session)
///   session key authorized when active (before expiry)
///   session key rejected at the exact expiry timestamp
///   session key rejected after expiry
///   stranger always rejected
///   @0x0 session key (no session) rejects non-canonical callers
#[test_only]
module dubhe::session_test;

use dubhe::dapp_service::{Self, UserStorage};
use dubhe::dapp_system;
use sui::test_scenario;
use sui::clock;

public struct SessionTestKey has copy, drop {}
/// A distinct DApp key used only to trigger dapp_key_mismatch errors.
public struct SessionWrongKey has copy, drop {}

const OWNER:   address = @0x1111;
const SESSION: address = @0x2222;
const OTHER:   address = @0x3333;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun new_us_for(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<SessionTestKey>(owner, ctx)
}

// ═══════════════════════════════════════════════════════════════════════════════
// activate_session — happy paths
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_activate_sets_key_and_expiry() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 1_000);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);

        let duration = dapp_system::min_session_duration_ms();
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, duration, &clk, ctx);

        assert!(dapp_service::session_key(&us) == SESSION);
        assert!(dapp_service::session_expires_at(&us) == 1_000 + duration);

        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
fun test_activate_overwrites_active_session() {
    // Owner lost access to SESSION wallet and needs to replace it without deactivating.
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);

        // Activate first session.
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx);
        assert!(dapp_service::session_key(&us) == SESSION);

        // Overwrite with a new session key WITHOUT deactivating first.
        dapp_system::activate_session<SessionTestKey>(&mut us, OTHER, dapp_system::min_session_duration_ms(), &clk, ctx);
        assert!(dapp_service::session_key(&us) == OTHER);

        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
fun test_activate_overwrites_expired_session() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let min = dapp_system::min_session_duration_ms();
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);

        // Activate and let it expire naturally.
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, min, &clk, ctx);
        clock::set_for_testing(&mut clk, min + 1);

        // Renewal: activate new session directly without deactivate.
        dapp_system::activate_session<SessionTestKey>(&mut us, OTHER, min, &clk, ctx);
        assert!(dapp_service::session_key(&us) == OTHER);
        // New expiry is relative to the new clock value.
        assert!(dapp_service::session_expires_at(&us) == (min + 1) + min);

        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// activate_session — abort cases
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_activate_aborts_for_non_canonical_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);

    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        new_us_for(OWNER, ctx)
    };

    // OTHER is not the canonical owner — must abort.
    test_scenario::next_tx(&mut scenario, OTHER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx);
    };

    clk.destroy_for_testing();
    dapp_service::destroy_user_storage(us);
    scenario.end();
}

#[test]
#[expected_failure]
fun test_activate_aborts_for_zero_address() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        // @0x0 session key must abort with invalid_session_key_error.
        dapp_system::activate_session<SessionTestKey>(&mut us, @0x0, dapp_system::min_session_duration_ms(), &clk, ctx);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
#[expected_failure]
fun test_activate_aborts_when_session_wallet_equals_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        // canonical owner can't set themselves as the session key.
        dapp_system::activate_session<SessionTestKey>(&mut us, OWNER, dapp_system::min_session_duration_ms(), &clk, ctx);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
#[expected_failure]
fun test_activate_aborts_duration_below_min() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        let too_short = dapp_system::min_session_duration_ms() - 1;
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, too_short, &clk, ctx);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
#[expected_failure]
fun test_activate_aborts_duration_above_max() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        let too_long = dapp_system::max_session_duration_ms() + 1;
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, too_long, &clk, ctx);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
fun test_activate_succeeds_at_exactly_min_duration() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx);
        assert!(dapp_service::session_key(&us) == SESSION);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
fun test_activate_succeeds_at_exactly_max_duration() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::max_session_duration_ms(), &clk, ctx);
        assert!(dapp_service::session_key(&us) == SESSION);
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// deactivate_session — happy paths
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_deactivate_by_canonical_owner_clears_session() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);

        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx);
        assert!(dapp_service::session_key(&us) == SESSION);

        dapp_system::deactivate_session<SessionTestKey>(&mut us, ctx);

        assert!(dapp_service::session_key(&us) == @0x0);
        assert!(dapp_service::session_expires_at(&us) == 0);

        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

#[test]
fun test_deactivate_by_session_key_itself() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);

    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        new_us_for(OWNER, ctx)
    };
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::activate_session<SessionTestKey>(&mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx);
    };

    // SESSION key signs out itself.
    test_scenario::next_tx(&mut scenario, SESSION);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::deactivate_session<SessionTestKey>(&mut us, ctx);
        assert!(dapp_service::session_key(&us) == @0x0);
    };

    clk.destroy_for_testing();
    dapp_service::destroy_user_storage(us);
    scenario.end();
}

// NOTE: deactivate_session() uses ctx.epoch_timestamp_ms() which stays at 0 in
// test_scenario and cannot be advanced without real epoch progression.
// The "expired session can be cleaned up by anyone" path is tested below via
// dapp_system::deactivate_session_with_now_ms_for_testing, which exercises the
// same permission logic with an explicit now_ms parameter.

#[test]
fun test_zero_session_key_means_no_active_session() {
    // When session_key == @0x0, no session exists regardless of expires_at.
    // is_write_authorized returns false for any non-owner sender.
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = new_us_for(OWNER, ctx);
        // Default state: session_key = @0x0, expires_at = 0.
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 0));
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 999_999));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}


// ─── deactivate_session: expired-session cleanup by any sender ────────────────

/// Any address may clean up a session after it has expired.
/// In production this is gated on ctx.epoch_timestamp_ms() >= session_expires_at;
/// here we use the test helper that accepts an explicit now_ms.
#[test]
fun test_deactivate_expired_session_by_stranger_succeeds() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        // Plant a session with expires_at = 1 ms.
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 1);

        // Stranger calls at now_ms = 1000 — session is expired → allowed.
        dapp_system::deactivate_session_with_now_ms_for_testing<SessionTestKey>(&mut us, OTHER, 1000);

        assert!(dapp_service::session_key(&us) == @0x0);
        assert!(dapp_service::session_expires_at(&us) == 0);

        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

/// A stranger must NOT deactivate a session that is still active (not yet expired).
#[test]
#[expected_failure]
fun test_deactivate_non_expired_session_by_stranger_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        // Session that expires far in the future.
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 9_999_999);

        // now_ms = 0 < 9_999_999 → not expired → stranger must abort.
        dapp_system::deactivate_session_with_now_ms_for_testing<SessionTestKey>(&mut us, OTHER, 0);

        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// deactivate_session — abort cases
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_deactivate_aborts_when_no_active_session() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = new_us_for(OWNER, ctx);
        // No session — must abort with no_active_session_error.
        dapp_system::deactivate_session<SessionTestKey>(&mut us, ctx);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_deactivate_aborts_for_stranger_with_active_session() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(OWNER);

    let mut us = {
        let ctx = test_scenario::ctx(&mut scenario);
        new_us_for(OWNER, ctx)
    };
    // Active session with far-future expiry (epoch_timestamp_ms stays near 0 in tests).
    dapp_service::set_session_key_for_testing(&mut us, SESSION, min * 1000);

    // OTHER is not owner, not SESSION key, and session is not expired → must abort.
    test_scenario::next_tx(&mut scenario, OTHER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::deactivate_session<SessionTestKey>(&mut us, ctx);
    };

    dapp_service::destroy_user_storage(us);
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// is_write_authorized
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_canonical_owner_always_authorized_with_no_session() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        assert!(dapp_service::is_write_authorized(&us, OWNER, 0));
        assert!(dapp_service::is_write_authorized(&us, OWNER, 999_999_999));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_canonical_owner_authorized_while_session_active() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, min * 100);
        assert!(dapp_service::is_write_authorized(&us, OWNER, 0));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_canonical_owner_authorized_after_session_expires() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 100);
        // At now_ms = 200, session is expired — but owner is still fine.
        assert!(dapp_service::is_write_authorized(&us, OWNER, 200));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_session_key_authorized_before_expiry() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, min);
        // At now_ms = 0, session is active.
        assert!(dapp_service::is_write_authorized(&us, SESSION, 0));
        // At now_ms = min - 1, session is still active.
        assert!(dapp_service::is_write_authorized(&us, SESSION, min - 1));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_session_key_rejected_at_exact_expiry_timestamp() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 100);
        // At now_ms == expires_at → expired (>= check).
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 100));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_session_key_rejected_after_expiry() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 100);
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 200));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_stranger_always_rejected() {
    let min = dapp_system::min_session_duration_ms();
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, min * 100);
        // Even with an active session key, OTHER is never authorized.
        assert!(!dapp_service::is_write_authorized(&us, OTHER, 0));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

#[test]
fun test_no_session_key_rejects_non_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let us = dapp_service::create_user_storage_for_testing<SessionTestKey>(OWNER, ctx);
        // session_key == @0x0 → non-owner is never authorized.
        assert!(!dapp_service::is_write_authorized(&us, SESSION, 0));
        assert!(!dapp_service::is_write_authorized(&us, OTHER, 0));
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// dapp_key_mismatch — activate_session and deactivate_session
// ═══════════════════════════════════════════════════════════════════════════════

/// activate_session must abort when the UserStorage belongs to a different DApp.
#[test]
#[expected_failure]
fun test_activate_session_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clk, 0);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        // UserStorage keyed to SessionWrongKey.
        let mut us = dapp_service::create_user_storage_for_testing<SessionWrongKey>(OWNER, ctx);
        // activate_session<SessionTestKey> on a SessionWrongKey storage — must abort.
        dapp_system::activate_session<SessionTestKey>(
            &mut us, SESSION, dapp_system::min_session_duration_ms(), &clk, ctx
        );
        dapp_service::destroy_user_storage(us);
    };
    clk.destroy_for_testing();
    scenario.end();
}

/// deactivate_session must abort when the UserStorage belongs to a different DApp.
#[test]
#[expected_failure]
fun test_deactivate_session_aborts_on_dapp_key_mismatch() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        // UserStorage keyed to SessionWrongKey, with an active session set directly.
        let mut us = dapp_service::create_user_storage_for_testing<SessionWrongKey>(OWNER, ctx);
        dapp_service::set_session_key_for_testing(&mut us, SESSION, 999_999_999);
        // deactivate_session<SessionTestKey> on a SessionWrongKey storage — must abort.
        dapp_system::deactivate_session<SessionTestKey>(&mut us, ctx);
        dapp_service::destroy_user_storage(us);
    };
    scenario.end();
}
