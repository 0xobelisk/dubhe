/// Unit tests — DApp lifecycle operations
///
/// Covers all admin-level DApp management functions:
///   upgrade_dapp:        happy path, non-admin, duplicate package, version not increasing,
///                        large version jump, upgrade while paused, new admin after ownership transfer
///   ensure_latest_version: pass, abort for stale version, abort for future version
///   set_paused:          admin pauses, admin resumes, non-admin abort
///   ensure_not_paused:   pass, abort when paused
///   set_metadata:        admin success, non-admin abort
///   propose_ownership:   sets pending, update overwrites, @0x0 cancels, non-admin abort
///   accept_ownership:    two-step transfer, abort when no pending, abort for wrong caller
///   ensure_dapp_admin:   pass for current admin, abort for non-admin
///
/// Design: single-sender tests use sui::tx_context::dummy() directly.
/// Multi-sender permission tests use test_scenario only where a second sender is needed.
#[test_only]
module dubhe::dapp_test;

use dubhe::dapp_service::{Self, DappStorage};
use dubhe::dapp_system;
use dubhe::dapp_metadata;
use sui::test_scenario;
use sui::transfer;
use std::ascii::string;

public struct DappTestKey has copy, drop {}

const ADMIN:    address = @0xAD;
const NOMINEE:  address = @0xBEEF;
const ATTACKER: address = @0xBAD;
const NEW_PKG:  address = @0x9999;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Create a DappStorage with ctx.sender() as admin (for single-sender tests).
fun new_ds(ctx: &mut TxContext): DappStorage {
    dapp_system::create_dapp_storage_for_testing<DappTestKey>(ctx)
}

// Create a DappStorage with a specific admin (for multi-sender tests).
fun new_ds_with_admin(admin: address, ctx: &mut TxContext): DappStorage {
    let mut ds = dapp_service::new_dapp_storage<DappTestKey>(0, 0, ctx);
    dubhe::dapp_metadata::set(
        &mut ds,
        string(b"Test DApp"),
        string(b""),
        string(b""),
        vector::empty(),
        vector::empty(),
        vector[dubhe::type_info::get_package_id<DappTestKey>()],
        0,
        admin,
        @0x0,
        1,
        false,
        ctx,
    );
    ds
}

// ═══════════════════════════════════════════════════════════════════════════════
// upgrade_dapp
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_upgrade_dapp_happy_path() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    assert!(dapp_metadata::get_version(&ds) == 1);
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, &mut ctx);
    assert!(dapp_metadata::get_version(&ds) == 2);
    assert!(dapp_metadata::get_package_ids(&ds).contains(&NEW_PKG));

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_upgrade_dapp_multiple_times() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, @0xAAA, 2, &mut ctx);
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, @0xBBB, 3, &mut ctx);

    assert!(dapp_metadata::get_version(&ds) == 3);
    let ids = dapp_metadata::get_package_ids(&ds);
    assert!(ids.contains(&@0xAAA));
    assert!(ids.contains(&@0xBBB));

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let ds = new_ds_with_admin(ADMIN, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, ctx);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_for_duplicate_package_id() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, &mut ctx);
    // Same package ID again must abort.
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 3, &mut ctx);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_when_version_equal() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);
    // Current version is 1; passing 1 must abort.
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 1, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_when_version_decreasing() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, @0xA1, 5, &mut ctx);
    // Passing an older version must also abort.
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, @0xA2, 3, &mut ctx);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_upgrade_dapp_large_version_jump() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    // v1 → v100: large jumps are valid as long as the version increases.
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 100, &mut ctx);
    assert!(dapp_metadata::get_version(&ds) == 100);
    assert!(dapp_metadata::get_package_ids(&ds).contains(&NEW_PKG));

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_upgrade_dapp_while_paused() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    // Admin pauses the DApp first.
    dapp_system::set_paused<DappTestKey>(&mut ds, true, &mut ctx);
    assert!(dapp_metadata::get_paused(&ds));

    // Admin can still upgrade even while the DApp is paused.
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, &mut ctx);
    assert!(dapp_metadata::get_version(&ds) == 2);
    assert!(dapp_metadata::get_paused(&ds)); // still paused after upgrade

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_upgrade_dapp_new_admin_can_upgrade() {
    // After a two-step ownership transfer, the new admin must be able to upgrade.
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&mut ds, NOMINEE, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, NOMINEE);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_ownership<DappTestKey>(&mut ds, ctx);
        assert!(dapp_metadata::get_admin(&ds) == NOMINEE);

        // New admin upgrades successfully.
        dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, ctx);
        assert!(dapp_metadata::get_version(&ds) == 2);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ensure_latest_version
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_ensure_latest_version_passes_for_current_version() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::ensure_latest_version<DappTestKey>(&ds, 1);
    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, &mut ctx);
    dapp_system::ensure_latest_version<DappTestKey>(&ds, 2);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_latest_version_aborts_for_stale_version() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&mut ds, NEW_PKG, 2, &mut ctx);
    // Old code compiled with version=1 — must abort.
    dapp_system::ensure_latest_version<DappTestKey>(&ds, 1);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_latest_version_aborts_for_future_version() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);

    // DApp is at version=1. Passing a higher version (e.g. from code compiled
    // against a future package) must also abort — the guard rejects any mismatch,
    // not only stale versions.
    dapp_system::ensure_latest_version<DappTestKey>(&ds, 2);

    dapp_service::destroy_dapp_storage(ds);
}

