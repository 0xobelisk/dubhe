/// Lifecycle unit tests for dapp_system:
///
/// Covers:
///   - upgrade_dapp happy path (package_ids extended, version bumped)
///   - upgrade_dapp aborts when caller is not the DApp admin
///   - upgrade_dapp aborts when new_package_id is already registered
///   - upgrade_dapp aborts when new_version is not strictly greater
///   - ensure_latest_version passes when version matches
///   - ensure_latest_version aborts when version is stale
///   - set_pausable true (admin pauses DApp)
///   - set_pausable false (admin resumes DApp)
///   - set_pausable aborts when caller is not the DApp admin
///   - ensure_not_pausable passes when DApp is not paused
///   - ensure_not_pausable aborts when DApp is paused
///   - set_metadata admin success (name updated)
///   - set_metadata aborts when caller is not the DApp admin
#[test_only]
module dubhe::dapp_lifecycle_test;

use dubhe::dapp_service::{Self, DappHub};
use dubhe::dapp_system;
use dubhe::dapp_metadata;
use dubhe::type_info;
use dubhe::init_test;
use sui::test_scenario;
use sui::clock;
use std::ascii::string;

// ─── Test DApp key ────────────────────────────────────────────────────────────

public struct LifecycleKey has copy, drop {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Build a DappHub with the full framework genesis and LifecycleKey DApp registered.
/// The deployer (ctx.sender()) becomes both the framework admin and the DApp admin.
fun setup(scenario: &mut test_scenario::Scenario): DappHub {
    let mut dh = init_test::deploy_dapp_for_testing(scenario);
    let ctx = test_scenario::ctx(scenario);
    let clk = clock::create_for_testing(ctx);
    dapp_system::create_dapp<LifecycleKey>(
        &mut dh,
        LifecycleKey {},
        string(b"Lifecycle DApp"),
        string(b"DApp used in lifecycle unit tests"),
        &clk,
        ctx
    );
    clock::destroy_for_testing(clk);
    dh
}

/// A fake package ID that is guaranteed not to be in the initial package_ids list.
/// upgrade_dapp checks that new_package_id is not already registered, so any
/// address that differs from the DApp's initial package ID is valid for testing.
const FAKE_NEW_PACKAGE_ID: address = @0x9999;

// ─── upgrade_dapp tests ───────────────────────────────────────────────────────

/// Happy path: upgrade_dapp extends package_ids and increments the version.
#[test]
public fun test_upgrade_dapp_happy_path() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();

        // Version is 1 after create_dapp.
        assert!(dapp_metadata::get_version(&dh, dapp_key) == 1);

        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 2, ctx);

        // Version must be bumped; new package ID must appear in package_ids.
        assert!(dapp_metadata::get_version(&dh, dapp_key) == 2);
        let ids = dapp_metadata::get_package_ids(&dh, dapp_key);
        assert!(ids.contains(&FAKE_NEW_PACKAGE_ID));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// upgrade_dapp aborts when the caller is not the DApp admin.
#[test]
#[expected_failure]
public fun test_upgrade_dapp_aborts_for_non_admin() {
    let admin    = @0xAD;
    let attacker = @0xBAD;
    let mut scenario = test_scenario::begin(admin);

    // Tx 1: register the DApp and share the hub.
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let clk = clock::create_for_testing(ctx);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_system::create_dapp<LifecycleKey>(
            &mut dh, LifecycleKey {},
            string(b"Lifecycle DApp"), string(b"desc"), &clk, ctx
        );
        clock::destroy_for_testing(clk);
        transfer::public_share_object(dh);
    };

    // Tx 2: attacker tries to upgrade — must abort.
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let mut dh: DappHub = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 2, ctx);
        test_scenario::return_shared(dh);
    };
    scenario.end();
}

/// upgrade_dapp aborts when the new_package_id is already in the registered list.
#[test]
#[expected_failure]
public fun test_upgrade_dapp_aborts_for_duplicate_package_id() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Register FAKE_NEW_PACKAGE_ID for the first time — this should succeed.
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 2, ctx);

        // Attempt to register the same package ID again — must abort.
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 3, ctx);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// upgrade_dapp aborts when new_version is not strictly greater than current.
#[test]
#[expected_failure]
public fun test_upgrade_dapp_aborts_when_version_not_increasing() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Current version is 1; passing the same version must abort.
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 1, ctx);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── ensure_latest_version tests ─────────────────────────────────────────────

/// ensure_latest_version passes when the provided version matches on-chain.
#[test]
public fun test_ensure_latest_version_passes_for_current_version() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // On-chain version is 1 after create_dapp.
        // ensure_latest_version(dh, 1) must not abort.
        dapp_system::ensure_latest_version<LifecycleKey>(&dh, 1);

        // After upgrading to v2, ensure_latest_version(dh, 2) must also pass.
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 2, ctx);
        dapp_system::ensure_latest_version<LifecycleKey>(&dh, 2);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// ensure_latest_version aborts when the provided version is stale (old package).
