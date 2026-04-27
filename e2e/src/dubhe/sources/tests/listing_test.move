/// Unit tests — Listing market protocol
///
/// Covers:
///   - new_listing / destroy_listing / share_listing
///   - is_listing_expired
///   - take_record / restore_record (cancel / buy listing)
///   - restore_record by non-seller aborts
///   - expire_listing (anyone can call once expired)
#[test_only]
module dubhe::listing_test;

use dubhe::dapp_service::{Self, UserStorage};
use dubhe::dapp_system;
use sui::bcs::to_bytes;

public struct ListKey has copy, drop {}

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

// ─── is_listing_expired ───────────────────────────────────────────────────────

#[test]
fun test_listing_not_expired_with_none() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let listing = dapp_service::new_listing(
        vector[],
        b"weapon",
        weapon_key(1),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::none(),
        dapp_key_str,
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

    let listing = dapp_service::new_listing(
        vector[],
        b"weapon",
        weapon_key(2),
        weapon_fields(),
        seller,
        200,
        0,
        std::option::some(1_000_000u64),
        dapp_key_str,
        &mut ctx,
    );

    assert!(!dapp_service::is_listing_expired(&listing, 999_999), 0);
    assert!(dapp_service::is_listing_expired(&listing, 1_000_000), 1);
    assert!(dapp_service::is_listing_expired(&listing, 1_000_001), 2);

    let (_, _, _, _, _, _, _, _, _) = dapp_service::destroy_listing(listing);
    dapp_service::destroy_user_storage(us);
}

// ─── take_record / restore_record (cancel listing) ────────────────────────────

#[test]
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

    dapp_system::take_record<ListKey>(
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
    let listing = dapp_service::new_listing(
        sui::bcs::to_bytes(&weapon_values(200, 2)),
        b"weapon",
        weapon_key(20),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::some(0u64),
        dapp_key_str,
        &mut ctx,
    );

    dapp_system::expire_listing<ListKey>(ListKey {}, listing, &mut us, &ctx);

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
    dapp_system::take_record<ListKey>(
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
    let listing = dapp_service::new_listing(
        sui::bcs::to_bytes(&weapon_values(800, 5)),
        b"weapon",
        weapon_key(50),
        weapon_fields(),
        seller,
        200,
        0,
        std::option::none(),
        dapp_key_str,
        &mut ctx,
    );

    // Cancel: seller restores the item.
    dapp_system::restore_record<ListKey>(ListKey {}, listing, &mut us, &ctx);

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
    let listing = dapp_service::new_listing(
        vector[],
        b"weapon",
        weapon_key(60),
        weapon_fields(),
        @0xABCD, // different seller
        100,
        0,
        std::option::none(),
        dapp_key_str,
        &mut ctx,
    );

    // ctx.sender() == @0x0 but listing.seller == @0xABCD — must abort.
    dapp_system::restore_record<ListKey>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}

#[test]
#[expected_failure]
fun test_expire_listing_not_yet_expired_aborts() {
    let mut ctx = sui::tx_context::dummy();
    let seller = ctx.sender();
    let mut us = make_us(seller, &mut ctx);
    let dapp_key_str = dapp_service::user_storage_dapp_key(&us);

    let listing = dapp_service::new_listing(
        vector[],
        b"weapon",
        weapon_key(30),
        weapon_fields(),
        seller,
        100,
        0,
        std::option::some(999_999_999_999u64),
        dapp_key_str,
        &mut ctx,
    );

    dapp_system::expire_listing<ListKey>(ListKey {}, listing, &mut us, &ctx);

    dapp_service::destroy_user_storage(us);
}
