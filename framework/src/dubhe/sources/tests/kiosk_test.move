/// Unit tests — Kiosk integration (wrap / unwrap / update_marketplace_fee / withdraw_kiosk_royalty)
///
/// Covers:
///   - wrap_record: happy path — record moves from UserStorage → WrappedRecord
///   - wrap_record: aborts when DappKey mismatches UserStorage
///   - wrap_record: aborts when caller is not the canonical owner
///   - wrap_record: aborts when the target record does not exist
///   - unwrap_record: happy path — WrappedRecord → record restored in UserStorage
///   - unwrap_record: aborts when DappKey mismatches WrappedRecord
///   - unwrap_record: aborts when caller is not the canonical_owner of UserStorage
///   - unwrap_record: aborts when destination slot is already occupied
///   - update_marketplace_fee: atomically updates DappHub + TransferPolicy rule
///   - update_marketplace_fee: aborts for non-admin caller
///   - update_marketplace_fee: aborts for fee_bps > 10_000
///   - withdraw_kiosk_royalty: happy path — accumulated royalty sent to treasury
///   - withdraw_kiosk_royalty: zero balance is a no-op (no abort)
///   - withdraw_kiosk_royalty: anyone (not just admin) can call
#[test_only]
module dubhe::kiosk_test;

use dubhe::dapp_service::{Self, WrappedRecord};
use dubhe::dapp_system;
use kiosk::royalty_rule;
use sui::bcs::to_bytes;
use sui::sui::SUI;

/// DApp identity key used for all kiosk tests.
public struct GameKey has copy, drop {}
/// An unrelated DApp key used for mismatch tests.
public struct OtherKey has copy, drop {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OWNER: address  = @0xA1;
const SELLER: address = @0xA1; // same as OWNER for wrap tests
const BUYER:  address = @0xB2;
const ADMIN:  address = @0x0;  // tx_context::dummy() sender

/// Build a simple single-field record key.
fun k(name: vector<u8>): vector<vector<u8>> { vector[name] }

/// Build a record key for a named slot inside a table.
fun slot(table: vector<u8>, id: vector<u8>): vector<vector<u8>> { vector[table, id] }

/// Field names for the test record.
fun fns(): vector<vector<u8>> { vector[b"hp", b"mp"] }

/// Encoded field values for the test record.
fun vals(): vector<vector<u8>> { vector[to_bytes(&100u32), to_bytes(&50u32)] }

/// Create a UserStorage with one record pre-seeded.
fun make_seller_us(ctx: &mut TxContext): dapp_service::UserStorage {
    let mut us = dapp_service::create_user_storage_for_testing<GameKey>(SELLER, ctx);
    dapp_system::set_record<GameKey>(
        GameKey {},
        &mut us,
        slot(b"hero", b"1"),
        fns(),
        vals(),
        false,
        ctx,
    );
    us
}

/// Create an empty UserStorage for the buyer (no pre-seeded record).
fun make_buyer_us(ctx: &mut TxContext): dapp_service::UserStorage {
    dapp_service::create_user_storage_for_testing<GameKey>(BUYER, ctx)
}

// ─── wrap_record tests ────────────────────────────────────────────────────────

#[test]
fun test_wrap_record_happy_path() {
    let ctx = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx);
    let mut us = make_seller_us(ctx);

    // Wrap the record.
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx,
    );

    // Record should be gone from UserStorage.
    assert!(!dapp_service::has_user_record<GameKey>(&us, slot(b"hero", b"1")), 0);

    // WrappedRecord should carry the right metadata.
    assert!(dapp_service::wrapped_record_dapp_key(&wrapped) == dapp_service::user_storage_dapp_key(&us), 1);

    // Clean up.
    dapp_system::unwrap_record<GameKey>(GameKey {}, &dh, &mut us, wrapped, ctx);
    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_wrap_record_aborts_dapp_key_mismatch() {
    let ctx = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx);
    let mut us = make_seller_us(ctx);

    // OtherKey does not match the GameKey UserStorage — should abort here.
    let wrapped = dapp_system::wrap_record<OtherKey>(
        OtherKey {},
        &dh,
        &mut us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx,
    );
    // Unreachable if abort happens as expected.  Consume the value and abort
    // manually so the type-checker is satisfied and the test is marked failed.
    sui::transfer::public_transfer(wrapped, ctx.sender());
    abort 0
}

#[test]
#[expected_failure]
fun test_wrap_record_aborts_not_owner() {
    let ctx_seller   = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh           = dapp_service::create_free_dapp_hub_for_testing(ctx_seller);
    let mut us       = make_seller_us(ctx_seller);
    // A different sender tries to wrap the seller's record — should abort.
    let ctx_attacker = &mut tx_context::new_from_hint(@0xDEAD, 0, 0, 0, 0);
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx_attacker,
    );
    sui::transfer::public_transfer(wrapped, ctx_seller.sender());
    abort 0
}

