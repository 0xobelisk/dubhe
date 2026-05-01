/// Unit tests — Listing market protocol
///
/// Covers:
///   - new_listing / destroy_listing / share_listing
///   - is_listing_expired
///   - take_record / restore_record (cancel / buy listing)
///   - take_fungible_record (partial fungible listing)
///   - buy_record (unique item purchase — buyer != seller)
///   - buy_fungible_record (fungible purchase — adds to buyer balance)
///   - restore_record by non-seller aborts
///   - restore_record on fungible listing aborts (must use cancel_fungible_listing)
///   - expire_listing (anyone can call once expired)
///   - expire_listing cross-DApp seller_storage aborts
///   - cancel_fungible_listing (ADDS listed amount back — no overwrite)
///   - expire_fungible_listing (ADDS listed amount back — no overwrite)
///   - buy_record self-trade aborts (buyer == seller)
#[test_only]
module dubhe::listing_test;

use dubhe::dapp_service::{Self, UserStorage};
use dubhe::dapp_system;
use sui::bcs::to_bytes;
use sui::sui::SUI;

public struct ListKey has copy, drop {}
/// A second DApp key used to test cross-DApp rejection.
public struct OtherDappKey has copy, drop {}

// ─── Module-level constants for security tests ────────────────────────────────
const LISTING_OWNER:   address = @0xA1;
const LISTING_SESSION: address = @0xA2;
const LISTING_ADMIN:   address = @0xC1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fun make_us(owner: address, ctx: &mut TxContext): UserStorage {
    dapp_service::create_user_storage_for_testing<ListKey>(owner, ctx)
}

fun weapon_key(item_id: u64): vector<vector<u8>> {
    vector[b"weapon", to_bytes(&item_id)]
}
fun weapon_fields(): vector<vector<u8>> { vector[b"damage", b"rarity"] }
fun weapon_values(dmg: u64, rar: u8): vector<vector<u8>> {
    vector[to_bytes(&dmg), to_bytes(&rar)]
}

fun gold_key(): vector<vector<u8>> { vector[b"gold"] }

fun set_gold(us: &mut UserStorage, amount: u64, ctx: &mut TxContext) {
    dapp_system::set_record<ListKey>(
        ListKey {},
        us,
        gold_key(),
        vector[b"amount"],
        vector[to_bytes(&amount)],
        false,
        ctx,
    );
}

fun read_gold(us: &UserStorage): u64 {
    let bytes = dapp_service::get_user_field<ListKey>(us, gold_key(), b"amount");
    let mut bcs = sui::bcs::new(bytes);
    bcs.peel_u64()
}

// ─── is_listing_expired ───────────────────────────────────────────────────────

#[test]
fun test_listing_not_expired_with_none() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let listing = dapp_service::new_listing<SUI>(
        vector[],
        b"weapon",
        weapon_key(1),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    assert!(!dapp_service::is_listing_expired(&listing, 999_999_999), 0);

    let (_, _, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dapp_service::destroy_user_storage(us);
}

#[test]
fun test_listing_expired_past_deadline() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let listing = dapp_service::new_listing<SUI>(
        vector[],
        b"weapon",
        weapon_key(2),
        weapon_fields(),
        seller,
        200,
        0,
        std::option::some(1_000_000u64),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    assert!(!dapp_service::is_listing_expired(&listing, 999_999), 0);
    assert!(dapp_service::is_listing_expired(&listing, 1_000_000), 1);
    assert!(dapp_service::is_listing_expired(&listing, 1_000_001), 2);

    let (_, _, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dapp_service::destroy_user_storage(us);
}

// ─── take_record / restore_record (cancel listing) ────────────────────────────#[test]
fun test_take_record_removes_from_storage() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);

    dapp_system::set_record<ListKey>(
        ListKey {},
        &mut us,
        weapon_key(10),
        weapon_fields(),
        weapon_values(500, 3),
        false,
        &mut ctx,
    );
    assert!(dapp_service::has_user_record<ListKey>(&us, weapon_key(10)), 0);

    dapp_system::take_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"weapon",
        weapon_key(10),
        weapon_fields(),
        500,
        0,
        std::option::none(),
        &mut ctx,
    );

    // Record is removed from user storage after take.
    assert!(!dapp_service::has_user_record<ListKey>(&us, weapon_key(10)), 1);

    dapp_service::destroy_user_storage(us);
}

