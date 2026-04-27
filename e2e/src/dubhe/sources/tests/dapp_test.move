/// Unit tests — DApp lifecycle operations
///
/// Covers all admin-level DApp management functions:
///   initial_metadata:    default values verified after construction
///   upgrade_dapp:        happy path, non-admin, duplicate package, version not increasing,
///                        large version jump, upgrade while paused, new admin after ownership transfer
///   ensure_latest_version: pass, abort for stale version, abort for future version
///   set_paused:          admin pauses, admin resumes, non-admin abort
///   ensure_not_paused:   pass, abort when paused
///   set_metadata:        admin updates all five fields, non-empty vectors, non-admin abort,
///                        dapp_key mismatch abort, new admin can update after ownership transfer
///   propose_ownership:   sets pending, update overwrites, @0x0 cancels, non-admin abort
///   accept_ownership:    two-step transfer, abort when no pending, abort for wrong caller
///   ensure_dapp_admin:   pass for current admin, abort for non-admin
///
/// Design: single-sender tests use sui::tx_context::dummy() directly.
/// Multi-sender permission tests use test_scenario only where a second sender is needed.
#[test_only]
#[allow(implicit_const_copy)]
module dubhe::dapp_test;

use dubhe::dapp_service::{Self, DappStorage, DappHub};
use dubhe::dapp_system;
use sui::test_scenario;
use std::ascii::string;

public struct DappTestKey  has copy, drop {}
public struct DappOtherKey has copy, drop {}

const ADMIN:    address = @0xAD;
const NOMINEE:  address = @0xBEEF;
const ATTACKER: address = @0xBAD;
const NEW_PKG:  address = @0x9999;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Create a DappHub for version-gating (version = 1 matches FRAMEWORK_VERSION).
fun new_dh(ctx: &mut TxContext): DappHub {
    dapp_system::create_dapp_hub_for_testing(ctx)
}

// Create a DappStorage with ctx.sender() as admin (for single-sender tests).
fun new_ds(ctx: &mut TxContext): DappStorage {
    dapp_system::create_dapp_storage_for_testing<DappTestKey>(ctx)
}

// Create a DappStorage with a specific admin (for multi-sender tests).
fun new_ds_with_admin(admin: address, ctx: &mut TxContext): DappStorage {
    dapp_service::new_dapp_storage<DappTestKey>(
        string(b"Test DApp"),
        string(b""),
        vector[dubhe::type_info::get_package_id<DappTestKey>()],
        0,
        admin,
        0,
        0,
        0,
        0,
        0,
        0,
        ctx,
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// upgrade_dapp
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_upgrade_dapp_happy_path() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    assert!(dapp_service::dapp_version(&ds) == 1);
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    assert!(dapp_service::dapp_version(&ds) == 2);
    assert!(dapp_service::dapp_package_ids(&ds).contains(&NEW_PKG));

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_upgrade_dapp_multiple_times() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, @0xAAA, 2, &mut ctx);
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, @0xBBB, 3, &mut ctx);

    assert!(dapp_service::dapp_version(&ds) == 3);
    let ids = dapp_service::dapp_package_ids(&ds);
    assert!(ids.contains(&@0xAAA));
    assert!(ids.contains(&@0xBBB));

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
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
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, ctx);
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_for_duplicate_package_id() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    // Same package ID again must abort.
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 3, &mut ctx);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_when_version_equal() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    // Current version is 1; passing 1 must abort.
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 1, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_upgrade_dapp_aborts_when_version_decreasing() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, @0xA1, 5, &mut ctx);
    // Passing an older version must also abort.
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, @0xA2, 3, &mut ctx);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_upgrade_dapp_large_version_jump() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    // v1 → v100: large jumps are valid as long as the version increases.
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 100, &mut ctx);
    assert!(dapp_service::dapp_version(&ds) == 100);
    assert!(dapp_service::dapp_package_ids(&ds).contains(&NEW_PKG));

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_upgrade_dapp_while_paused() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    // Admin pauses the DApp first.
    dapp_system::set_paused<DappTestKey>(&dh, &mut ds, true, &mut ctx);
    assert!(dapp_service::dapp_paused(&ds));

    // Admin can still upgrade even while the DApp is paused.
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    assert!(dapp_service::dapp_version(&ds) == 2);
    assert!(dapp_service::dapp_paused(&ds)); // still paused after upgrade

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_upgrade_dapp_new_admin_can_upgrade() {
    // After a two-step ownership transfer, the new admin must be able to upgrade.
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, ctx);
        dapp_system::destroy_dapp_hub(dh);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, NOMINEE);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::accept_ownership<DappTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::dapp_admin(&ds) == NOMINEE);

        // New admin upgrades successfully.
        dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, ctx);
        assert!(dapp_service::dapp_version(&ds) == 2);
        dapp_system::destroy_dapp_hub(dh);
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
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::ensure_latest_version<DappTestKey>(&ds, 1);
    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    dapp_system::ensure_latest_version<DappTestKey>(&ds, 2);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_ensure_latest_version_aborts_for_stale_version() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::upgrade_dapp<DappTestKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    // Old code compiled with version=1 — must abort.
    dapp_system::ensure_latest_version<DappTestKey>(&ds, 1);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
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
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    assert!(!dapp_service::dapp_paused(&ds));

    dapp_system::set_paused<DappTestKey>(&dh, &mut ds, true, &mut ctx);
    assert!(dapp_service::dapp_paused(&ds));

    dapp_system::set_paused<DappTestKey>(&dh, &mut ds, false, &mut ctx);
    assert!(!dapp_service::dapp_paused(&ds));

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
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
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::set_paused<DappTestKey>(&dh, &mut ds, true, ctx);
        dapp_system::destroy_dapp_hub(dh);
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
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    dapp_system::set_paused<DappTestKey>(&dh, &mut ds, true, &mut ctx);
    dapp_system::ensure_not_paused<DappTestKey>(&ds);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// initial_metadata
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_initial_metadata_values() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);

    // Verify all metadata defaults set by create_dapp_storage_for_testing.
    assert!(dapp_service::dapp_name(&ds) == string(b"Test DApp"));
    assert!(dapp_service::dapp_description(&ds) == string(b""));
    assert!(dapp_service::dapp_website_url(&ds) == string(b""));
    assert!(dapp_service::dapp_cover_url(&ds).is_empty());
    assert!(dapp_service::dapp_partners(&ds).is_empty());
    assert!(dapp_service::dapp_version(&ds) == 1);
    assert!(!dapp_service::dapp_paused(&ds));
    assert!(dapp_service::dapp_admin(&ds) == ctx.sender());
    assert!(dapp_service::dapp_pending_admin(&ds) == @0x0);

    dapp_service::destroy_dapp_storage(ds);
}