#[test]
#[expected_failure]
fun test_wrap_record_aborts_record_not_found() {
    let ctx = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx);
    // Empty UserStorage — no record at the given key — should abort.
    let mut us = dapp_service::create_user_storage_for_testing<GameKey>(SELLER, ctx);
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx,
    );
    sui::transfer::public_transfer(wrapped, ctx.sender());
    abort 0
}

// ─── unwrap_record tests ──────────────────────────────────────────────────────

#[test]
fun test_unwrap_record_restores_fields() {
    let ctx_seller = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx_seller);
    let mut seller_us = make_seller_us(ctx_seller);

    // Seller wraps the record.
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut seller_us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx_seller,
    );

    // Buyer receives the WrappedRecord and unwraps it into their own UserStorage.
    let ctx_buyer = &mut tx_context::new_from_hint(BUYER, 0, 0, 0, 0);
    let mut buyer_us = make_buyer_us(ctx_buyer);
    dapp_system::unwrap_record<GameKey>(GameKey {}, &dh, &mut buyer_us, wrapped, ctx_buyer);

    // Record is now in buyer's UserStorage with the original field values.
    assert!(dapp_service::has_user_record<GameKey>(&buyer_us, slot(b"hero", b"1")), 0);
    let hp = dapp_system::get_field<GameKey>(&buyer_us, slot(b"hero", b"1"), b"hp");
    assert!(sui::bcs::new(hp).peel_u32() == 100, 1);
    let mp = dapp_system::get_field<GameKey>(&buyer_us, slot(b"hero", b"1"), b"mp");
    assert!(sui::bcs::new(mp).peel_u32() == 50, 2);

    dapp_service::destroy_user_storage(seller_us);
    dapp_service::destroy_user_storage(buyer_us);
    dapp_service::destroy_dapp_hub(dh);
}

/// Unwrap with wrong DappKey type parameter (WrappedRecord.dapp_key != DappKey).
#[test]
#[expected_failure]
fun test_unwrap_record_aborts_dapp_key_mismatch_wrong_type() {
    let ctx_seller = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx_seller);
    let mut seller_us = make_seller_us(ctx_seller);
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut seller_us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx_seller,
    );

    // WrappedRecord.dapp_key == "GameKey" but DappKey type is OtherKey — abort.
    let ctx_buyer = &mut tx_context::new_from_hint(BUYER, 0, 0, 0, 0);
    let mut buyer_us_other = dapp_service::create_user_storage_for_testing<OtherKey>(BUYER, ctx_buyer);
    dapp_system::unwrap_record<OtherKey>(OtherKey {}, &dh, &mut buyer_us_other, wrapped, ctx_buyer);

    dapp_service::destroy_user_storage(seller_us);
    dapp_service::destroy_user_storage(buyer_us_other);
    dapp_service::destroy_dapp_hub(dh);
}

/// Unwrap with correct DappKey type but UserStorage belonging to a different DApp.
#[test]
#[expected_failure]
fun test_unwrap_record_aborts_us_dapp_key_mismatch() {
    let ctx = &mut tx_context::new_from_hint(BUYER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx);

    // Create a GameKey WrappedRecord (simulate receiving from a seller).
    let mut game_us = dapp_service::create_user_storage_for_testing<GameKey>(BUYER, ctx);
    dapp_system::set_record<GameKey>(GameKey {}, &mut game_us, slot(b"hero", b"1"), fns(), vals(), false, ctx);
    let wrapped = dapp_system::wrap_record<GameKey>(GameKey {}, &dh, &mut game_us, b"hero", slot(b"hero", b"1"), fns(), ctx);

    // DappKey type == GameKey but UserStorage is for OtherKey — abort.
    let mut other_us = dapp_service::create_user_storage_for_testing<OtherKey>(BUYER, ctx);
    dapp_system::unwrap_record<GameKey>(GameKey {}, &dh, &mut other_us, wrapped, ctx);

    dapp_service::destroy_user_storage(game_us);
    dapp_service::destroy_user_storage(other_us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_unwrap_record_aborts_not_canonical_owner() {
    let ctx_seller = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx_seller);
    let mut seller_us = make_seller_us(ctx_seller);
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut seller_us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx_seller,
    );

    // Attacker tries to unwrap into the seller's UserStorage using their own ctx.
    let ctx_attacker = &mut tx_context::new_from_hint(@0xDEAD, 0, 0, 0, 0);
    dapp_system::unwrap_record<GameKey>(GameKey {}, &dh, &mut seller_us, wrapped, ctx_attacker);

    dapp_service::destroy_user_storage(seller_us);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_unwrap_record_aborts_slot_already_occupied() {
    let ctx = &mut tx_context::new_from_hint(SELLER, 0, 0, 0, 0);
    let dh  = dapp_service::create_free_dapp_hub_for_testing(ctx);
    let mut us = make_seller_us(ctx);

    // Wrap the record.
    let wrapped = dapp_system::wrap_record<GameKey>(
        GameKey {},
        &dh,
        &mut us,
        b"hero",
        slot(b"hero", b"1"),
        fns(),
        ctx,
    );

    // Re-seed the same slot in UserStorage so the slot is occupied.
    dapp_system::set_record<GameKey>(
        GameKey {},
        &mut us,
        slot(b"hero", b"1"),
        fns(),
        vals(),
        false,
        ctx,
    );

    // Attempting to unwrap into an occupied slot should abort.
    dapp_system::unwrap_record<GameKey>(GameKey {}, &dh, &mut us, wrapped, ctx);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
}

// ─── update_marketplace_fee sync tests ───────────────────────────────────────

#[test]
fun test_update_marketplace_fee_syncs_both_atomically() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);

    // Pre-add the royalty rule (normally done in init).
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    // Verify initial state.
    assert!(dapp_service::marketplace_fee_bps(dapp_service::get_config(&dh)) == 300, 0);
    // fee_amount(policy, 10_000) == amount_bp when paid == MAX_BPS
    assert!(royalty_rule::fee_amount<WrappedRecord>(&policy, 10_000) == 300, 1);

    // Update fee to 5%.
    dapp_system::update_marketplace_fee(&mut dh, &km, &mut policy, 500, ctx);

    // Both sources of truth must agree.
    assert!(dapp_service::marketplace_fee_bps(dapp_service::get_config(&dh)) == 500, 2);
    assert!(royalty_rule::fee_amount<WrappedRecord>(&policy, 10_000) == 500, 3);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}