// ─── expire_listing: must be past deadline ───────────────────────────────────

#[test]
fun test_expire_listing_past_deadline() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // dummy() epoch_timestamp_ms = 0; listed_until = 0 means already expired.
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(200, 2)),
        b"weapon",
        weapon_key(20),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::some(0u64),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    dapp_system::expire_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    assert!(dapp_service::has_user_record<ListKey>(&us, weapon_key(20)), 0);

    dapp_service::destroy_user_storage(us);
}

// ─── restore_record: seller cancels listing ────────────────────────────────────

#[test]
fun test_restore_record_returns_item_to_seller() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);

    // Put item in user storage.
    dapp_system::set_record<ListKey>(
        ListKey {},
        &mut us,
        weapon_key(50),
        weapon_fields(),
        weapon_values(800, 5),
        false,
        &mut ctx,
    );
    assert!(dapp_service::has_user_record<ListKey>(&us, weapon_key(50)), 0);

    // List it — removes from user storage.
    dapp_system::take_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"weapon",
        weapon_key(50),
        weapon_fields(),
        200,
        0,
        std::option::none(),
        &mut ctx,
    );
    assert!(!dapp_service::has_user_record<ListKey>(&us, weapon_key(50)), 1);

    // Reconstruct a Listing manually (simulating what take_record shared).
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(800, 5)),
        b"weapon",
        weapon_key(50),
        weapon_fields(),
        seller,
        200,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // Cancel: seller restores the item.
    dapp_system::restore_record<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    // Item is back.
    assert!(dapp_service::has_user_record<ListKey>(&us, weapon_key(50)), 2);

    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_restore_record_non_seller_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender(); // @0x0
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Listing is owned by seller (@0x0).
    let listing = dapp_service::new_listing<SUI>(
        vector[],
        b"weapon",
        weapon_key(60),
        weapon_fields(),
        @0xABCD, // different seller
        100,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // ctx.sender() == @0x0 but listing.seller == @0xABCD — must abort.
    dapp_system::restore_record<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_expire_listing_not_yet_expired_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let listing = dapp_service::new_listing<SUI>(
        vector[],
        b"weapon",
        weapon_key(30),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::some(999_999_999_999u64),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    dapp_system::expire_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

// ─── take_fungible_record ─────────────────────────────────────────────────────

#[test]
fun test_take_fungible_record_partial_listing() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);

    // Give seller 300 gold.
    set_gold(&mut us, 300, &mut ctx);
    assert!(read_gold(&us) == 300, 0);

    // List only 100 gold.
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"gold",
        gold_key(),
        b"amount",
        100,
        50,
        0,
        std::option::none(),
        &mut ctx,
    );

    // Seller should still have 200 gold.
    assert!(read_gold(&us) == 200, 1);

    dapp_service::destroy_user_storage(us);
}

#[test]
fun test_take_fungible_record_exact_balance_deletes_record() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);

    set_gold(&mut us, 50, &mut ctx);

    // List entire balance — record should be deleted.
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"gold",
        gold_key(),
        b"amount",
        50,
        10,
        0,
        std::option::none(),
        &mut ctx,
    );

    assert!(!dapp_service::has_user_record<ListKey>(&us, gold_key()), 0);
    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_take_fungible_record_insufficient_balance_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);

    set_gold(&mut us, 50, &mut ctx);

    // Try to list 100 gold but only 50 available — must abort.
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"gold",
        gold_key(),
        b"amount",
        100,
        10,
        0,
        std::option::none(),
        &mut ctx,
    );
    dapp_service::destroy_user_storage(us);
}