// ═══════════════════════════════════════════════════════════════════════════════
// set_metadata
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_set_metadata_admin_updates_all_fields() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::set_metadata<DappTestKey>(
        &dh,
        &mut ds,
        string(b"New Name"),
        string(b"New description"),
        string(b"https://example.com"),
        vector[string(b"https://img.example.com/cover.png")],
        vector[string(b"Obelisk"), string(b"Sui Foundation")],
        &mut ctx,
    );

    assert!(dapp_service::dapp_name(&ds)        == string(b"New Name"));
    assert!(dapp_service::dapp_description(&ds) == string(b"New description"));
    assert!(dapp_service::dapp_website_url(&ds) == string(b"https://example.com"));

    let cover = dapp_service::dapp_cover_url(&ds);
    assert!(cover.length() == 1);
    assert!(*cover.borrow(0) == string(b"https://img.example.com/cover.png"));

    let partners = dapp_service::dapp_partners(&ds);
    assert!(partners.length() == 2);
    assert!(*partners.borrow(0) == string(b"Obelisk"));
    assert!(*partners.borrow(1) == string(b"Sui Foundation"));

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_set_metadata_clears_vectors_to_empty() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    // First set some data.
    dapp_system::set_metadata<DappTestKey>(
        &dh,
        &mut ds,
        string(b"Name"),
        string(b"Desc"),
        string(b"https://example.com"),
        vector[string(b"https://cover.png")],
        vector[string(b"Partner A")],
        &mut ctx,
    );
    assert!(!dapp_service::dapp_cover_url(&ds).is_empty());

    // Then clear vectors back to empty.
    dapp_system::set_metadata<DappTestKey>(
        &dh,
        &mut ds,
        string(b"Name"),
        string(b"Desc"),
        string(b""),
        vector::empty(),
        vector::empty(),
        &mut ctx,
    );
    assert!(dapp_service::dapp_cover_url(&ds).is_empty());
    assert!(dapp_service::dapp_partners(&ds).is_empty());

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_set_metadata_new_admin_can_update_after_ownership_transfer() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, ctx);
        dapp_system::destroy_dapp_hub(dh);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, NOMINEE);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::accept_ownership<DappTestKey>(&dh, &mut ds, ctx);

        // New admin must be able to update metadata.
        dapp_system::set_metadata<DappTestKey>(
            &dh,
            &mut ds,
            string(b"Renamed"),
            string(b"By new admin"),
            string(b""),
            vector::empty(),
            vector::empty(),
            ctx,
        );
        assert!(dapp_service::dapp_name(&ds) == string(b"Renamed"));
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
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
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::set_metadata<DappTestKey>(
            &dh,
            &mut ds,
            string(b"Hacked"),
            string(b""),
            string(b""),
            vector::empty(),
            vector::empty(),
            ctx,
        );
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_set_metadata_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    // DappOtherKey does not match the storage's DappTestKey — must abort.
    dapp_system::set_metadata<DappOtherKey>(
        &dh,
        &mut ds,
        string(b"Wrong Key"),
        string(b""),
        string(b""),
        vector::empty(),
        vector::empty(),
        &mut ctx,
    );
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
// propose_ownership / accept_ownership
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_propose_ownership_sets_pending_admin() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    assert!(dapp_service::dapp_pending_admin(&ds) == @0x0);
    dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, &mut ctx);
    assert!(dapp_service::dapp_pending_admin(&ds) == NOMINEE);
    assert!(dapp_service::dapp_admin(&ds) == ctx.sender()); // admin unchanged

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_propose_ownership_can_be_overwritten() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, @0xBEE1, &mut ctx);
    assert!(dapp_service::dapp_pending_admin(&ds) == @0xBEE1);

    // Override with a different nominee — last one wins.
    dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, @0xBEE2, &mut ctx);
    assert!(dapp_service::dapp_pending_admin(&ds) == @0xBEE2);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