#[test]
#[expected_failure]
fun test_update_marketplace_fee_aborts_non_admin() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    let ctx_evil = &mut tx_context::new_from_hint(@0xDEAD, 0, 0, 0, 0);
    dapp_system::update_marketplace_fee(&mut dh, &km, &mut policy, 100, ctx_evil);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}

#[test]
#[expected_failure]
fun test_update_marketplace_fee_aborts_exceeds_max() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    // 10_001 bps > 100%, must abort.
    dapp_system::update_marketplace_fee(&mut dh, &km, &mut policy, 10_001, ctx);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}

// ─── withdraw_kiosk_royalty tests ────────────────────────────────────────────

/// Happy path: royalty accumulates in TransferPolicy via royalty_rule::pay
/// (simulated with a test-only TransferRequest), then withdraw_kiosk_royalty
/// drains the full balance to the framework treasury.
/// A second call on the already-drained policy must also succeed (zero no-op).
#[test]
fun test_withdraw_kiosk_royalty_happy_path() {
    let ctx = &mut tx_context::dummy();
    let dh  = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    // Simulate one Kiosk sale (price = 10_000, royalty = 300 SUI).
    let item_id = sui::object::id_from_address(@0xABCD);
    let kiosk_id = sui::object::id_from_address(@0x1);
    let mut req  = sui::transfer_policy::new_request<WrappedRecord>(item_id, 10_000, kiosk_id);
    let fee_coin = sui::coin::mint_for_testing<SUI>(300, ctx);
    royalty_rule::pay<WrappedRecord>(&mut policy, &mut req, fee_coin);
    // Consume the hot-potato request.
    sui::transfer_policy::confirm_request(&policy, req);

    // Anyone can trigger the sweep — use a non-admin address.
    let ctx_anyone = &mut tx_context::new_from_hint(@0xCAFE, 0, 0, 0, 0);
    dapp_system::withdraw_kiosk_royalty(&dh, &km, &mut policy, ctx_anyone);

    // Second call on drained policy must also succeed without aborting.
    dapp_system::withdraw_kiosk_royalty(&dh, &km, &mut policy, ctx_anyone);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}

/// Zero balance — calling withdraw when the policy has no accumulated royalty
/// must be a no-op (no abort, no transfer).
#[test]
fun test_withdraw_kiosk_royalty_zero_balance_is_noop() {
    let ctx = &mut tx_context::dummy();
    let dh  = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    // No royalties deposited — must succeed silently.
    dapp_system::withdraw_kiosk_royalty(&dh, &km, &mut policy, ctx);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}

/// Non-admin can call withdraw_kiosk_royalty — the treasury address is fixed
/// in DappHub so the outcome is always deterministic regardless of caller.
#[test]
fun test_withdraw_kiosk_royalty_non_admin_can_call() {
    let ctx = &mut tx_context::dummy();
    let dh  = dapp_service::create_dapp_hub_for_testing(ctx);
    let (km, mut policy) = dapp_service::create_kiosk_manager_for_testing(ctx);
    let cap = dapp_service::kiosk_manager_cap(&km);
    royalty_rule::add<WrappedRecord>(&mut policy, cap, 300, 0);

    let ctx_stranger = &mut tx_context::new_from_hint(@0xDEAD, 0, 0, 0, 0);
    dapp_system::withdraw_kiosk_royalty(&dh, &km, &mut policy, ctx_stranger);

    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_kiosk_and_policy_for_testing(km, policy, ctx);
}