#[test]
#[expected_failure]
public fun test_ensure_latest_version_aborts_for_stale_version() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Upgrade the DApp to v2 on-chain.
        dapp_system::upgrade_dapp<LifecycleKey>(&mut dh, FAKE_NEW_PACKAGE_ID, 2, ctx);

        // An old package compiled with ON_CHAIN_VERSION=1 calls ensure_latest_version(dh, 1).
        // Must abort: the on-chain version is now 2.
        dapp_system::ensure_latest_version<LifecycleKey>(&dh, 1);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── set_pausable / ensure_not_pausable tests ─────────────────────────────────

/// Admin can pause a DApp; pausable flag is set to true.
#[test]
public fun test_set_pausable_true_succeeds_for_admin() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();

        // DApp is not paused by default.
        assert!(!dapp_metadata::get_pausable(&dh, dapp_key));

        dapp_system::set_pausable(&mut dh, dapp_key, true, ctx);

        assert!(dapp_metadata::get_pausable(&dh, dapp_key));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// Admin can resume a paused DApp; pausable flag is set back to false.
#[test]
public fun test_set_pausable_false_resumes_dapp() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();

        // Pause first.
        dapp_system::set_pausable(&mut dh, dapp_key, true, ctx);
        assert!(dapp_metadata::get_pausable(&dh, dapp_key));

        // Resume.
        dapp_system::set_pausable(&mut dh, dapp_key, false, ctx);
        assert!(!dapp_metadata::get_pausable(&dh, dapp_key));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// set_pausable aborts when called by a non-admin address.
#[test]
#[expected_failure]
public fun test_set_pausable_aborts_for_non_admin() {
    let admin    = @0xAD;
    let attacker = @0xBAD;
    let mut scenario = test_scenario::begin(admin);

    // Tx 1: register DApp and share hub.
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let clk = clock::create_for_testing(ctx);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_system::create_dapp<LifecycleKey>(
            &mut dh, LifecycleKey {},
            string(b"Lifecycle DApp"), string(b"desc"), &clk, ctx
        );
        clock::destroy_for_testing(clk);
        transfer::public_share_object(dh);
    };

    // Tx 2: attacker tries to pause — must abort.
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let mut dh: DappHub = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();
        dapp_system::set_pausable(&mut dh, dapp_key, true, ctx);
        test_scenario::return_shared(dh);
    };
    scenario.end();
}

/// ensure_not_pausable does not abort when the DApp is running (not paused).
#[test]
public fun test_ensure_not_pausable_passes_when_running() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let dh = setup(&mut scenario);

        // DApp is not paused by default — this must not abort.
        dapp_system::ensure_not_pausable<LifecycleKey>(&dh);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// ensure_not_pausable aborts when the DApp has been paused.
#[test]
#[expected_failure]
public fun test_ensure_not_pausable_aborts_when_paused() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();

        // Admin pauses the DApp.
        dapp_system::set_pausable(&mut dh, dapp_key, true, ctx);

        // Any entry function guarded by ensure_not_pausable must now abort.
        dapp_system::ensure_not_pausable<LifecycleKey>(&dh);

        dapp_service::destroy(dh);
    };
    scenario.end();
}

// ─── set_metadata tests ───────────────────────────────────────────────────────

/// Admin can update DApp metadata (name, description, website, cover, partners).
#[test]
public fun test_set_metadata_admin_success() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let mut dh = setup(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();

        // Default name set at create_dapp time.
        assert!(dapp_metadata::get_name(&dh, dapp_key) == string(b"Lifecycle DApp"));

        dapp_system::set_metadata(
            &mut dh,
            dapp_key,
            string(b"Lifecycle DApp v2"),
            string(b"Updated description"),
            string(b"https://example.com"),
            vector::empty(),
            vector::empty(),
            ctx
        );

        assert!(dapp_metadata::get_name(&dh, dapp_key) == string(b"Lifecycle DApp v2"));
        assert!(dapp_metadata::get_description(&dh, dapp_key) == string(b"Updated description"));
        assert!(dapp_metadata::get_website_url(&dh, dapp_key) == string(b"https://example.com"));

        dapp_service::destroy(dh);
    };
    scenario.end();
}

/// set_metadata aborts when called by a non-admin address.
#[test]
#[expected_failure]
public fun test_set_metadata_aborts_for_non_admin() {
    let admin    = @0xAD;
    let attacker = @0xBAD;
    let mut scenario = test_scenario::begin(admin);

    // Tx 1: register DApp and share hub.
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let clk = clock::create_for_testing(ctx);
        let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
        dapp_system::create_dapp<LifecycleKey>(
            &mut dh, LifecycleKey {},
            string(b"Lifecycle DApp"), string(b"desc"), &clk, ctx
        );
        clock::destroy_for_testing(clk);
        transfer::public_share_object(dh);
    };

    // Tx 2: attacker tries to update metadata — must abort.
    test_scenario::next_tx(&mut scenario, attacker);
    {
        let mut dh: DappHub = test_scenario::take_shared(&scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let dapp_key = type_info::get_type_name_string<LifecycleKey>();
        dapp_system::set_metadata(
            &mut dh, dapp_key,
            string(b"Hacked Name"), string(b""), string(b""),
            vector::empty(), vector::empty(),
            ctx
        );
        test_scenario::return_shared(dh);
    };
    scenario.end();
}