// ─── buy_record (unique item purchase) ───────────────────────────────────────

#[test]
fun test_buy_record_transfers_item_to_buyer() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();  // @0x0
    let buyer  = @0xBEEF;
    let mut seller_us = make_us(seller, &mut ctx);
    let mut buyer_us  = make_us(buyer, &mut ctx);
    let dapp_key_str  = dapp_service::user_storage_dapp_key(&seller_us);

    // Seller lists a weapon.
    dapp_system::set_record<ListKey>(
        ListKey {},
        &mut seller_us,
        weapon_key(99),
        weapon_fields(),
        weapon_values(1000, 5),
        false,
        &mut ctx,
    );
    assert!(dapp_service::has_user_record<ListKey>(&seller_us, weapon_key(99)), 0);

    // Build a listing manually (simulating take_record + share).
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(1000, 5)),
        b"weapon",
        weapon_key(99),
        weapon_fields(),
        seller,
        500,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // Buyer purchases: ctx.sender() is still seller (@0x0 in dummy ctx),
    // but buyer_us.canonical_owner == @0xBEEF.
    // We need to simulate the buyer's perspective — in tests we directly call
    // buy_record passing buyer_us; the key check is canonical_owner == ctx.sender().
    // For this test we need a ctx where sender == buyer.
    // We use a workaround: create a second dummy ctx with 1 epoch advancement
    // to get a different address, OR we verify the sentinel that buy_record
    // checks canonical_owner == ctx.sender().
    // Since dummy ctx always returns @0x0, we test buy_record with seller @0x0
    // as both seller AND buyer to verify item lands in storage.
    let listing2 = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(1000, 5)),
        b"weapon",
        weapon_key(99),
        weapon_fields(),
        @0x1234, // different seller
        500,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // seller_us.canonical_owner == @0x0 == ctx.sender() — buy_record should succeed.
    dapp_system::buy_record<ListKey, SUI>(ListKey {}, listing2, &mut seller_us, &ctx);
    assert!(dapp_service::has_user_record<ListKey>(&seller_us, weapon_key(99)), 1);

    let (_, _, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dapp_service::destroy_user_storage(seller_us);
    dapp_service::destroy_user_storage(buyer_us);
}

// ─── buy_fungible_record ──────────────────────────────────────────────────────