// ═══════════════════════════════════════════════════════════════════════════════
// set_paused / ensure_not_paused
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_paused_admin_can_pause_and_resume() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    assert!(!dapp_metadata::get_paused(&ds));

    dapp_system::set_paused<DappTestKey>(&mut ds, true, &mut ctx);
    assert!(dapp_metadata::get_paused(&ds));

    dapp_system::set_paused<DappTestKey>(&mut ds, false, &mut ctx);
    assert!(!dapp_metadata::get_paused(&ds));

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_set_paused_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let ds = new_ds_with_admin(ADMIN, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_paused<DappTestKey>(&mut ds, true, ctx);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
fun test_ensure_not_paused_passes_when_not_paused() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    dapp_system::ensure_not_paused<DappTestKey>(&ds);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_not_paused_aborts_when_paused() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);
    dapp_system::set_paused<DappTestKey>(&mut ds, true, &mut ctx);
    dapp_system::ensure_not_paused<DappTestKey>(&ds);
    dapp_service::destroy_dapp_storage(ds);
}

// ═══════════════════════════════════════════════════════════════════════════════
// set_metadata
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_metadata_admin_updates_all_fields() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::set_metadata<DappTestKey>(
        &mut ds,
        string(b"New Name"),
        string(b"New description"),
        string(b"https://example.com"),
        vector::empty(),
        vector::empty(),
        &mut ctx,
    );

    assert!(dapp_metadata::get_name(&ds) == string(b"New Name"));
    assert!(dapp_metadata::get_description(&ds) == string(b"New description"));

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_set_metadata_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let ds = new_ds_with_admin(ADMIN, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_metadata<DappTestKey>(
            &mut ds,
            string(b"Hacked"),
            string(b""),
            string(b""),
            vector::empty(),
            vector::empty(),
            ctx,
        );
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// propose_ownership / accept_ownership
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_propose_ownership_sets_pending_admin() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    assert!(dapp_metadata::get_pending_admin(&ds) == @0x0);
    dapp_system::propose_ownership<DappTestKey>(&mut ds, NOMINEE, &mut ctx);
    assert!(dapp_metadata::get_pending_admin(&ds) == NOMINEE);
    assert!(dapp_metadata::get_admin(&ds) == ctx.sender()); // admin unchanged

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_propose_ownership_can_be_overwritten() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::propose_ownership<DappTestKey>(&mut ds, @0xBEE1, &mut ctx);
    assert!(dapp_metadata::get_pending_admin(&ds) == @0xBEE1);

    // Override with a different nominee — last one wins.
    dapp_system::propose_ownership<DappTestKey>(&mut ds, @0xBEE2, &mut ctx);
    assert!(dapp_metadata::get_pending_admin(&ds) == @0xBEE2);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_propose_zero_address_cancels_pending_transfer() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);

    dapp_system::propose_ownership<DappTestKey>(&mut ds, NOMINEE, &mut ctx);
    assert!(dapp_metadata::get_pending_admin(&ds) == NOMINEE);

    dapp_system::propose_ownership<DappTestKey>(&mut ds, @0x0, &mut ctx);
    assert!(dapp_metadata::get_pending_admin(&ds) == @0x0);

    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_propose_ownership_aborts_for_non_admin() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let ds = new_ds_with_admin(ADMIN, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::propose_ownership<DappTestKey>(&mut ds, ATTACKER, ctx);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
fun test_accept_ownership_two_step_transfer() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&mut ds, NOMINEE, ctx);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, NOMINEE);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_ownership<DappTestKey>(&mut ds, ctx);
        assert!(dapp_metadata::get_admin(&ds) == NOMINEE);
        assert!(dapp_metadata::get_pending_admin(&ds) == @0x0);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_ownership_aborts_when_no_pending_transfer() {
    let mut ctx = sui::tx_context::dummy();
    let mut ds = new_ds(&mut ctx);
    // No pending transfer — must abort.
    dapp_system::accept_ownership<DappTestKey>(&mut ds, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_accept_ownership_aborts_for_wrong_caller() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&mut ds, NOMINEE, ctx);
        transfer::public_share_object(ds);
    };
    // Wrong address tries to accept — must abort.
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::accept_ownership<DappTestKey>(&mut ds, ctx);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ensure_dapp_admin
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_ensure_dapp_admin_passes_for_admin() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    // ctx.sender() is the admin because new_ds() creates storage with ctx.sender() as admin.
    dapp_system::ensure_dapp_admin<DappTestKey>(&ds, ctx.sender());
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_dapp_admin_aborts_for_non_admin() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    // ATTACKER is not the admin — must abort with no_permission_error.
    dapp_system::ensure_dapp_admin<DappTestKey>(&ds, ATTACKER);
    dapp_service::destroy_dapp_storage(ds);
}