fun test_propose_zero_address_cancels_pending_transfer() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);

    dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, &mut ctx);
    assert!(dapp_service::dapp_pending_admin(&ds) == NOMINEE);

    dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, @0x0, &mut ctx);
    assert!(dapp_service::dapp_pending_admin(&ds) == @0x0);

    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
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
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, ATTACKER, ctx);
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
fun test_accept_ownership_two_step_transfer() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, ctx);
        dapp_system::destroy_dapp_hub(dh);
        transfer::public_share_object(ds);
    };
    test_scenario::next_tx(&mut scenario, NOMINEE);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::accept_ownership<DappTestKey>(&dh, &mut ds, ctx);
        assert!(dapp_service::dapp_admin(&ds) == NOMINEE);
        assert!(dapp_service::dapp_pending_admin(&ds) == @0x0);
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

#[test]
#[expected_failure]
fun test_accept_ownership_aborts_when_no_pending_transfer() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    // No pending transfer — must abort.
    dapp_system::accept_ownership<DappTestKey>(&dh, &mut ds, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_accept_ownership_aborts_for_wrong_caller() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        let mut ds = new_ds_with_admin(ADMIN, ctx);
        dapp_system::propose_ownership<DappTestKey>(&dh, &mut ds, NOMINEE, ctx);
        dapp_system::destroy_dapp_hub(dh);
        transfer::public_share_object(ds);
    };
    // Wrong address tries to accept — must abort.
    test_scenario::next_tx(&mut scenario, ATTACKER);
    {
        let mut ds: DappStorage = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dh = dapp_system::create_dapp_hub_for_testing(ctx);
        dapp_system::accept_ownership<DappTestKey>(&dh, &mut ds, ctx);
        dapp_system::destroy_dapp_hub(dh);
        test_scenario::return_shared(ds);
    };
    scenario.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// dapp_key mismatch guards (upgrade_dapp / set_paused / ensure_* / propose / accept)
// ═══════════════════════════════════════════════════════════════════════════════

// Note on upgrade_dapp package-ID semantics:
//   upgrade_dapp validates that the caller's DappKey belongs to a package already
//   registered in dapp_storage.package_ids, OR that its package ID equals new_package_id
//   (allowing a freshly upgraded package to call upgrade_dapp for the first time).
//   This is intentionally a package-level check — any type defined in a registered
//   package is a valid DappKey. DappTestKey and DappOtherKey share the same package ID
//   because they are defined in the same test module, so both can call upgrade_dapp on
//   storage whose package_ids list already contains that package ID.
//   Cross-package mismatch (a completely foreign package attempting to call upgrade_dapp)
//   cannot be simulated within a single test module; that protection is enforced at the
//   package boundary by the package-ID containment check.
#[test]
fun test_upgrade_dapp_succeeds_for_same_package_different_key_type() {
    // DappOtherKey is in the same package as DappTestKey; under the new package-ID-
    // based validation, upgrade_dapp should succeed because get_package_id<DappOtherKey>()
    // matches the package ID already stored in dapp_storage.package_ids.
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    dapp_system::upgrade_dapp<DappOtherKey>(&dh, &mut ds, NEW_PKG, 2, &mut ctx);
    assert!(dapp_service::dapp_version(&ds) == 2);
    assert!(dapp_service::dapp_package_ids(&ds).contains(&NEW_PKG));
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_set_paused_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    dapp_system::set_paused<DappOtherKey>(&dh, &mut ds, true, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_propose_ownership_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    dapp_system::propose_ownership<DappOtherKey>(&dh, &mut ds, NOMINEE, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_accept_ownership_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let dh = new_dh(&mut ctx);
    let mut ds = new_ds(&mut ctx);
    dapp_system::accept_ownership<DappOtherKey>(&dh, &mut ds, &mut ctx);
    dapp_service::destroy_dapp_storage(ds);
    dapp_system::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_ensure_latest_version_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    dapp_system::ensure_latest_version<DappOtherKey>(&ds, 1);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_not_paused_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    dapp_system::ensure_not_paused<DappOtherKey>(&ds);
    dapp_service::destroy_dapp_storage(ds);
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
    // ATTACKER is not the admin — must abort with no_permission.
    dapp_system::ensure_dapp_admin<DappTestKey>(&ds, ATTACKER);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
#[expected_failure]
fun test_ensure_dapp_admin_aborts_for_dapp_key_mismatch() {
    let mut ctx = sui::tx_context::dummy();
    let ds = new_ds(&mut ctx);
    dapp_system::ensure_dapp_admin<DappOtherKey>(&ds, ctx.sender());
    dapp_service::destroy_dapp_storage(ds);
}