#[test]
fun test_buy_fungible_record_adds_to_existing_balance() {
    let mut ctx = sui::tx_context::dummy();
    let buyer = ctx.sender();  // @0x0
    let mut buyer_us = make_us(buyer, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&buyer_us);

    // Buyer already has 200 gold.
    set_gold(&mut buyer_us, 200, &mut ctx);

    // Create a listing for 75 gold.
    let record_values = vector[to_bytes(&75u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        @0xABCD, // seller is someone else
        10,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    // Buy: buyer already has 200, adding 75 → should be 275.
    dapp_system::buy_fungible_record<ListKey, SUI>(ListKey {}, listing, &mut buyer_us, &ctx);

    assert!(read_gold(&buyer_us) == 275, 0);

    dapp_service::destroy_user_storage(buyer_us);
}

#[test]
fun test_buy_fungible_record_creates_record_if_buyer_has_none() {
    let mut ctx = sui::tx_context::dummy();
    let buyer = ctx.sender();
    let mut buyer_us = make_us(buyer, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&buyer_us);

    // Buyer has NO gold yet.
    assert!(!dapp_service::has_user_record<ListKey>(&buyer_us, gold_key()), 0);

    let record_values = vector[to_bytes(&100u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        @0xABCD,
        5,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    dapp_system::buy_fungible_record<ListKey, SUI>(ListKey {}, listing, &mut buyer_us, &ctx);

    // Should have exactly 100 gold now.
    assert!(read_gold(&buyer_us) == 100, 1);

    dapp_service::destroy_user_storage(buyer_us);
}

#[test]
#[expected_failure]
fun test_buy_record_expired_listing_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let buyer = ctx.sender();
    let mut buyer_us = make_us(buyer, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&buyer_us);

    // dummy() epoch_timestamp_ms = 0; listed_until = 0 → already expired.
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(100, 1)),
        b"weapon",
        weapon_key(1),
        weapon_fields(),
        @0xABCD,
        100,
        0,
        std::option::some(0u64),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    dapp_system::buy_record<ListKey, SUI>(ListKey {}, listing, &mut buyer_us, &ctx);
    dapp_service::destroy_user_storage(buyer_us);
}

// ─── cancel_fungible_listing: ADDS back (not overwrite) ─────────────────────

#[test]
fun test_cancel_fungible_listing_adds_to_existing_balance() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Seller lists 100 gold (balance decreases from 300 to 200).
    set_gold(&mut us, 300, &mut ctx);
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {},
        &mut us,
        b"gold",
        gold_key(),
        b"amount",
        100,
        50,
        0,
        std::option::none(),
        &mut ctx,
    );
    assert!(read_gold(&us) == 200, 0);

    // Seller later earns another 50 gold while listing is live.
    set_gold(&mut us, 250, &mut ctx);  // directly overwrite to 250

    // Reconstruct the Listing for the 100 gold that was taken.
    let record_values = vector[to_bytes(&100u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        50,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    // Cancel: should ADD 100 back to existing 250, NOT overwrite with 100.
    dapp_system::cancel_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    // 250 + 100 = 350, not 100.
    assert!(read_gold(&us) == 350, 1);

    dapp_service::destroy_user_storage(us);
}

#[test]
fun test_cancel_fungible_listing_creates_record_if_none_exists() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Seller has no gold record at all.
    assert!(!dapp_service::has_user_record<ListKey>(&us, gold_key()), 0);

    // Build listing for 60 gold.
    let record_values = vector[to_bytes(&60u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        5,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    dapp_system::cancel_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    // Seller should now have 60 gold.
    assert!(read_gold(&us) == 60, 1);

    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_cancel_fungible_listing_non_seller_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender(); // @0x0
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let record_values = vector[to_bytes(&50u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        @0xDEAD, // different seller
        5,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    // ctx.sender() == @0x0 but listing.seller == @0xDEAD — must abort.
    dapp_system::cancel_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

// ─── expire_fungible_listing: ADDS back (not overwrite) ─────────────────────

#[test]
fun test_expire_fungible_listing_adds_to_existing_balance() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Seller has 400 gold when listing expires.
    set_gold(&mut us, 400, &mut ctx);

    // Build an already-expired listing for 80 gold.
    let record_values = vector[to_bytes(&80u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        10,
        0,
        std::option::some(0u64), // already expired (epoch_timestamp_ms = 0 in dummy ctx)
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    // Expire: should ADD 80 back to existing 400, NOT overwrite with 80.
    dapp_system::expire_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    // 400 + 80 = 480, not 80.
    assert!(read_gold(&us) == 480, 0);

    dapp_service::destroy_user_storage(us);
}

#[test]
fun test_expire_fungible_listing_creates_record_if_none_exists() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Seller has no gold record.
    assert!(!dapp_service::has_user_record<ListKey>(&us, gold_key()), 0);

    let record_values = vector[to_bytes(&120u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        10,
        0,
        std::option::some(0u64), // already expired
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    dapp_system::expire_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    assert!(read_gold(&us) == 120, 1);

    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_expire_fungible_listing_not_expired_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let record_values = vector[to_bytes(&50u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        5,
        0,
        std::option::some(999_999_999_999u64), // not expired
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    dapp_system::expire_fungible_listing<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

// ─── New: restore_record on fungible listing must abort ───────────────────────

#[test]
#[expected_failure]
fun test_restore_record_on_fungible_listing_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Build a fungible listing (is_fungible = true).
    let record_values = vector[to_bytes(&100u64)];
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&record_values),
        b"gold",
        gold_key(),
        vector[b"amount"],
        seller,
        10,
        0,
        std::option::none(),
        dapp_key_str,
        true, // is_fungible
        &mut ctx,
    );

    // restore_record on a fungible listing must abort.
    // Use cancel_fungible_listing instead.
    dapp_system::restore_record<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

// ─── New: buy_record self-trade must abort ────────────────────────────────────

#[test]
#[expected_failure]
fun test_buy_record_self_trade_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender(); // @0x0
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    // Listing where seller == @0x0 (same as ctx.sender()).
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(500, 3)),
        b"weapon",
        weapon_key(77),
        weapon_fields(),
        seller, // same as ctx.sender()
        100,
        0,
        std::option::none(),
        dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // buyer_storage.canonical_owner == seller — must abort with no_permission.
    dapp_system::buy_record<ListKey, SUI>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

// ─── New: expire_listing cross-DApp seller_storage must abort ─────────────────

#[test]
#[expected_failure]
fun test_expire_listing_cross_dapp_storage_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender(); // @0x0

    // seller_us belongs to ListKey DApp.
    let mut seller_us = make_us(seller, &mut ctx);
    let list_dapp_key_str = dapp_service::user_storage_dapp_key(&seller_us);

    // other_us belongs to OtherDappKey DApp (same owner, different DApp).
    let mut other_us = dapp_service::create_user_storage_for_testing<OtherDappKey>(seller, &mut ctx);

    // Build a listing under ListKey DApp that has already expired.
    let listing = dapp_service::new_listing<SUI>(
        sui::bcs::to_bytes(&weapon_values(300, 2)),
        b"weapon",
        weapon_key(88),
        weapon_fields(),
        seller,
        50,
        0,
        std::option::some(0u64), // already expired
        list_dapp_key_str,
        false, // is_fungible
        &mut ctx,
    );

    // Pass OtherDappKey's UserStorage — must abort with dapp_key_mismatch.
    dapp_system::expire_listing<ListKey, SUI>(ListKey {}, listing, &mut other_us, &ctx);

    dapp_service::destroy_user_storage(seller_us);
    dapp_service::destroy_user_storage(other_us);
}

// ─── Marketplace fee tests ──────────────────────────────────────────────────

#[test]
fun test_marketplace_fee_defaults() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let cfg = dapp_service::get_config(&dh);
    // Default: 3% fee, 50/50 split
    assert!(dapp_service::marketplace_fee_bps(cfg) == 300, 0);
    assert!(dapp_service::marketplace_dapp_share_bps(cfg) == 5_000, 0);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_update_marketplace_fee_by_admin() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    // Framework admin sets fee to 2%
    dapp_system::update_marketplace_fee(&mut dh, 200, ctx);
    assert!(dapp_service::marketplace_fee_bps(dapp_service::get_config(&dh)) == 200, 0);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_update_marketplace_fee_aborts_for_non_admin() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    // Non-admin ctx (tx_context::dummy sender is @0x0, same as admin — use fresh ctx)
    let ctx2 = &mut tx_context::new_from_hint(@0xBEEF, 0, 0, 0, 0);
    dapp_system::update_marketplace_fee(&mut dh, 200, ctx2);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
#[expected_failure]
fun test_update_marketplace_fee_aborts_for_over_10000() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    dapp_system::update_marketplace_fee(&mut dh, 10_001, ctx);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_update_marketplace_dapp_share_by_admin() {
    let ctx = &mut tx_context::dummy();
    let mut dh = dapp_service::create_dapp_hub_for_testing(ctx);
    dapp_system::update_marketplace_dapp_share(&mut dh, 7_000, ctx);
    assert!(dapp_service::marketplace_dapp_share_bps(dapp_service::get_config(&dh)) == 7_000, 0);
    dapp_service::destroy_dapp_hub(dh);
}

#[test]
fun test_effective_marketplace_fee_uses_global_default() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let ds = dapp_service::create_dapp_storage_for_testing<ListKey>(ctx);
    // No override set — should return global default (300)
    let fee = dapp_system::effective_marketplace_fee_bps<ListKey>(&dh, &ds);
    assert!(fee == 300, 0);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_effective_marketplace_fee_uses_per_dapp_override() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(ctx);
    // Framework admin sets override to 1%
    dapp_system::set_dapp_marketplace_fee_override<ListKey>(&dh, &mut ds, std::option::some(100), ctx);
    let fee = dapp_system::effective_marketplace_fee_bps<ListKey>(&dh, &ds);
    assert!(fee == 100, 0);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_clear_per_dapp_override_reverts_to_global() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(ctx);
    dapp_system::set_dapp_marketplace_fee_override<ListKey>(&dh, &mut ds, std::option::some(100), ctx);
    // Clear override
    dapp_system::set_dapp_marketplace_fee_override<ListKey>(&dh, &mut ds, std::option::none(), ctx);
    let fee = dapp_system::effective_marketplace_fee_bps<ListKey>(&dh, &ds);
    assert!(fee == 300, 0); // back to global default
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_settle_marketplace_fee_splits_correctly() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(ctx);
    // fee = 100 SUI, 50/50 split => 50 to framework treasury, 50 to DApp
    let fee_coin = sui::coin::mint_for_testing<sui::sui::SUI>(100, ctx);
    dapp_system::settle_marketplace_fee<ListKey, sui::sui::SUI>(
        ListKey {}, &dh, &mut ds, fee_coin, ctx
    );
    // DApp revenue should now have 50
    assert!(dapp_service::dapp_revenue_balance<sui::sui::SUI>(&ds) == 50, 0);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

#[test]
fun test_settle_marketplace_fee_zero_is_noop() {
    let ctx = &mut tx_context::dummy();
    let dh = dapp_service::create_dapp_hub_for_testing(ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(ctx);
    let fee_coin = sui::coin::mint_for_testing<sui::sui::SUI>(0, ctx);
    dapp_system::settle_marketplace_fee<ListKey, sui::sui::SUI>(
        ListKey {}, &dh, &mut ds, fee_coin, ctx
    );
    assert!(dapp_service::dapp_revenue_balance<sui::sui::SUI>(&ds) == 0, 0);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

// ─── Session key cannot create listings ───────────────────────────────────────

/// A session key must NOT be able to list items. Listing is a high-privilege
/// asset-ownership transfer that requires the canonical wallet owner.
#[test]
#[expected_failure]
fun test_take_record_session_key_aborts() {
    // Sender is LISTING_SESSION, but UserStorage canonical owner is LISTING_OWNER.
    let mut ctx = tx_context::new_from_hint(LISTING_SESSION, 0, 0, 0, 0);
    let mut us = make_us(LISTING_OWNER, &mut ctx);
    // Activate session key so is_write_authorized would pass — but canonical_owner check won't.
    dapp_service::set_session_key_for_testing(&mut us, LISTING_SESSION, 9_999_999_999);
    dapp_system::set_record<ListKey>(
        ListKey {}, &mut us, weapon_key(1), weapon_fields(), weapon_values(100, 1), false, &mut ctx
    );
    // This call must abort: ctx.sender() == SESSION != OWNER (canonical_owner).
    dapp_system::take_record<ListKey, SUI>(
        ListKey {}, &mut us, b"weapon", weapon_key(1), weapon_fields(),
        500, 0, std::option::none(), &mut ctx
    );
    dapp_service::destroy_user_storage(us);
}

/// A session key must NOT be able to list fungible items either.
#[test]
#[expected_failure]
fun test_take_fungible_record_session_key_aborts() {
    // Simulate a context where the sender is the session key, not the owner.
    let mut ctx = tx_context::new_from_hint(LISTING_SESSION, 0, 0, 0, 0);
    // UserStorage belongs to LISTING_OWNER but we call from LISTING_SESSION.
    let mut us = make_us(LISTING_OWNER, &mut ctx);
    set_gold(&mut us, 100, &mut ctx);
    // This call must abort: sender == SESSION != OWNER.
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {}, &mut us, b"gold", gold_key(), b"amount",
        50, 50, 0, std::option::none(), &mut ctx
    );
    dapp_service::destroy_user_storage(us);
}

// ─── DApp pause blocks list and buy ───────────────────────────────────────────

/// Verify that `ensure_not_paused` blocks listing when the DApp is halted.
/// (This test exercises the framework-level guard used by generated `list` functions.)
#[test]
#[expected_failure]
fun test_ensure_not_paused_aborts_when_paused() {
    let mut ctx = tx_context::new_from_hint(LISTING_ADMIN, 0, 0, 0, 0);
    let dh  = dapp_system::create_dapp_hub_for_testing(&mut ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(&mut ctx);
    // Admin pauses the DApp.
    dapp_system::set_paused<ListKey>(&dh, &mut ds, true, &mut ctx);
    // ensure_not_paused must abort.
    dapp_system::ensure_not_paused<ListKey>(&ds);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

/// Verify that cancel (asset recovery) still works when the DApp is paused.
/// cancel_fungible_listing has no ensure_not_paused check — users must always
/// be able to recover their assets regardless of DApp state.
#[test]
fun test_cancel_listing_works_when_paused() {
    let mut ctx = tx_context::new_from_hint(LISTING_ADMIN, 0, 0, 0, 0);
    let dh  = dapp_system::create_dapp_hub_for_testing(&mut ctx);
    let mut ds = dapp_service::create_dapp_storage_for_testing<ListKey>(&mut ctx);
    let mut us = make_us(LISTING_ADMIN, &mut ctx);
    set_gold(&mut us, 200, &mut ctx);

    // Create a real listing BEFORE pausing (via take_fungible_record).
    dapp_system::take_fungible_record<ListKey, SUI>(
        ListKey {}, &mut us, b"gold", gold_key(), b"amount",
        100, 50, 0, std::option::none(), &mut ctx
    );
    // Manually reconstruct a Listing with the same structure so we can cancel it.
    // Use new_listing with properly BCS-encoded record_data matching what take_fungible_record built.
    let amount_bytes = sui::bcs::to_bytes(&100u64);
    let record_values = vector[amount_bytes];
    let record_data = sui::bcs::to_bytes(&record_values);
    let dapp_key_str = dapp_service::dapp_storage_dapp_key(&ds);
    let listing = dapp_service::new_listing<SUI>(
        record_data,
        b"gold",
        gold_key(),
        vector[b"amount"],
        LISTING_ADMIN,
        50,
        0,
        std::option::none(),
        dapp_key_str,
        true,
        &mut ctx,
    );

    // Pause the DApp AFTER creating the listing.
    dapp_system::set_paused<ListKey>(&dh, &mut ds, true, &mut ctx);
    assert!(dapp_service::dapp_paused(&ds), 0);

    // cancel_fungible_listing must still succeed even while paused.
    dapp_system::cancel_fungible_listing<ListKey, SUI>(
        ListKey {}, listing, &mut us, &ctx
    );
    // Gold: 200 initial - 100 taken + 100 restored = 200.
    let val = dapp_service::get_user_field<ListKey>(&us, gold_key(), b"amount");
    let amount = sui::bcs::new(val).peel_u64();
    assert!(amount == 200, 1);

    dapp_service::destroy_user_storage(us);
    dapp_service::destroy_dapp_hub(dh);
    dapp_service::destroy_dapp_storage(ds);
}

